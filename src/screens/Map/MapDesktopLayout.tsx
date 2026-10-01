import {type ReactNode} from 'react'
import {TouchableOpacity, View} from 'react-native'
import Animated, {FadeInRight, SlideInLeft} from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {useIsFocused} from '@react-navigation/native'

import {useSession} from '#/state/session'
import {LEFT_NAV_MINIMAL_WIDTH} from '#/view/shell/desktop/LeftNav'
import {SplitViewProvider} from '#/screens/Messages/components/splitView/context'
import {
  atoms as a,
  useBreakpoints,
  useLayoutBreakpoints,
  useTheme,
  web,
} from '#/alf'
import {LockScroll} from '#/components/LockScroll'
import {Text} from '#/components/Typography'

const SIDEBAR_WIDTH = 380
const SIDEBAR_COMPACT_WIDTH = 328
const DESKTOP_LEFT_RAIL_WIDTH = 86

/**
 * Split-pane layout for the Map screen. Desktop mirrors the Messages split
 * view: fixed left panel, bordered right panel, and locked document scroll.
 * Narrow web widths keep the map-first drawer.
 */
export function MapSplitPaneLayout({
  sidebar,
  map,
  drawerOpen = false,
  onDrawerOpenChange,
}: {
  sidebar: ReactNode
  map: ReactNode
  /** Narrow-layout drawer state; the toggle lives in the screen's top bar. */
  drawerOpen?: boolean
  onDrawerOpenChange?: (open: boolean) => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const {rightNavVisible, centerColumnOffset} = useLayoutBreakpoints()
  const setDrawerOpen = (open: boolean) => onDrawerOpenChange?.(open)
  const isFocused = useIsFocused()
  const {hasSession} = useSession()
  const {gtMobile} = useBreakpoints()

  if (rightNavVisible) {
    const sidebarWidth = centerColumnOffset
      ? SIDEBAR_COMPACT_WIDTH
      : SIDEBAR_WIDTH
    const leftOffset = hasSession ? DESKTOP_LEFT_RAIL_WIDTH : 0

    return (
      <Animated.View
        entering={FadeInRight.springify().damping(18)}
        style={[
          a.fixed,
          a.flex_row,
          a.overflow_hidden,
          t.atoms.bg,
          {
            top: 0,
            bottom: 0,
            left: leftOffset,
            right: 0,
            paddingBottom: insets.bottom,
            zIndex: 1,
          },
        ]}>
        {isFocused && <LockScroll />}
        <SplitViewProvider side="left">
          <View
            style={[
              a.flex_shrink_0,
              a.flex_col,
              a.overflow_hidden,
              t.atoms.bg,
              a.border_l,
              a.border_r,
              t.atoms.border_contrast_low,
              {width: sidebarWidth, paddingTop: insets.top},
            ]}>
            {sidebar}
          </View>
        </SplitViewProvider>

        <SplitViewProvider side="right">
          <View
            style={[
              a.flex_1,
              a.relative,
              a.overflow_hidden,
              a.border_r,
              t.atoms.border_contrast_low,
              web({cursor: 'grab'}),
            ]}>
            {map}
          </View>
        </SplitViewProvider>
      </Animated.View>
    )
  }

  return (
    <View
      style={[
        a.flex_1,
        a.flex_row,
        a.overflow_hidden,
        // The fixed left nav rail floats over the page from the left edge;
        // keep the drawer and map clear of it.
        {
          paddingBottom: insets.bottom,
          marginLeft: hasSession && gtMobile ? LEFT_NAV_MINIMAL_WIDTH : 0,
        },
      ]}>
      {/* Drawer */}
      {drawerOpen && (
        <Animated.View
          entering={SlideInLeft.springify().damping(18)}
          style={[
            a.absolute,
            a.top_0,
            a.bottom_0,
            a.left_0,
            {width: '85%', zIndex: 50},
            a.flex_col,
            a.overflow_hidden,
            t.atoms.bg,
            a.border_r,
            t.atoms.border_contrast_low,
            web({boxShadow: '4px 0 24px rgba(0,0,0,0.15)'}),
          ]}>
          <View style={[a.flex_row, a.align_center, a.justify_between, a.p_md]}>
            <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
              Mexico Map
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setDrawerOpen(false)}
              style={[a.p_xs, a.rounded_full, t.atoms.bg_contrast_100]}>
              <Text
                style={[a.text_md, a.font_bold, t.atoms.text_contrast_medium]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[a.flex_1]}>{sidebar}</View>
        </Animated.View>
      )}

      {/* Overlay scrim when drawer open */}
      {drawerOpen && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Close sidebar"
          accessibilityHint=""
          onPress={() => setDrawerOpen(false)}
          style={[
            a.absolute,
            a.inset_0,
            {backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 40},
          ]}
          activeOpacity={1}
        />
      )}

      <View style={[a.flex_1, a.relative, a.overflow_hidden]}>{map}</View>
    </View>
  )
}
