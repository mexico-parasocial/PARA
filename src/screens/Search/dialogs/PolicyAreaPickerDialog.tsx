import {useState} from 'react'
import {Pressable, ScrollView, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type CivicCategoryKey,useCivicCategories} from '#/lib/interests'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Text} from '#/components/Typography'

export {useDialogControl} from '#/components/Dialog'

export function PolicyAreaPickerDialog({
  control,
  selectedTags,
  onConfirm,
}: {
  control: Dialog.DialogControlProps
  selectedTags: string[]
  onConfirm: (next: string[]) => void
}) {
  const {_} = useLingui()
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Dialog.ScrollableInner
        label={_(msg`Filter by policy area`)}
        style={[{maxWidth: 500, width: '100%'}]}>
        <Inner control={control} selectedTags={selectedTags} onConfirm={onConfirm} />
        <Dialog.Close />
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}

function Inner({
  control,
  selectedTags,
  onConfirm,
}: {
  control: Dialog.DialogControlProps
  selectedTags: string[]
  onConfirm: (next: string[]) => void
}) {
  const {_} = useLingui()
  const categories = useCivicCategories()
  const [draft, setDraft] = useState<string[]>(selectedTags)

  const toggle = (tag: string) => {
    setDraft(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    )
  }

  const handleConfirm = () => {
    onConfirm(draft)
    control.close()
  }

  return (
    <View style={[{gap: 12}]}>
      <Text style={[{fontSize: 16, fontWeight: '600'}]}>
        <Trans>Filter by policy area</Trans>
      </Text>
      <Text style={[{opacity: 0.7, fontSize: 13}]}>
        <Trans>
          Select topics to narrow results. Posts tagged with any of these will
          appear in your search.
        </Trans>
      </Text>
      <ScrollView
        style={[{maxHeight: 480}]}
        contentContainerStyle={[{paddingBottom: 8}]}>
        <View style={[{gap: 16}]}>
          {(
            Object.keys(categories) as CivicCategoryKey[]
          ).map(key => {
            const cat = categories[key]
            return (
              <View key={key} style={[{gap: 6}]}>
                <Text style={[{fontWeight: '600', fontSize: 14}]}>
                  {cat.emoji} {cat.label}
                </Text>
                <View
                  style={[
                    {
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 6,
                    },
                  ]}>
                  {cat.interests.map(tag => {
                    const isSelected = draft.includes(tag)
                    return (
                      <TagPill
                        key={tag}
                        label={cat.interestLabels[tag] ?? tag}
                        selected={isSelected}
                        onPress={() => toggle(tag)}
                      />
                    )
                  })}
                </View>
              </View>
            )
          })}
        </View>
      </ScrollView>
      <View style={[{flexDirection: 'row', gap: 8, justifyContent: 'flex-end'}]}>
        <Button
          variant="solid"
          color="primary"
          onPress={handleConfirm}
          label={_(msg`Apply`)}>
          <ButtonText>
            <Trans>Apply</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}

function TagPill({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{checked: selected}}
      hitSlop={4}
      style={({pressed}) => [
        {
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: selected ? '#0066ff' : '#cccccc',
          backgroundColor: selected ? '#e6f0ff' : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <Text
        style={[
          {fontSize: 13},
          selected ? {color: '#0066ff', fontWeight: '600'} : undefined,
        ]}>
        {label}
      </Text>
    </Pressable>
  )
}
