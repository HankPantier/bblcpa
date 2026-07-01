import { ImageResponse } from 'next/og'
import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { loadMarkDataUrl } from '@/lib/brand/load-mark-data-url'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

/**
 * Apple touch icon — larger sibling of `src/app/icon.tsx`. Uses
 * `brand.logo.mark` when present, otherwise the initials tile fallback. iOS
 * home-screen + Apple share UI use this.
 */
export default async function AppleIcon() {
  const brand = await getBrandConfig()
  const markDataUrl = await loadMarkDataUrl(brand.logo.mark)

  const initials = brand.firm.name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: brand.palette.primary,
          fontFamily: 'sans-serif',
        }}
      >
        {markDataUrl ? (
          <img
            src={markDataUrl}
            alt=""
            width={size.width - 32}
            height={size.height - 32}
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <span
            style={{
              color: brand.palette.nearWhite,
              fontSize: initials.length > 1 ? 96 : 120,
              fontWeight: 700,
              letterSpacing: -3,
            }}
          >
            {initials || '·'}
          </span>
        )}
      </div>
    ),
    { ...size }
  )
}
