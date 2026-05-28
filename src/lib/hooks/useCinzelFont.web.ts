import {useEffect} from 'react'

// @ts-ignore static asset resolved by the web bundler
const cinzelAsset = require('../../../assets/fonts/Cinzel/static/Cinzel-SemiBold.ttf')

const FONT_STYLE_ID = 'para-cinzel-font'

function getCinzelAssetUrl() {
  const asset = cinzelAsset as
    | string
    | {
        default?: string
        uri?: string
      }

  if (typeof asset === 'string') return asset
  if (typeof asset.default === 'string') return asset.default
  if (typeof asset.uri === 'string') return asset.uri
  return ''
}

export const CINZEL_FONT_FAMILY = 'Cinzel'

export function useCinzelFont() {
  useEffect(() => {
    const fontUrl = getCinzelAssetUrl()
    if (!fontUrl || document.getElementById(FONT_STYLE_ID)) return

    const style = document.createElement('style')
    style.id = FONT_STYLE_ID
    style.textContent = `
      @font-face {
        font-family: '${CINZEL_FONT_FAMILY}';
        src: url(${JSON.stringify(fontUrl)}) format('truetype');
        font-weight: 600;
        font-style: normal;
        font-display: swap;
      }
    `

    document.head.appendChild(style)
  }, [])
}
