import { priorityCheckApi, transitionFlow } from '../../services/api/flow'
import { evaluatePriorityApiMatch } from '../../services/flow/priorityApiMatch'
import { logPriorityApiStep } from '../../services/flow/apiDebugLog'
import { VALID_PAGES } from './constants'
import { pageForChecksubStatus } from './flowHelpers'

async function runPriorityChain({
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
}) {
  console.groupCollapsed(
    `%c[Priority Chain] START — ${actions.length} step(s)`,
    'color:#6366f1;font-weight:bold',
  )
  console.log('Button label:', (node.textContent || '').trim().slice(0, 80) || '(no label)')
  console.table(
    actions.map((s, idx) => ({
      priority: idx + 1,
      type: s.type,
      url: s.url || '',
      page: s.page || '',
      section: s.section || '',
    })),
  )

  let chainOutcome = 'NO_MATCH'
  try {
    for (let i = 0; i < actions.length; i++) {
      const step = actions[i]
      const tag = `Priority ${i + 1} (${step.type})`
      if (step.type === 'api') {
        const rawUrl = (step.url || '').trim()
        const isInvalidUrl = !rawUrl || rawUrl === 'https://' || rawUrl === 'http://' || rawUrl === 'https:///' || rawUrl === 'http:///'
        if (isInvalidUrl) {
          console.error(`[Priority Chain] ${tag} FAIL — API URL missing/incomplete:`, rawUrl || '(empty)')
          throw new Error(`Priority ${i + 1} Error: API URL is missing or incomplete ("${rawUrl || ''}")`)
        }

        // Check for invalid URL format
        const tempUrl = rawUrl.replace(/\{\{[^}]+\}\}/g, 'placeholder')
        if (!tempUrl.startsWith('/')) {
          try {
            const parsed = new URL(tempUrl)
            if (!parsed.hostname) {
              console.error(`[Priority Chain] ${tag} FAIL — API URL host missing:`, rawUrl)
              throw new Error(`Priority ${i + 1} Error: API URL host is missing ("${rawUrl}")`, {
                cause: new Error(String(rawUrl || 'Missing API URL host')),
              })
            }
          } catch (e) {
            if (e.message?.startsWith('Priority ')) throw e
            console.error(`[Priority Chain] ${tag} FAIL — Invalid API URL format:`, rawUrl)
            throw new Error(`Priority ${i + 1} Error: Invalid API URL format ("${rawUrl}")`, {
              cause: e,
            })
          }
        }

        // If phone is missing, we cannot check subscription status yet — proceed to Priority 2 (OTP/CONFIRM page)
        if ((rawUrl.includes('{{msisdn}}') || rawUrl.includes('{{phone}}')) && !phoneRef.current) {
          console.warn(`[Priority Chain] ${tag} SKIP — phone/msisdn not available yet → next step`)
          continue
        }

        const formattedUrl = rawUrl
          .replace(/\{\{msisdn\}\}/gi, phoneRef.current || '')
          .replace(/\{\{phone\}\}/gi, phoneRef.current || '')
          .replace(/\{\{country\}\}/gi, country || '')
          .replace(/\{\{operator\}\}/gi, operator || '')

        console.log(`[Priority Chain] ${tag} calling:`, formattedUrl)

        const navigateChainPage = async (targetPage, reason) => {
          console.log(
            `%c[Priority Chain] ${tag} PASS — ${reason} → ${targetPage}`,
            'color:#16a34a;font-weight:bold',
          )
          chainOutcome = `PASS_${targetPage}`
          saveSession({
            verificationStatus: 'verified',
            visitId: visitIdRef.current,
            phone: phoneRef.current,
            step: targetPage,
          })
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            next.set('step', targetPage)
            return next
          })
          await loadPage(targetPage, { direct: true })
        }

        const redirectExternal = (rawUrl, reason) => {
          const dest = String(rawUrl || '').trim()
          if (!dest || dest === 'https://' || dest === 'http://') {
            console.warn(`[Priority Chain] ${tag} ${reason} — external URL missing`)
            return false
          }
          const resolved = dest
            .replace(/\{\{msisdn\}\}/gi, phoneRef.current || '')
            .replace(/\{\{phone\}\}/gi, phoneRef.current || '')
            .replace(/\{\{country\}\}/gi, country || '')
            .replace(/\{\{operator\}\}/gi, operator || '')
          console.log(
            `%c[Priority Chain] ${tag} PASS — ${reason} → external ${resolved}`,
            'color:#16a34a;font-weight:bold',
          )
          chainOutcome = 'PASS_EXTERNAL'
          window.location.assign(resolved)
          return true
        }

        const goConfiguredOrContinue = async (action, page, reason, externalUrl = '') => {
          if (action === 'external') {
            return redirectExternal(externalUrl, reason)
          }
          if (action === 'page') {
            const configured = String(page || '')
              .trim()
              .toUpperCase()
            if (VALID_PAGES.includes(configured)) {
              await navigateChainPage(configured, reason)
              return true
            }
            console.warn(
              `[Priority Chain] ${tag} ${reason} — invalid page:`,
              page,
              '→ next step',
            )
          }
          return false
        }

        // Absolute http(s) URLs go through backend proxy (browser CORS blocks partner APIs).
        // Relative /api paths still use same-origin fetch.
        let resOk = false
        let json = null
        let fetchFailed = false
        let fetchError = null
        const isAbsoluteHttp =
          formattedUrl.startsWith('http://') || formattedUrl.startsWith('https://')

        try {
          if (isAbsoluteHttp) {
            const proxied = await priorityCheckApi(formattedUrl, {
              visitId: visitIdRef.current,
              campaignId: pageDataRef.current?.campaignId,
              msisdn: phoneRef.current,
              clickId: clickIdRef.current || undefined,
              rcid: rcidRef.current || undefined,
              stepIndex: i,
              pageType: pageDataRef.current?.pageType,
              rules: step.rules || undefined,
              successKey: step.successKey || undefined,
              successValue: step.successValue,
            })
            resOk = Boolean(proxied?.ok)
            json = proxied?.body ?? null
            if (!resOk) {
              fetchFailed = true
              fetchError = proxied?.error || `HTTP ${proxied?.status || 0}`
            }
          } else {
            let res = null
            try {
              res = await fetch(formattedUrl, { method: 'GET', mode: 'cors' })
            } catch (err) {
              fetchFailed = true
              fetchError = err
            }
            if (fetchFailed || !res || !res.ok) {
              fetchFailed = true
              if (!fetchError) {
                fetchError = { status: res?.status, statusText: res?.statusText }
              }
            } else {
              resOk = true
              json = await res.json().catch(() => null)
            }
          }
        } catch (err) {
          fetchFailed = true
          fetchError = err
        }

        if (fetchFailed || !resOk) {
          logPriorityApiStep({
            tag,
            url: formattedUrl,
            ok: false,
            status: fetchError?.status || null,
            body: json,
            outcome: 'FAIL network/CORS/HTTP',
            error: fetchError,
          })
          const navigated = await goConfiguredOrContinue(
            step.failAction,
            step.failPage,
            'API fail → configured destination',
            step.failUrl,
          )
          if (navigated) break
          console.warn(`[Priority Chain] ${tag} → next step`)
          continue
        }

        if (json) {
          if (json.responseCode === '500') {
            console.error(
              `[Priority Chain] ${tag} FAIL — engine error:`,
              json.responseMessage || json,
            )
            const navigated = await goConfiguredOrContinue(
              step.failAction,
              step.failPage,
              'engine error → configured destination',
              step.failUrl,
            )
            if (navigated) break
            throw new Error(
              `Priority ${i + 1} Check Failed: ${json.responseMessage || 'Engine error'}`,
            )
          }

          const matchResult = evaluatePriorityApiMatch(json, step)
          const shouldSkipSubscribe = matchResult.matched

          logPriorityApiStep({
            tag,
            url: formattedUrl,
            ok: true,
            status: 200,
            body: json,
            matchResult,
            outcome: shouldSkipSubscribe
              ? `MATCH → ${matchResult.go || 'page'} ${matchResult.page || matchResult.url || ''}`
              : 'NO_MATCH',
          })

          if (shouldSkipSubscribe) {
            if (matchResult.go === 'external') {
              if (
                redirectExternal(
                  matchResult.url,
                  `rule ${matchResult.key}=${matchResult.actual}`,
                )
              ) {
                break
              }
            } else {
              const fromRule = String(matchResult.page || '')
                .trim()
                .toUpperCase()
              const configuredMatch = String(step.matchPage || '')
                .trim()
                .toUpperCase()
              const targetPage = VALID_PAGES.includes(fromRule)
                ? fromRule
                : VALID_PAGES.includes(configuredMatch)
                  ? configuredMatch
                  : pageForChecksubStatus(matchResult.currentStatus) || 'THANKYOU'
              await navigateChainPage(
                targetPage,
                matchResult.mode === 'rules' || matchResult.mode === 'rule'
                  ? `rule ${matchResult.key}=${matchResult.actual}`
                  : `status=${matchResult.currentStatus || 'active'} (legacy)`,
              )
              break
            }
          }

          // Success rule did not match
          const missNavigated = await goConfiguredOrContinue(
            step.missAction,
            step.missPage,
            'rule fail → configured destination',
            step.missUrl,
          )
          if (missNavigated) break

          // continue → next priority step. If this is the LAST step, nowhere to go:
          // use fail destination when configured.
          const isLastStep = i === actions.length - 1
          if (isLastStep) {
            const fallbackNavigated = await goConfiguredOrContinue(
              step.failAction === 'page' || step.failAction === 'external'
                ? step.failAction
                : step.missAction,
              step.failAction === 'page' || step.failAction === 'external'
                ? step.failPage
                : step.missPage,
              'rule fail + no next step → fallback',
              step.failAction === 'external'
                ? step.failUrl
                : step.missAction === 'external'
                  ? step.missUrl
                  : '',
            )
            if (fallbackNavigated) break
            console.warn(
              `[Priority Chain] ${tag} FAIL — no match, no next step, no fallback page`,
            )
          } else {
            console.warn(`[Priority Chain] ${tag} FAIL — no match → next step`)
          }
        } else {
          console.warn(`[Priority Chain] ${tag} FAIL — empty/invalid JSON`)
          const navigated = await goConfiguredOrContinue(
            step.failAction,
            step.failPage,
            'invalid JSON → configured destination',
            step.failUrl,
          )
          if (navigated) break
          console.warn(`[Priority Chain] ${tag} → next step`)
        }
      } else if (step.type === 'page') {
        const targetPage = (step.page || '').toUpperCase()
        if (VALID_PAGES.includes(targetPage)) {
          console.log(
            `%c[Priority Chain] ${tag} PASS — navigate to ${targetPage}`,
            'color:#16a34a;font-weight:bold',
          )
          chainOutcome = `PASS_PAGE_${targetPage}`
          if (targetPage === 'THANKYOU' || targetPage === 'CONFIRM') {
            saveSession({
              verificationStatus: 'verified',
              visitId: visitIdRef.current,
              phone: phoneRef.current,
              step: targetPage,
            })
          }
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            next.set('step', targetPage)
            return next
          })
          await loadPage(targetPage, { direct: true })
          break
        }
        console.error(`[Priority Chain] ${tag} FAIL — invalid page:`, step.page)
      } else if (step.type === 'flow') {
        console.log(
          `%c[Priority Chain] ${tag} PASS — continue HE / OTP verification flow`,
          'color:#16a34a;font-weight:bold',
        )
        chainOutcome = 'PASS_FLOW'
        const fromPage = pageDataRef.current?.pageType
        const next = await transitionFlow({
          visitId: visitIdRef.current,
          country,
          operator,
          fromPage: fromPage || 'HOME',
          action: 'SUBSCRIBE',
          phone: phoneRef.current,
        })
        cachePage(next)
        break
      } else if (step.type === 'anchor') {
        const targetId = step.section
        if (targetId) {
          const targetEl = shadow.getElementById(targetId)
          if (targetEl) {
            console.log(
              `%c[Priority Chain] ${tag} PASS — scroll to #${targetId}`,
              'color:#16a34a;font-weight:bold',
            )
            chainOutcome = `PASS_ANCHOR_${targetId}`
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
          } else {
            console.warn(`[Priority Chain] ${tag} FAIL — section #${targetId} not found`)
          }
        } else {
          console.warn(`[Priority Chain] ${tag} FAIL — no section id`)
        }
      } else if (step.type === 'external') {
        if (step.url) {
          console.log(
            `%c[Priority Chain] ${tag} PASS — redirect to ${step.url}`,
            'color:#16a34a;font-weight:bold',
          )
          chainOutcome = 'PASS_EXTERNAL'
          window.open(step.url, node.getAttribute('target') || '_self')
        } else {
          console.error(`[Priority Chain] ${tag} FAIL — external URL missing`)
        }
        break
      } else {
        console.warn(`[Priority Chain] ${tag} SKIP — unknown type:`, step.type)
      }
    }
    if (chainOutcome === 'NO_MATCH') {
      console.warn('[Priority Chain] END — no step completed navigation (all API checks failed / skipped)')
    } else {
      console.log(
        `%c[Priority Chain] END — ${chainOutcome}`,
        'color:#16a34a;font-weight:bold',
      )
    }
  } catch (err) {
    console.error('%c[Priority Chain] FAIL — chain aborted', 'color:#dc2626;font-weight:bold', err)
    setError(err.message || 'Action chain execution failed')
  } finally {
    console.groupEnd()
  }
}

export { runPriorityChain }
