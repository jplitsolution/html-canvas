import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchFlowPage, prefetchFlowPage, transitionFlow } from '../services/api/flow'
import { resolvePhoneFromUrl, resolvePhoneNumber } from '../services/flow/resolvePhoneNumber'

const FLOW_FONT =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'

const VALID_PACKS = ['daily', 'weekly', 'monthly']

const FLOW_SHADOW_STYLES = `
  :host { display: block; width: 100%; min-height: 100vh; }
  .flow-page-inner {
    animation: flowPageIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes flowPageIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .flow-pack-option.flow-pack-selected {
    border-color: #7c4dff !important;
    background: #f5f3ff !important;
    box-shadow: 0 0 0 1px #7c4dff;
  }
  @media (prefers-reduced-motion: reduce) {
    .flow-page-inner { animation: none; }
  }
`

const PRELOAD_BY_PAGE = {
  HOME: ['CONFIRM', 'THANKYOU', 'ERROR', 'BLOCKED'],
  CONFIRM: ['THANKYOU', 'ERROR', 'BLOCKED'],
}

function normalizePack(value) {
  const pack = (value || 'daily').toLowerCase()
  return VALID_PACKS.includes(pack) ? pack : 'daily'
}

function findActionTarget(event) {
  const path = event.composedPath?.() || []
  for (const node of path) {
    if (!(node instanceof HTMLElement)) continue
    if (node.closest('[data-pack]')) continue
    if (!node.matches('[data-action], button, a')) continue
    const action =
      node.getAttribute('data-action') ||
      (node.textContent?.toLowerCase().includes('confirm') ? 'CONFIRM' : null) ||
      (node.textContent?.toLowerCase().includes('subscribe') ? 'SUBSCRIBE' : null)
    if (action) return { node, action }
  }
  return null
}

function mountPageInShadow(shadow, pageData) {
  shadow.innerHTML = `
    <style>${FLOW_SHADOW_STYLES}</style>
    <style>${pageData.css || ''}</style>
    <div class="flow-page-inner">${pageData.html}</div>
  `
}

function syncPackPicker(shadow, selectedPack) {
  shadow.querySelectorAll('[data-pack]').forEach((el) => {
    const isSelected = el.getAttribute('data-pack') === selectedPack
    el.classList.toggle('flow-pack-selected', isSelected)
  })
}

function getSelectedPackFromShadow(shadow) {
  const selected = shadow.querySelector('[data-pack].flow-pack-selected')
  return normalizePack(selected?.getAttribute('data-pack'))
}

function SubscriptionPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const country = searchParams.get('country') || ''
  const operator = searchParams.get('operator') || ''

  const [phone, setPhone] = useState('')
  const [phoneResolving, setPhoneResolving] = useState(true)
  const [booting, setBooting] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [error, setError] = useState('')
  const [pageData, setPageData] = useState(null)

  const hostRef = useRef(null)
  const visitIdRef = useRef(null)
  const pageCacheRef = useRef(new Map())
  const prefetchingRef = useRef(new Set())
  const transitionLockRef = useRef(false)
  const pageDataRef = useRef(null)
  const selectedPackRef = useRef('daily')
  const phoneRef = useRef('')

  const queryKey = useMemo(
    () => `${country}|${operator}|${phone}`,
    [country, operator, phone],
  )

  phoneRef.current = phone

  useEffect(() => {
    if (!country || !operator) {
      setPhoneResolving(false)
      return undefined
    }

    let cancelled = false
    setPhoneResolving(true)

    resolvePhoneNumber(new URLSearchParams(window.location.search)).then(({ phone: resolved }) => {
      if (cancelled) return
      phoneRef.current = resolved
      setPhone(resolved)
      setPhoneResolving(false)

      const currentParams = new URLSearchParams(window.location.search)
      if (resolved && !resolvePhoneFromUrl(currentParams)) {
        currentParams.set('msisdn', resolved)
        setSearchParams(currentParams, { replace: true })
      }
    })

    return () => {
      cancelled = true
    }
  }, [country, operator, setSearchParams])

  const cachePage = useCallback((data) => {
    if (!data?.pageType) return
    pageCacheRef.current.set(data.pageType, data)
    if (data.visitId) visitIdRef.current = data.visitId
    pageDataRef.current = data
    setPageData(data)
  }, [])

  const prefetchPages = useCallback(
    async (pages, visitId) => {
      if (!country || !operator || !visitId) return
      await Promise.all(
        pages.map(async (page) => {
          if (pageCacheRef.current.has(page) || prefetchingRef.current.has(page)) return
          prefetchingRef.current.add(page)
          const data = await prefetchFlowPage({
            country,
            operator,
            page,
            msisdn: phoneRef.current,
            visitId,
          })
          prefetchingRef.current.delete(page)
          if (data) pageCacheRef.current.set(data.pageType, data)
        }),
      )
    },
    [country, operator],
  )

  const loadPage = useCallback(
    async (page = 'HOME') => {
      if (!country || !operator) {
        setError('Missing country or operator in URL')
        setBooting(false)
        return
      }
      setError('')
      try {
        const data = await fetchFlowPage({
          country,
          operator,
          page,
          msisdn: phoneRef.current,
          visitId: visitIdRef.current,
        })
        cachePage(data)
      } catch (err) {
        setError(err.message || 'Failed to load page')
      } finally {
        setBooting(false)
      }
    },
    [country, operator, cachePage],
  )

  useEffect(() => {
    const existing = document.querySelector('link[data-flow-font]')
    if (!existing) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = FLOW_FONT
      link.dataset.flowFont = 'true'
      document.head.appendChild(link)
    }
  }, [])

  useEffect(() => {
    if (phoneResolving) return
    selectedPackRef.current = 'daily'
    pageCacheRef.current.clear()
    prefetchingRef.current.clear()
    visitIdRef.current = null
    pageDataRef.current = null
    setPageData(null)
    setBooting(true)
    loadPage('HOME')
  }, [queryKey, loadPage, phoneResolving])

  useEffect(() => {
    if (!pageData?.pageType || !visitIdRef.current) return
    const nextPages = PRELOAD_BY_PAGE[pageData.pageType] || []
    if (nextPages.length) prefetchPages(nextPages, visitIdRef.current)
  }, [pageData?.pageType, prefetchPages])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !pageData?.html) return undefined

    let shadow = host.shadowRoot
    if (!shadow) shadow = host.attachShadow({ mode: 'open' })
    mountPageInShadow(shadow, pageData)

    if (pageData.pageType === 'CONFIRM') {
      syncPackPicker(shadow, selectedPackRef.current)
    }

    const handlePackClick = (event) => {
      if (pageDataRef.current?.pageType !== 'CONFIRM') return
      const packBtn = event.composedPath?.().find(
        (node) => node instanceof HTMLElement && node.hasAttribute('data-pack'),
      )
      if (!packBtn || transitionLockRef.current) return
      event.preventDefault()
      event.stopPropagation()
      const nextPack = normalizePack(packBtn.getAttribute('data-pack'))
      selectedPackRef.current = nextPack
      syncPackPicker(shadow, nextPack)
    }

    const handleClick = async (event) => {
      const hit = findActionTarget(event)
      if (!hit || !visitIdRef.current || transitionLockRef.current) return

      const { action } = hit
      event.preventDefault()

      const currentPage = pageDataRef.current
      const fromPage = currentPage?.pageType
      if (
        (fromPage === 'HOME' && action !== 'SUBSCRIBE') ||
        (fromPage === 'CONFIRM' && action !== 'CONFIRM')
      ) {
        return
      }

      transitionLockRef.current = true
      setTransitioning(true)
      setError('')

      // Avoid optimistic page swaps here.
      // Backend may decide OTP is required even when CONFIRM is prefetched, which causes
      // a brief CONFIRM->OTP flash. Better UX: keep current page + show progress until response.

      const planId = fromPage === 'CONFIRM' ? getSelectedPackFromShadow(shadow) : undefined

      try {
        const next = await transitionFlow({
          visitId: visitIdRef.current,
          country,
          operator,
          fromPage,
          action,
          phone: phoneRef.current,
          ...(planId ? { planId } : {}),
        })
        cachePage(next)
        if (next.pageType === 'CONFIRM') {
          selectedPackRef.current = 'daily'
        }
      } catch (err) {
        setError(err.message || 'Action failed')
      } finally {
        setTransitioning(false)
        transitionLockRef.current = false
      }
    }

    shadow.addEventListener('click', handlePackClick)
    shadow.addEventListener('click', handleClick)
    return () => {
      shadow.removeEventListener('click', handlePackClick)
      shadow.removeEventListener('click', handleClick)
    }
  }, [pageData, country, operator, cachePage])

  if (!country || !operator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base p-6">
        <div className="text-center max-w-md">
          <h1 className="text-lg font-semibold text-fg mb-2">Invalid subscription URL</h1>
          <p className="text-sm text-fg-muted">
            Use: /subscription?country=India&amp;operator=Zain
          </p>
          <p className="text-xs text-fg-subtle mt-2">
            Phone and pack are handled on the subscription pages automatically.
          </p>
        </div>
      </div>
    )
  }

  if (phoneResolving || (booting && !pageData)) {
    return (
      <div className="flow-runtime-root min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#7C4DFF]/30 border-t-[#7C4DFF] animate-spin" />
          <p className="text-slate-500 text-sm">
            {phoneResolving ? 'Detecting mobile number...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (error && !pageData) {
    return (
      <div className="flow-runtime-root min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Unable to load</h1>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flow-runtime-root relative min-h-screen w-full">
      {transitioning && <div className="flow-runtime-progress" aria-hidden="true" />}
      {error && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-red-100 text-red-700 text-sm text-center py-2 px-4 animate-fade-in">
          {error}
        </div>
      )}
      <div ref={hostRef} className="flow-runtime-host is-visible" />
    </div>
  )
}

export default memo(SubscriptionPage)
