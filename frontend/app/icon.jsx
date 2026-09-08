import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

const getApiUrl = () => process.env.API_URL_INTERNAL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

async function getLogoUrl() {
  try {
    const res = await fetch(`${getApiUrl()}/company-info/current/`, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data = await res.json()
    return data.logo || null
  } catch {
    return null
  }
}

export default async function Icon() {
  const logoUrl = await getLogoUrl()

  if (logoUrl) {
    try {
      const imgRes = await fetch(logoUrl)
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        return new ImageResponse(
          (
            <div style={{ display: 'flex', width: 32, height: 32 }}>
              <img
                src={`data:image/png;base64,${base64}`}
                width="32"
                height="32"
              />
            </div>
          ),
          { ...size }
        )
      }
    } catch {
      // sigue al fallback
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: '#1a1a2e',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        🏪
      </div>
    ),
    { ...size }
  )
}
