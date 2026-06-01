import {type ReactElement, type ReactNode} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {HITSLOP_10} from '#/lib/constants'
import {useCinzelFont} from '#/lib/hooks/useCinzelFont'
import {useSession} from '#/state/session'
import {useShellLayout} from '#/state/shell/shell-layout'
import {HomeHeaderLayoutMobile} from '#/view/com/home/HomeHeaderLayoutMobile'
import {Logomark} from '#/view/icons/Logomark'
import {Logotype} from '#/view/icons/Logotype'
import {atoms as a, useBreakpoints, useGutters, useTheme} from '#/alf'
import {ButtonIcon} from '#/components/Button'
import {Compass_Stroke2_Corner0_Rounded as CompassIcon} from '#/components/icons/Compass'
import {Hashtag_Stroke2_Corner0_Rounded as FeedsIcon} from '#/components/icons/Hashtag'
import * as Layout from '#/components/Layout'
import {Link} from '#/components/Link'
import {useAnalytics} from '#/analytics'

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
  const {_} = useLingui()
  const ax = useAnalytics()
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
                <Logomark width={69} fill="#474652" />
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
                  <Logotype width={106} fill={t.atoms.text.color} />
                </View>
              </View>
            </View>
            <Link
              to="/feeds"
              hitSlop={HITSLOP_10}
              label={_(msg`View your feeds and explore more`)}
              size="small"
              variant="ghost"
              color="secondary"
              shape="square"
              onPress={() => {
                ax.metric('nav:click', {item: 'feeds', surface: 'topBar'})
              }}
              style={[a.justify_center]}>
              <ButtonIcon icon={FeedsIcon} size="lg" />
            </Link>
            <Link
              to="/compass"
              hitSlop={HITSLOP_10}
              label={_(msg`Open compass`)}
              size="small"
              variant="ghost"
              color="secondary"
              shape="square"
              style={[a.justify_center]}>
              <ButtonIcon icon={CompassIcon} size="lg" />
            </Link>
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
