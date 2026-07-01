import { afterEach, describe, expect, it, vi } from 'vitest'
import { trackLead } from './track-event'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('trackLead', () => {
  it('is a no-op on the server (no window)', () => {
    // Default vitest env: window is undefined → trackLead returns silently.
    expect(() =>
      trackLead({ method: 'form_submit', variant: 'contact' })
    ).not.toThrow()
  })

  it('is a no-op when window exists but neither gtag nor dataLayer is loaded', () => {
    vi.stubGlobal('window', {})
    expect(() =>
      trackLead({ method: 'form_submit', variant: 'contact' })
    ).not.toThrow()
  })

  it('calls window.gtag with generate_lead + payload when GA4 is loaded', () => {
    const gtag = vi.fn()
    vi.stubGlobal('window', { gtag })
    trackLead({ method: 'form_submit', variant: 'contact' })
    expect(gtag).toHaveBeenCalledWith('event', 'generate_lead', {
      method: 'form_submit',
      form_variant: 'contact',
    })
  })

  it('pushes to window.dataLayer when GTM is loaded', () => {
    const dataLayer: unknown[] = []
    vi.stubGlobal('window', { dataLayer })
    trackLead({ method: 'mailto_fallback', variant: 'newsletter' })
    expect(dataLayer).toEqual([
      { event: 'generate_lead', method: 'mailto_fallback', form_variant: 'newsletter' },
    ])
  })

  it('pushes to both when both are loaded', () => {
    const gtag = vi.fn()
    const dataLayer: unknown[] = []
    vi.stubGlobal('window', { gtag, dataLayer })
    trackLead({ method: 'form_submit', variant: 'quote' })
    expect(gtag).toHaveBeenCalledOnce()
    expect(dataLayer).toHaveLength(1)
  })
})
