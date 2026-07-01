import { ImageResponse } from 'next/og'
import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { loadMarkDataUrl } from '@/lib/brand/load-mark-data-url'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

/**
 * Programmatic favicon. When `brand.logo.mark` resolves to a file in
 * `public/content-assets/`, render that mark on the brand-primary background;
 * otherwise fall back to an initials tile. Either way, no static favicon is
 * shipped and no per-client setup is needed.
 */
export default async function Icon() {
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
            width={size.width - 6}
            height={size.height - 6}
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <span
            style={{
              color: brand.palette.nearWhite,
              fontSize: initials.length > 1 ? 18 : 22,
              fontWeight: 700,
              letterSpacing: -1,
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
