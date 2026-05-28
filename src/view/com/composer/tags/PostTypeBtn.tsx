import {Pressable, TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {POST_TYPES, type PostType} from '#/lib/tags'
import {atoms as a, useTheme, web} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Text} from '#/components/Typography'

export function PostTypeBtn({
  postType,
  setPostType,
}: {
  postType: PostType | null
  setPostType: (type: PostType | null) => void
}) {
  const control = Dialog.useDialogControl()
  const {_} = useLingui()

  const hasSelection = postType !== null && postType.id !== 'none'

  return (
    <>
      <Pressable
        onPress={() => control.open()}
        style={[a.flex_row, a.align_center, a.gap_xs]}
        accessibilityRole="button"
        accessibilityLabel={_(msg`Select post type`)}
        accessibilityHint={_(
          msg`Opens a dialog to select the type of post you are making`,
        )}>
        {({pressed: _pressed}) => (
          <>
            {/* Circle Icon */}
            <View
              style={[
                {
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: hasSelection ? postType.color : '#9ca3af',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden', // Ensure overlay respects border radius
                },
              ]}>
              <Text style={[a.font_bold, {color: 'white', fontSize: 12}]}>
                T
              </Text>
              {/* Darkening Overlay */}
              {_pressed && (
                <View
                  style={[
                    a.absolute,
                    {
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.2)',
                    },
                  ]}
                />
              )}
            </View>

            {/* Selection Pill */}
            {hasSelection && (
              <View
                style={[
                  a.px_sm,
                  a.py_xs,
                  a.rounded_full,
                  {
                    backgroundColor: postType.color,
                    height: 34,
                    justifyContent: 'center',
                    overflow: 'hidden', // Ensure overlay respects border radius
                  },
                ]}>
                <Text style={[a.font_bold, {color: 'white', fontSize: 13}]}>
                  {postType.label}
                </Text>
                {/* Darkening Overlay */}
                {_pressed && (
                  <View
                    style={[
                      a.absolute,
                      {
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.2)',
                      },
                    ]}
                  />
                )}
              </View>
            )}
          </>
        )}
      </Pressable>

      <Dialog.Outer control={control} nativeOptions={{preventExpansion: true}}>
        <Dialog.Handle />
        <DialogInner
          postType={postType}
          setPostType={setPostType}
          control={control}
        />
      </Dialog.Outer>
    </>
  )
}

function DialogInner({
  postType,
  setPostType,
  control,
}: {
  postType: PostType | null
  setPostType: (type: PostType | null) => void
  control: Dialog.DialogOuterProps['control']
}) {
  const {_} = useLingui()
  const t = useTheme()

  const handleSelect = (pt: PostType) => {
    if (pt.id === 'none') {
      setPostType(null)
    } else {
      setPostType(pt)
    }
    control.close()
  }

  return (
    <Dialog.ScrollableInner
      label={_(msg`Select Post Type`)}
      style={[{maxWidth: 400}, a.w_full]}>
      <View style={[a.gap_md, a.pb_xl]}>
        <Text style={[a.text_2xl, a.font_bold]}>
          <Trans>Tipo de publicación</Trans>
        </Text>

        <View style={[a.gap_sm]}>
          {Object.values(POST_TYPES).map(pt => (
            <TouchableOpacity
              key={pt.id}
              accessibilityRole="radio"
              accessibilityState={{
                checked:
                  pt.id === 'none' ? postType === null : postType?.id === pt.id,
              }}
              onPress={() => handleSelect(pt)}
              style={[
                a.flex_row,
                a.align_center,
                a.gap_md,
                a.p_md,
                a.rounded_sm,
                (pt.id === 'none' ? postType === null : postType?.id === pt.id)
                  ? t.atoms.bg_contrast_50
                  : t.atoms.bg_contrast_25,
              ]}>
              {/* Radio Circle */}
              <View
                style={[
                  {
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: (
                      pt.id === 'none'
                        ? postType === null
                        : postType?.id === pt.id
                    )
                      ? pt.color
                      : '#888',
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}>
                {(pt.id === 'none'
                  ? postType === null
                  : postType?.id === pt.id) && (
                  <View
                    style={[
                      {
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: pt.color,
                      },
                    ]}
                  />
                )}
              </View>
              {/* Label Pill */}
              {pt.id !== 'none' ? (
                <View
                  style={[
                    a.px_sm,
                    a.py_xs,
                    a.rounded_full,
                    {backgroundColor: pt.color},
                  ]}>
                  <Text style={[a.font_bold, {color: 'white'}]}>
                    {pt.label}
                  </Text>
                </View>
              ) : (
                <Text style={[a.font_semi_bold]}>{pt.label}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={[a.mt_lg, web([a.flex_row, a.ml_auto])]}>
          <Button
            label={_(msg`Done`)}
            onPress={() => control.close()}
            style={{backgroundColor: '#374151'}}
            size={web('small') || 'large'}
            variant="solid">
            <ButtonText style={{color: 'white'}}>
              <Trans>Listo</Trans>
            </ButtonText>
          </Button>
        </View>
      </View>
    </Dialog.ScrollableInner>
  )
}
