import {type ReactElement, type ReactNode} from 'react'
import {View} from 'react-native'

import {useCinzelFont} from '#/lib/hooks/useCinzelFont'
import {useSession} from '#/state/session'
import {useShellLayout} from '#/state/shell/shell-layout'
import {HomeHeaderChatButton} from '#/view/com/home/HomeHeaderChatButton'
import {HomeHeaderLayoutMobile} from '#/view/com/home/HomeHeaderLayoutMobile'
import {Logomark} from '#/view/icons/Logomark'
import {Logotype} from '#/view/icons/Logotype'
import {atoms as a, useBreakpoints, useGutters, useTheme} from '#/alf'
import * as Layout from '#/components/Layout'

export function HomeHeaderLayout(props: {
  children: ReactNode
  tabBarAnchor: ReactElement | null | undefined
}) {
  const {gtMobile} = useBreakpoints()
  if (!gtMobile) {
    return <HomeHeaderLayoutMobile {...props} />
  } else {
    return <HomeHeaderLayoutDesktopAndTablet {...props} />
  }
}

function HomeHeaderLayoutDesktopAndTablet({
  children,
  tabBarAnchor,
}: {
  children: ReactNode
  tabBarAnchor: ReactElement | null | undefined
}) {
  useCinzelFont()
  const t = useTheme()
  const {headerHeight} = useShellLayout()
  const {hasSession} = useSession()
  const gutters = useGutters([0, 'base'])

  return (
    <>
      {hasSession && (
        <Layout.Center>
          <View
            style={[a.flex_row, a.align_center, gutters, a.pt_md, t.atoms.bg]}>
            <View style={{width: 34}} />
            <View
              style={[
                a.relative,
                a.flex_1,
                a.align_center,
                a.justify_center,
                {
                  height: 52,
                  zIndex: 1,
                },
              ]}>
              <View
                style={[
                  a.absolute,
                  a.align_center,
                  a.justify_center,
                  {
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1,
                    // @ts-ignore Web-only drop shadow to correctly trace SVG paths
                    filter: 'drop-shadow(0px 2px 5px rgba(0, 0, 0, 0.05))',
                  },
                ]}>
                <Logomark allowVariants={false} width={69} fill="#474652" />
              </View>

              {/* Ultra-Tight Text-Adjusted Diamond (Rombo) */}
              <View
                style={[
                  a.align_center,
                  a.justify_center,
                  {
                    zIndex: 2,
                    // No artificial widths. The wrapper natively hugs the 106px Logotype.
                    paddingHorizontal: 6,
                    paddingVertical: 4,
                  },
                ]}>
                {/* Rhombus Geometry Wrapper (stretching strictly to text width) */}
                <View
                  style={[
                    a.absolute,
                    a.align_center,
                    a.justify_center,
                    {
                      top: 0,
                      bottom: 0,
                      left: 0,
                      right: 0,
                      // Squashed vertically to forcefully widen the angle aperture at the North/South corners, minimizing its vertical footprint
                      transform: [{scaleX: 3.15}, {scaleY: 0.65}],
                    },
                  ]}>
                  <View
                    style={[
                      t.atoms.bg, // Natively adapts to light (white tint) and dark modes
                      {
                        width: 24,
                        height: 24,
                        opacity: 0.9, // Classic frosted glass transparency
                        transform: [{rotate: '45deg'}],
                        // Zero border radius to mathematically match the sharp maze geometry
                      },
                    ]}
                  />
                </View>
                <View
                  pointerEvents="none"
                  style={{
                    // @ts-ignore Web-only property
                    userSelect: 'none',
                    // @ts-ignore Web-only drop shadow to correctly trace SVG paths
                    filter: 'drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.2))',
                  }}>
                  <Logotype
                    allowVariants={false}
                    width={106}
                    fill={t.atoms.text.color}
                  />
                </View>
              </View>
            </View>
            <HomeHeaderChatButton />
          </View>
        </Layout.Center>
      )}
      {tabBarAnchor}
      <Layout.Center
        style={[a.sticky, a.z_10, a.align_center, t.atoms.bg, {top: 0}]}
        onLayout={e => {
          headerHeight.set(e.nativeEvent.layout.height)
        }}>
        {children}
      </Layout.Center>
    </>
  )
}
