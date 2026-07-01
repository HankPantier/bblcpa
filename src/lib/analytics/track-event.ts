/**
 * Fire-and-forget analytics events from the client. Safe to call even when no
 * tag manager is loaded (e.g. consent declined, env vars unset, server render)
 * — every code path is guarded.
 *
 * Supports both wiring paths the template ships:
 *   - GA4 directly (NEXT_PUBLIC_GA4_ID set)   → `window.gtag('event', …)`
 *   - GTM (NEXT_PUBLIC_GTM_ID set)             → `window.dataLayer.push({ event: 'generate_lead', … })`
 *
 * Both can coexist; if both are loaded we push to both (the consent banner
 * gates loading, so once either is on, it's because the visitor accepted).
 */

type GlobalsWithAnalytics = {
  gtag?: (...args: unknown[]) => void
  dataLayer?: unknown[]
}

function getGlobals(): GlobalsWithAnalytics | null {
  if (typeof window === 'undefined') return null
  return window as unknown as GlobalsWithAnalytics
}

/**
 * Track a successful lead capture. `method` distinguishes a real form-submit
 * from the mailto: fallback path so the firm can see which channel actually
 * produced the lead.
 */
export function trackLead(params: {
  method: 'form_submit' | 'mailto_fallback'
  variant: string
}): void {
  const w = getGlobals()
  if (!w) return

  const payload = {
    method: params.method,
    form_variant: params.variant,
  }

  if (typeof w.gtag === 'function') {
    w.gtag('event', 'generate_lead', payload)
  }
  if (Array.isArray(w.dataLayer)) {
    w.dataLayer.push({ event: 'generate_lead', ...payload })
  }
}
