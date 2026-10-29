import {forwardRef} from 'react'

import {type NanoGlyphName} from '#/components/icons/glyphMaps'
import {withNanoGlyph} from '#/components/icons/nano'
import {type IconWithSvgMeta} from '#/components/icons/TEMPLATE'

jest.mock('#/alf', () => ({useTheme: jest.fn()}))
jest.mock('react-native-nano-icons', () => ({
  createNanoIconSet: jest.fn(() => jest.fn(() => null)),
}))

function svgIcon() {
  return Object.assign(
    forwardRef(() => null),
    {
      svgPaths: ['M0 0h24v24H0z'],
      svgViewBox: '0 0 24 24',
      svgStrokeWidth: 0,
    },
  ) as IconWithSvgMeta
}

describe('native icon glyph fallback', () => {
  it('keeps SVG artwork and metadata when the bundled font lacks a glyph', () => {
    const svg = svgIcon()
    const icon = withNanoGlyph(svg, {
      glyph: 'NotInBundledFont' as NanoGlyphName,
      layered: false,
    })

    expect(icon).toBe(svg)
    expect(icon.svgPaths).toEqual(['M0 0h24v24H0z'])
  })

  it('keeps glyphless icons on SVG', () => {
    const svg = svgIcon()
    expect(withNanoGlyph(svg, {glyph: undefined, layered: true})).toBe(svg)
  })

  it('still wraps available glyphs and preserves SVG metadata', () => {
    const svg = svgIcon()
    const icon = withNanoGlyph(svg, {
      glyph: 'HomeOpen_Filled_Corner0_Rounded',
      layered: false,
    })

    expect(icon).not.toBe(svg)
    expect(icon.svgPaths).toBe(svg.svgPaths)
    expect(icon.svgViewBox).toBe(svg.svgViewBox)
    expect(icon.svgStrokeWidth).toBe(svg.svgStrokeWidth)
  })

  it('loads the Home module and its compatibility alias with the bundled maps', () => {
    const home = require('../Home')
    const homeOpen = require('../HomeOpen')

    expect(home.Home_Filled_Corner0_Rounded).toBeDefined()
    expect(homeOpen.HomeOpen_Filled_Corner0_Rounded).toBe(
      home.HomeOpen_Filled_Corner0_Rounded,
    )
    expect(homeOpen.HomeOpen_Filled_Corner0_Rounded.svgPaths.length).toBe(1)
  })
})
