import {type ReactNode, useState} from 'react'
import {ScrollView, TouchableOpacity, View} from 'react-native'
import Animated, {FadeInRight, SlideInLeft} from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {useIsFocused} from '@react-navigation/native'

import {useSession} from '#/state/session'
import {SplitViewProvider} from '#/screens/Messages/components/splitView/context'
import {atoms as a, useLayoutBreakpoints, useTheme, web} from '#/alf'
import {Menu_Stroke2_Corner0_Rounded as MenuIcon} from '#/components/icons/Menu'

const scrollbarStyles = web({
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(128,128,128,0.3) transparent',
  '::-webkit-scrollbar': {
    width: '6px',
  },
  '::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(128,128,128,0.3)',
    borderRadius: '3px',
  },
  '::-webkit-scrollbar-thumb:hover': {
    backgroundColor: 'rgba(128,128,128,0.5)',
  },
})
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
}: {
  sidebar: ReactNode
  map: ReactNode
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const {rightNavVisible, centerColumnOffset} = useLayoutBreakpoints()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isFocused = useIsFocused()
  const {hasSession} = useSession()

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
        {paddingBottom: insets.bottom},
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

      <View style={[a.flex_1, a.relative, a.overflow_hidden]}>
        {map}

        {!drawerOpen && (
          <View style={[a.absolute, {left: 16, top: 16, zIndex: 20}]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open sidebar"
              accessibilityHint=""
              onPress={() => setDrawerOpen(true)}
              style={[
                a.align_center,
                a.justify_center,
                a.rounded_full,
                t.atoms.bg_contrast_25,
                web({backdropFilter: 'blur(10px)'}),
                a.border,
                t.atoms.border_contrast_low,
                a.shadow_md,
                {width: 44, height: 44},
              ]}>
              <MenuIcon width={20} height={20} fill={t.atoms.text.color} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

/**
 * Scrollable sidebar panel that hosts overlay content.
 * Used inside both desktop sidebar and mobile drawer.
 */
export function MapSidebarPanel({
  children,
  scrollable = true,
}: {
  children: ReactNode
  scrollable?: boolean
}) {
  const content = <View style={[a.flex_1, a.p_lg, a.gap_md]}>{children}</View>

  if (scrollable) {
    return (
      <ScrollView
        style={[a.flex_1, scrollbarStyles]}
        contentContainerStyle={[a.gap_md, a.pb_xl]}
        showsVerticalScrollIndicator={false}>
        {content}
      </ScrollView>
    )
  }

  return content
}
