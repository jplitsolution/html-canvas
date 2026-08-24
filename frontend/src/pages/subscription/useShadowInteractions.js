import { useEffect, useState } from 'react'
import { transitionFlow } from '../../services/api/flow'
import { trackEvent } from '../../utils/analytics'
import { parseSubscribeRoutes, resolveSubscribeDestination } from '../../editor/utils/subscribeRoutes'
import { VALID_PAGES } from './constants'
import {
  findActionTarget,
  hrefIsNavigationTarget,
  isCampaignPageHref,
  normalizePack,
  packSubscribeExtras,
  shouldSelectPackOnly,
} from './flowHelpers'
import { runPriorityChain } from './runPriorityChain'
import { isDcbFlowContext, setupDcbBindings } from './setupDcbBindings'
import { setupOtpBindings } from './setupOtpBindings'
import { getSelectedPackFromShadow, mountPageInShadow, syncPackPicker, syncPhoneDisplay } from './shadowDom'
import { pickLivePageData } from '../../editor/services/deviceLayouts'

/**
 * Shadow DOM click routing (Layer C + bridge to Layer B).
 *
 * - data-action=SUBSCRIBE|CONFIRM → POST /transition (backend flow-engine / mode)
 * - data-action=SUBSCRIBE_ROUTE → partner subscribe + button destinations
 * - href=HOME|OTP|CONFIRM|… → loadPage(direct) — bypasses flow graph
 * - href=https://… → normal navigation
 * - data-actions (CHAIN) → runPriorityChain — canvas-owned status routing
 *
 * See docs/FLOW-ARCHITECTURE.md §0.1.
 */
