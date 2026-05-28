import {useEffect, useRef, useState} from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import {WebScrollControls} from '#/components/WebScrollControls'

export const ITEM_HEIGHT = 44
const DEFAULT_VISIBLE_ROW_COUNT = 5

type WheelPickerProps = {
  items: string[]
  selectedValue: string
  onValueChange: (value: string) => void
  theme: Theme
  visibleRowCount?: 3 | 5
}

export function WheelPicker({
  items,
  selectedValue,
  onValueChange,
  theme,
  visibleRowCount = DEFAULT_VISIBLE_ROW_COUNT,
}: WheelPickerProps) {
  const scrollViewRef = useRef<ScrollView>(null)
  const initialIndex = items.findIndex(item => item === selectedValue)
  const [selectedIndex, setSelectedIndex] = useState(
    initialIndex >= 0 ? initialIndex : 0,
  )
  const isProgrammaticScroll = useRef(false)
  const sideItemCount = Math.floor(visibleRowCount / 2)

  const getOffsetForIndex = (index: number) => index * ITEM_HEIGHT

  const getIndexFromOffset = (offset: number) =>
    Math.round(offset / ITEM_HEIGHT)

  // First useEffect - mount only, suppress the warning since it's intentional
  useEffect(() => {
    const index = items.findIndex(item => item === selectedValue)
    const targetIndex = index >= 0 ? index : 0
    setSelectedIndex(targetIndex)
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        y: getOffsetForIndex(targetIndex),
        animated: false,
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Second useEffect - only respond to external changes
  useEffect(() => {
    const index = items.findIndex(item => item === selectedValue)
    const targetIndex = index >= 0 ? index : 0
    if (targetIndex !== selectedIndex) {
      setSelectedIndex(targetIndex)
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({
          y: getOffsetForIndex(targetIndex),
          animated: true,
        })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValue, items])

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y
    const index = getIndexFromOffset(y)
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1))

    if (
      clampedIndex >= 0 &&
      clampedIndex < items.length &&
      clampedIndex !== selectedIndex
    ) {
      setSelectedIndex(clampedIndex)
      onValueChange(items[clampedIndex])
    }
  }

  const settleToIndex = (index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1))
    const targetY = getOffsetForIndex(clampedIndex)

    scrollViewRef.current?.scrollTo({
      y: targetY,
      animated: true,
    })
    isProgrammaticScroll.current = true

    if (clampedIndex !== selectedIndex) {
      setSelectedIndex(clampedIndex)
      onValueChange(items[clampedIndex])
    }
  }

  const handleScrollEndDrag = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const y = event.nativeEvent.contentOffset.y
    const index = getIndexFromOffset(y)
    settleToIndex(index)
  }

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (isProgrammaticScroll.current) {
      isProgrammaticScroll.current = false
      return
    }

    const y = event.nativeEvent.contentOffset.y
    const index = getIndexFromOffset(y)
    settleToIndex(index)
  }

  return (
    <View
      style={[
        styles.wheelPickerContainer,
        {height: ITEM_HEIGHT * visibleRowCount},
      ]}>
      <View
        style={[
          styles.wheelPickerSelection,
          theme.atoms.border_contrast_low,
          {top: ITEM_HEIGHT * sideItemCount},
        ]}
      />

      {/* Creative Arrows for ScrollWheel */}
      <WebScrollControls
        scrollViewRef={scrollViewRef}
        direction="vertical"
        scrollAmount={ITEM_HEIGHT}
        iconSize={20}
        style={{right: 10}}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.wheelPickerScroll}
        contentContainerStyle={styles.wheelPickerContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate={0.92}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={8}>
        <View style={{height: ITEM_HEIGHT * sideItemCount}} />
        {items.map((item, index) => (
          <View
            key={`${item}-${index}`}
            style={[styles.wheelPickerItem, {height: ITEM_HEIGHT}]}>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.wheelPickerItemTouchable}
              onPress={() => {
                settleToIndex(index)
              }}>
              <Text
                style={[
                  styles.wheelPickerItemText,
                  theme.atoms.text,
                  index === selectedIndex && styles.wheelPickerItemTextSelected,
                  index === selectedIndex && {opacity: 1},
                ]}>
                {item}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={{height: ITEM_HEIGHT * sideItemCount}} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wheelPickerContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  wheelPickerSelection: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
  },
  wheelPickerScroll: {
    flex: 1,
  },
  wheelPickerContent: {
    paddingVertical: 0,
  },
  wheelPickerItem: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  wheelPickerItemTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelPickerItemSelected: {},
  wheelPickerItemText: {
    fontSize: 16,
    fontWeight: '400',
    opacity: 0.5,
    textAlign: 'center',
    lineHeight: ITEM_HEIGHT,
  },
  wheelPickerItemTextSelected: {
    fontWeight: '600',
    fontSize: 17,
  },
})
