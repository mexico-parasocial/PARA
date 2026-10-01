import {Platform, View} from 'react-native'
import Animated from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

import {useSession} from '#/state/session'
import {useShellLayout} from '#/state/shell/shell-layout'
import {HomeHeaderChatButton} from '#/view/com/home/HomeHeaderChatButton'
import {useHomeHeaderTransform} from '#/view/com/util/MainScrollProvider'
import {Logomark} from '#/view/icons/Logomark'
import {Logotype} from '#/view/icons/Logotype'
import {atoms as a, useTheme} from '#/alf'
import * as Layout from '#/components/Layout'
import {IS_IOS} from '#/env'

const HOME_HEADER_TOP_ROW_HEIGHT = 52

export function HomeHeaderLayoutMobile({
  children,
}: {
  children: React.ReactNode
  tabBarAnchor: React.ReactElement | null | undefined
}) {
  const t = useTheme()
  const {headerHeight} = useShellLayout()
  const insets = useSafeAreaInsets()
  const headerMinimalShellTransform = useHomeHeaderTransform()
  const {hasSession} = useSession()
  const topRowOffset = insets.top

  return (
    <Animated.View
      style={[
        a.fixed,
        a.z_10,
        t.atoms.bg,
        {
          top: 0,
          left: 0,
          right: 0,
        },
        !IS_IOS && headerMinimalShellTransform,
      ]}
      onLayout={e => {
        headerHeight.set(e.nativeEvent.layout.height)
      }}>
      <View
        pointerEvents="box-none"
        style={[
          a.absolute,
          {
            top: topRowOffset,
            left: 0,
            right: 0,
            zIndex: 2,
          },
          t.atoms.bg,
        ]}>
        <Layout.Header.Outer noBottomBorder>
          <Layout.Header.MenuButton />

          <View
            style={[a.flex_1, a.align_center, a.justify_center]}
            pointerEvents="none">
            <View
              style={[
                a.align_center,
                a.justify_center,
                {
                  position: 'relative',
                  width: 140,
                  height: 50,
                },
              ]}>
              {/* Geometric Motif Background (Bigger presentation per request) */}
              <View
                style={[
                  a.absolute,
                  a.align_center,
                  a.justify_center,
                  {
                    zIndex: 1,
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    ...(Platform.OS === 'web'
                      ? {
                          // @ts-ignore Web drop-shadow to trace SVG
                          filter:
                            'drop-shadow(0px 2px 5px rgba(71, 70, 82, 0.15))',
                        }
                      : {
                          shadowColor: '#474652', // Physical 3D emboss on the maze
                          shadowOpacity: 0.15,
                          shadowRadius: 5,
                          shadowOffset: {width: 0, height: 2},
                        }),
                  },
                ]}>
                <Logomark allowVariants={false} width={51} fill="#474652" />
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
                  style={{
                    ...(Platform.OS === 'web'
                      ? {
                          // @ts-ignore Web drop-shadow to trace SVG
                          filter: 'drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.2))',
                        }
                      : {
                          shadowColor: t.palette.black || '#000',
                          shadowOpacity: 0.2, // Boosted lift
                          shadowRadius: 3,
                          shadowOffset: {width: 0, height: 2},
                        }),
                  }}>
                  <Logotype
                    allowVariants={false}
                    width={106}
                    fill={t.atoms.text.color}
                  />
                </View>
              </View>
            </View>
          </View>

          {hasSession && (
            <View style={[a.flex_row, a.align_center, a.gap_xs, a.z_50]}>
              <HomeHeaderChatButton alignToEdge />
            </View>
          )}
        </Layout.Header.Outer>
      </View>

      <View
        style={{
          paddingTop: topRowOffset + HOME_HEADER_TOP_ROW_HEIGHT,
          zIndex: 1,
        }}>
        {children}
      </View>
    </Animated.View>
  )
}