function useShadowInteractions({
  hostRef,
  pageData,
  country,
  operator,
  campid,
  trackingCampid,
  cachePage,
  loadPage,
  setSearchParams,
  warnIfHeUnresolved,
  saveSession,
  setPhone,
  setTransitioning,
  setError,
  pageDataRef,
  selectedPackRef,
  phoneRef,
  visitIdRef,
  clickIdRef,
  rcidRef,
  campidRef,
  trackingCampidRef,
  vidRef,
  affIdRef,
  pageCacheRef,
  transitionLockRef,
}) {
  const [mobileViewport, setMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mql = window.matchMedia('(max-width: 767px)')
    const onChange = () => setMobileViewport(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !pageData) return undefined
    const resolved = pickLivePageData(pageData, mobileViewport) || pageData
    if (!resolved.html) return undefined

    let shadow = host.shadowRoot
    if (!shadow) shadow = host.attachShadow({ mode: 'open' })
    const mountKey = [
      resolved.html,
      resolved.css,
      resolved.projectData?.customWidth || '',
      resolved.projectData?.customHeight || '',
    ].join('\0')
    if (shadow._tcMountKey !== mountKey) {
      shadow._tcMountKey = mountKey
      mountPageInShadow(shadow, pageData, { mobile: mobileViewport })
    }

    if (pageData.pageType === 'CONFIRM' || shadow.querySelector('[data-pack]')) {
      syncPackPicker(shadow, selectedPackRef.current)
      if (pageData.pageType === 'CONFIRM') {
        syncPhoneDisplay(shadow, phoneRef.current)
      }
    }

    const handlePackClick = (event) => {
      const packBtn = event
        .composedPath?.()
        .find((node) => node instanceof HTMLElement && node.hasAttribute('data-pack'))
      if (!packBtn || transitionLockRef.current) return
      // Pack + subscribe action → let handleClick fire subscribe, not just select.
      // Pack + Open a website / page jump → let handleClick (or the browser) navigate.
      if (!shouldSelectPackOnly(packBtn)) return
      event.preventDefault()
      event.stopPropagation()
      const nextPack = normalizePack(packBtn.getAttribute('data-pack'))
      selectedPackRef.current = nextPack
      syncPackPicker(shadow, nextPack)
    }

    const handleAnchorClick = (event) => {
      const path = event.composedPath?.() || []
      const anchor = path.find((node) => node instanceof HTMLAnchorElement)
      if (!anchor) return
      // Flow hotspots use href="#" + data-action — let handleClick own those.
      if (anchor.getAttribute('data-action') || anchor.hasAttribute('data-actions')) return

      const href = (anchor.getAttribute('href') || '').trim()
      if (!href) return

      // Page tokens like href="CONFIRM" must load that campaign page directly.
      // Without direct=1 the flow guard rewrites CONFIRM→HOME when MSISDN is missing,
      // which flashes ?step=CONFIRM then bounces back to HOME.
      if (isCampaignPageHref(href)) {
        event.preventDefault()
        event.stopPropagation()
        if (transitionLockRef.current) return
        const onHome = String(pageDataRef.current?.pageType || '').toUpperCase() === 'HOME'
        if (onHome && warnIfHeUnresolved()) return
        const targetPage = href.toUpperCase()
        if (String(pageDataRef.current?.pageType || '').toUpperCase() === targetPage) return

        transitionLockRef.current = true
        setTransitioning(true)
        setError('')
        loadPage(targetPage, { direct: true }).finally(() => {
          setTransitioning(false)
          transitionLockRef.current = false
        })
        return
      }

      if (!href.startsWith('#') || href === '#') return

      event.preventDefault()
      const targetId = decodeURIComponent(href.slice(1))
      const targetEl = shadow.getElementById(targetId)
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    const handleClick = async (event) => {
      const hit = findActionTarget(event)
      if (!hit) return

      const { action, node } = hit
      const onHome = String(pageDataRef.current?.pageType || '').toUpperCase() === 'HOME'

      // Stop href="#" from reloading the current page (editor preview uses ?step=HOME).
      event.preventDefault()
      if (transitionLockRef.current) return
      const hrefEarly = (node.getAttribute('href') || '').trim()
      const navOnly = !action && hrefIsNavigationTarget(hrefEarly)
      if (!visitIdRef.current && !navOnly) {
        setError('Please wait a moment and try again.')
        return
      }

      // Token/Custom HE: HOME CTA without MSISDN → warning (then CG if configured).
      // Skip for SUBSCRIBE_ROUTE — missing phone is a first-class outcome (usually → OTP).
      // Skip for reconfigured CTAs that only navigate (no flow action).
      if (action && action !== 'SUBSCRIBE_ROUTE' && onHome && warnIfHeUnresolved()) {
        return
      }

      // Handle Sequential Action Chain (Priority Flow)
      if (action === 'CHAIN' || node.hasAttribute('data-actions')) {
        let actions = []
        try {
          actions = JSON.parse(node.getAttribute('data-actions') || '[]')
        } catch (e) {
          console.error('[Priority Chain] FAIL — Invalid data-actions JSON:', e)
        }

        if (actions.length > 0) {
          transitionLockRef.current = true
          setTransitioning(true)
          setError('')

          try {
            await runPriorityChain({
              actions,
              node,
              shadow,
              country,
              operator,
              phoneRef,
              visitIdRef,
              clickIdRef,
              rcidRef,
              pageDataRef,
              saveSession,
              setSearchParams,
              loadPage,
              cachePage,
              setError,
            })
          } finally {
            setTransitioning(false)
            transitionLockRef.current = false
          }
          return
        }
      }

      // Reconfigured Subscribe/Confirm (or freeform CTA): page / URL / anchor via href
      if (!node.getAttribute('data-action') && !node.hasAttribute('data-actions')) {
        const href = (node.getAttribute('href') || '').trim()

        if (isCampaignPageHref(href)) {
          const targetPage = href.toUpperCase()
          if (String(pageDataRef.current?.pageType || '').toUpperCase() === targetPage) return
          if (onHome && warnIfHeUnresolved()) return
          transitionLockRef.current = true
          setTransitioning(true)
          setError('')
          try {
            await loadPage(targetPage, { direct: true })
          } finally {
            setTransitioning(false)
            transitionLockRef.current = false
          }
          return
        }

        if (href.startsWith('#') && href !== '#') {
          const targetId = decodeURIComponent(href.slice(1))
          const targetEl = shadow.getElementById(targetId)
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          return
        }

        // External URL on <button> (anchors navigate natively)
        if (/^(https?:|mailto:|tel:)/i.test(href)) {
          const target = node.getAttribute('target') || '_self'
          if (target === '_blank') {
            window.open(href, '_blank', 'noopener,noreferrer')
          } else {
            window.location.assign(href)
          }
          return
        }

        // <a> with external href — let the browser handle it
        if (node.matches?.('a[href]') && href && href !== '#' && !href.startsWith('#')) {
          window.location.assign(href)
          return
        }

        // No actionable href and no flow action
        if (!action) return
      }

      const currentPage = pageDataRef.current
      const fromPage = currentPage?.pageType

      // Single-page subscribe: hit campaign Subscribe API, then button destinations
      if (action === 'SUBSCRIBE_ROUTE') {
        transitionLockRef.current = true
        setTransitioning(true)
        setError('')
        const planId =
          (node.hasAttribute('data-pack') ? normalizePack(node.getAttribute('data-pack')) : '') ||
          getSelectedPackFromShadow(shadow) ||
          selectedPackRef.current ||
          'daily'
        const routes = parseSubscribeRoutes({
          'data-subscribe-routes': node.getAttribute('data-subscribe-routes'),
        })
        try {
          const next = await transitionFlow({
            visitId: visitIdRef.current,
            country,
            operator,
            campid: campid || campidRef.current || undefined,
            trackingCampid: trackingCampid || trackingCampidRef.current || undefined,
            fromPage: fromPage || 'HOME',
            action: 'SUBSCRIBE_ROUTE',
            phone: phoneRef.current,
            planId,
            clickId: clickIdRef.current || undefined,
            rcid: rcidRef.current || undefined,
            vid: vidRef.current || undefined,
            affId: affIdRef.current || undefined,
            subscribeRoutes: routes,
            ...packSubscribeExtras(node),
          })

          if (next.externalRedirect && /^https?:\/\//i.test(next.externalRedirect)) {
            window.location.assign(next.externalRedirect)
            return
          }

          const dest = resolveSubscribeDestination(routes, next)

          if (dest?.go === 'external') {
            const url = String(dest.url || '').trim()
            if (url && /^https?:\/\//i.test(url)) {
              window.location.assign(url)
              return
            }
          }

          const targetPage = String(dest?.page || next.pageType || 'THANKYOU')
            .trim()
            .toUpperCase()
          if (VALID_PAGES.includes(targetPage)) {
            if (
              next.routeOutcome === 'SUCCESS' ||
              next.routeOutcome === 'RULE_MATCH' ||
              next.routeOutcome === 'ALREADY_SUBSCRIBED'
            ) {
              trackEvent('confirm_completed')
            }
            await loadPage(targetPage, { direct: true })
            return
          }

          cachePage(next)
        } catch (err) {
          setError(err.message || 'Subscribe failed')
        } finally {
          setTransitioning(false)
          transitionLockRef.current = false
        }
        return
      }

      if (fromPage === 'OTP') {
        return
      }
      if (action !== 'SUBSCRIBE' && action !== 'CONFIRM') {
        return
      }

      transitionLockRef.current = true
      setTransitioning(true)
      setError('')

      const packOnButton = node.hasAttribute('data-pack') ? normalizePack(node.getAttribute('data-pack')) : ''
      const planId = packOnButton || (fromPage === 'CONFIRM' ? getSelectedPackFromShadow(shadow) : undefined)

      try {
        const next = await transitionFlow({
          visitId: visitIdRef.current,
          country,
          operator,
          campid: campid || campidRef.current || undefined,
          trackingCampid: trackingCampid || trackingCampidRef.current || undefined,
          fromPage,
          action,
          phone: phoneRef.current,
          clickId: clickIdRef.current || undefined,
          rcid: rcidRef.current || undefined,
          vid: vidRef.current || undefined,
          affId: affIdRef.current || undefined,
          ...(planId ? { planId } : {}),
          ...packSubscribeExtras(node),
        })
        if (next.externalRedirect && /^https?:\/\//i.test(next.externalRedirect)) {
          window.location.assign(next.externalRedirect)
          return
        }
        cachePage(next)
        if (next.pageType === 'CONFIRM') {
          selectedPackRef.current = 'daily'
        }
        if (fromPage === 'CONFIRM' && action === 'CONFIRM' && next.pageType === 'THANKYOU') {
          trackEvent('confirm_completed')
        }
      } catch (err) {
        setError(err.message || 'Action failed')
      } finally {
        setTransitioning(false)
        transitionLockRef.current = false
      }
    }

    let flowCleanup = null
    if (isDcbFlowContext(pageData)) {
      flowCleanup = setupDcbBindings(shadow, {
        pageData,
        cachePage,
        loadPage,
        country,
        operator,
        campid,
        trackingCampid,
        visitIdRef,
        phoneRef,
        selectedPackRef,
        setPhone,
        setTransitioning,
        setError,
        saveSession,
        transitionLockRef,
      })
    } else if (pageData.pageType === 'OTP') {
      flowCleanup = setupOtpBindings(shadow, {
        transitionFlow,
        cachePage,
        loadPage,
        country,
        operator,
        campid,
        trackingCampid,
        visitIdRef,
        phoneRef,
        packRef: selectedPackRef,
        setPhone,
        setTransitioning,
        setError,
        pageCacheRef,
        transitionLockRef,
      })
    }

    shadow.addEventListener('click', handlePackClick)
    shadow.addEventListener('click', handleClick)
    shadow.addEventListener('click', handleAnchorClick)
    return () => {
      shadow.removeEventListener('click', handlePackClick)
      shadow.removeEventListener('click', handleClick)
      shadow.removeEventListener('click', handleAnchorClick)
      if (flowCleanup) flowCleanup()
    }
  }, [pageData, mobileViewport, country, operator, campid, trackingCampid, cachePage, loadPage, setSearchParams, warnIfHeUnresolved])
}

export { useShadowInteractions }
