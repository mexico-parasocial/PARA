import {useCallback, useMemo, useReducer, useRef, useState} from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'
import {useQueryClient} from '@tanstack/react-query'

import * as apilib from '#/lib/api/index'
import {MAX_GRAPHEME_LENGTH} from '#/lib/constants'
import {useIsKeyboardVisible} from '#/lib/hooks/useIsKeyboardVisible'
import {useWebMediaQueries} from '#/lib/hooks/useWebMediaQueries'
import {type NavigationProp} from '#/lib/routes/types'
import {cleanError} from '#/lib/strings/errors'
import {POST_FLAIRS} from '#/lib/tags'
import {logger} from '#/logger'
import {type ComposerImage, createComposerImage} from '#/state/gallery'
import {useModalControls} from '#/state/modals'
import {toPostLanguages, useLanguagePrefs} from '#/state/preferences/languages'
import {usePreferencesQuery} from '#/state/queries/preferences'
import {useProfileQuery} from '#/state/queries/profile'
import {type Gif} from '#/state/queries/tenor'
import {useAgent, useSession} from '#/state/session'
import {CharProgress} from '#/view/com/composer/char-progress/CharProgress'
import {ExternalEmbedLink} from '#/view/com/composer/ExternalEmbed'
import {LabelsBtn} from '#/view/com/composer/labels/LabelsBtn'
import {Gallery} from '#/view/com/composer/photos/Gallery'
import {OpenCameraBtn} from '#/view/com/composer/photos/OpenCameraBtn'
import {SelectGifBtn} from '#/view/com/composer/photos/SelectGifBtn'
import {PostLanguageSelect} from '#/view/com/composer/select-language/PostLanguageSelect'
import {SuggestedLanguage} from '#/view/com/composer/select-language/SuggestedLanguage'
import {
  type AssetType,
  SelectMediaButton,
  type SelectMediaButtonProps,
} from '#/view/com/composer/SelectMediaButton'
import {
  composerReducer,
  createComposerState,
  type PostAction,
} from '#/view/com/composer/state/composer'
import {TextInput} from '#/view/com/composer/text-input/TextInput'
import {type TextInputRef} from '#/view/com/composer/text-input/TextInput.types'
import {ThreadgateBtn} from '#/view/com/composer/threadgate/ThreadgateBtn'
import {Text} from '#/view/com/util/text/Text'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {EmojiArc_Stroke2_Corner0_Rounded as EmojiSmileIcon} from '#/components/icons/Emoji'
import {Verified_Stroke2_Corner2_Rounded as VerifiedIcon} from '#/components/icons/Verified'
import * as Layout from '#/components/Layout'
import * as Toast from '#/components/Toast'
// Available flairs - now using the centralized POST_FLAIRS
const AVAILABLE_POST_FLAIRS = Object.values(POST_FLAIRS)

const MATTER_POLICY_OPTIONS = [
  {label: 'Official Matter', value: 'official_matter', isOfficial: true},
  {label: 'Nonofficial Matter', value: 'nonofficial_matter', isOfficial: false},
  {label: 'Official Policy', value: 'official_policy', isOfficial: true},
  {label: 'Nonofficial Policy', value: 'nonofficial_policy', isOfficial: false},
]

export function CreatePostScreen() {
  const {_} = useLingui()
  const t = useTheme()
  const {currentAccount} = useSession()
  const agent = useAgent()
  const queryClient = useQueryClient()
  const navigation = useNavigation<NavigationProp>()
  const insets = useSafeAreaInsets()
  const currentDid = currentAccount!.did
  const {data: currentProfile} = useProfileQuery({did: currentDid})
  const {data: preferences} = usePreferencesQuery()
  const {isMobile} = useWebMediaQueries()
  const {} = useModalControls() // Removed openModal
  const textInput = useRef<TextInputRef>(null)

  const [composerState, dispatch] = useReducer(
    composerReducer,
    {
      initText: undefined,
      initMention: undefined,
      initImageUris: undefined,
      initQuoteUri: undefined,
      initInteractionSettings: preferences?.postInteractionSettings,
    },
    createComposerState,
  )
  const [selectedFlair, setSelectedFlair] = useState<
    (typeof POST_FLAIRS)[keyof typeof POST_FLAIRS] | null
  >(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState('')
  const [showFlairPicker, setShowFlairPicker] = useState(false)
  const [showMatterPolicyPicker, setShowMatterPolicyPicker] = useState(false)
  const [selectedMatterPolicy, setSelectedMatterPolicy] = useState<
    string | null
  >(null)
  const [selectedAssetsType, setSelectedAssetsType] = useState<
    AssetType | undefined
  >(undefined)

  const langPrefs = useLanguagePrefs()
  // Removed setLangPrefs as it was unused
  const [acceptedLanguageSuggestion, setAcceptedLanguageSuggestion] = useState<
    string | null
  >(null)

  const currentLanguages = useMemo(
    () =>
      acceptedLanguageSuggestion
        ? [acceptedLanguageSuggestion]
        : toPostLanguages(langPrefs.postLanguage),
    [acceptedLanguageSuggestion, langPrefs.postLanguage],
  )

  const onSelectLanguage = (_lang: string) => {
    setAcceptedLanguageSuggestion(null)
  }

  const thread = composerState.thread
  const post = thread.posts[0]
  const richtext = post.richtext

  const dispatchPost = useCallback(
    (action: PostAction) => {
      dispatch({
        type: 'update_post',
        postId: post.id,
        postAction: action,
      })
    },
    [dispatch, post.id], // post.id is usually considered stable here, but keeping based on logic
  )

  const isEmptyPost = useMemo(() => {
    return (
      richtext.text.trim().length === 0 &&
      !post.embed.media &&
      !post.embed.link &&
      !post.embed.quote
    )
  }, [richtext.text, post.embed])

  const canPost =
    post.shortenedGraphemeLength <= MAX_GRAPHEME_LENGTH && !isEmptyPost

  const onPressPublish = useCallback(async () => {
    if (isPublishing || !canPost) {
      return
    }

    setError('')
    setIsPublishing(true)

    try {
      logger.info(`createPostScreen: posting...`)

      // Create thread with flair set (dispatch wouldn't update the captured thread in time)
      const threadToPost = selectedFlair
        ? {
            ...thread,
            posts: [
              {
                ...thread.posts[0],
                flair: selectedFlair,
              },
              ...thread.posts.slice(1),
            ],
          }
        : thread

      // apilib.post handles adding the flair tag to metadata
      const result = await apilib.post(agent, queryClient, {
        thread: threadToPost,
        onStateChange: () => {},
        langs: currentLanguages,
      })

      if (selectedFlair && result.uris[0]) {
        logger.info(
          `createPostScreen: post created with flair: ${selectedFlair.id}`,
        )
      }

      Toast.show(
        <Toast.Outer>
          <Toast.Icon />
          <Toast.Text>
            <Trans>Your post was sent</Trans>
          </Toast.Text>
        </Toast.Outer>,
        {type: 'success'},
      )

      navigation.goBack()
    } catch (e: unknown) {
      logger.error(e, {message: `CreatePostScreen: create post failed`})
      const cleanErr = cleanError((e as Error)?.message || String(e)) // Renamed from 'err' to 'cleanErr' for clarity
      setError(cleanErr)
      setIsPublishing(false)
    }
  }, [
    agent,
    queryClient,
    thread,
    canPost,
    isPublishing,
    selectedFlair,
    navigation,
    currentLanguages,
  ])

  const onPressCancel = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const onImageAdd = useCallback(
    (next: ComposerImage[]) => {
      dispatchPost({
        type: 'embed_add_images',
        images: next,
      })
    },
    [dispatchPost],
  )

  const onSelectGif = useCallback(
    (gif: Gif) => {
      dispatchPost({type: 'embed_add_gif', gif})
    },
    [dispatchPost],
  )

  const onSelectAssets = useCallback<SelectMediaButtonProps['onSelectAssets']>(
    async ({type, assets, errors}) => {
      setSelectedAssetsType(type)

      if (assets.length) {
        if (type === 'image') {
          const images: ComposerImage[] = []

          await Promise.all(
            assets.map(async image => {
              const composerImage = await createComposerImage({
                path: image.uri,
                width: image.width,
                height: image.height,
                mime: image.mimeType!,
              })
              images.push(composerImage)
            }),
          ).catch(e => {
            logger.error(`createComposerImage failed`, {
              safeMessage: e.message,
            })
          })

          onImageAdd(images)
        } else if (type === 'video') {
          Toast.show('Video upload not yet supported in this screen', {
            type: 'error',
          })
        } else if (type === 'gif') {
          Toast.show(
            'GIF upload from gallery not yet supported in this screen',
            {
              type: 'error',
            },
          )
        }
      }

      errors.map(err => {
        Toast.show(err, {
          type: 'warning',
        })
      })
    },
    [onImageAdd],
  )

  const media = post.embed.media
  const images = media?.type === 'images' ? media.images : []
  const isMaxImages = images.length >= 4

  let selectedAssetsCount = 0
  let isMediaSelectionDisabled = false

  if (media?.type === 'images') {
    isMediaSelectionDisabled = isMaxImages
    selectedAssetsCount = images.length
  } else if (media?.type === 'video') {
    isMediaSelectionDisabled = true
    selectedAssetsCount = 1
  } else {
    isMediaSelectionDisabled = !!media
  }

  const onPhotoPasted = useCallback(
    async (uri: string) => {
      try {
        // Create the composer image object required by your state
        const composerImage = await createComposerImage({
          path: uri,
          width: 0, // Placeholder, usually handled during upload or by metadata fetch
          height: 0,
          mime: 'image/jpeg',
        })
        onImageAdd([composerImage])
      } catch (e: unknown) {
        logger.error(`CreatePostScreen: onPhotoPasted failed`, {
          message: (e as Error)?.message || String(e),
        })
      }
    },
    [onImageAdd],
  )

  const onEmojiButtonPress = useCallback(() => {
    Toast.show('Emoji picker not implemented yet', {type: 'error'})
  }, [])

  const [isKeyboardVisible] = useIsKeyboardVisible({iosUseWillEvents: true})

  const footer = (
    <View
      style={[
        a.border_t,
        t.atoms.border_contrast_low,
        t.atoms.bg,
        {
          paddingBottom:
            (Platform.OS === 'ios' && !isKeyboardVisible) ||
            (Platform.OS === 'android' && isKeyboardVisible)
              ? insets.bottom
              : 10,
        },
      ]}>
      <SuggestedLanguage
        text={richtext.text}
        replyToLanguages={[]}
        currentLanguages={currentLanguages}
        onAcceptSuggestedLanguage={setAcceptedLanguageSuggestion}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[a.p_sm, a.gap_sm]}>
        <ThreadgateBtn
          postgate={thread.postgate}
          onChangePostgate={nextPostgate => {
            dispatch({type: 'update_postgate', postgate: nextPostgate})
          }}
          threadgateAllowUISettings={thread.threadgate}
          onChangeThreadgateAllowUISettings={nextThreadgate => {
            dispatch({
              type: 'update_threadgate',
              threadgate: nextThreadgate,
            })
          }}
        />
        <LabelsBtn
          labels={post.labels}
          onChange={nextLabels => {
            dispatchPost({
              type: 'update_labels',
              labels: nextLabels,
            })
          }}
        />
      </ScrollView>
      <View
        style={[
          a.flex_row,
          a.justify_between,
          a.align_center,
          a.p_sm,
          a.pl_xs,
        ]}>
        <View style={[a.flex_row, a.align_center, a.gap_xs]}>
          <SelectMediaButton
            disabled={isMediaSelectionDisabled}
            allowedAssetTypes={selectedAssetsType}
            selectedAssetsCount={selectedAssetsCount}
            onSelectAssets={onSelectAssets}
          />
          <OpenCameraBtn
            disabled={media?.type === 'images' ? isMaxImages : !!media}
            onAdd={onImageAdd}
          />
          <SelectGifBtn onSelectGif={onSelectGif} disabled={!!media} />
          {!isMobile && (
            <Button
              onPress={onEmojiButtonPress}
              style={a.p_sm}
              label={_(msg`Open emoji picker`)}
              accessibilityHint={_(msg`Opens emoji picker`)}
              variant="ghost"
              shape="round"
              color="primary">
              <EmojiSmileIcon size="lg" />
            </Button>
          )}
        </View>
        <View style={[a.flex_row, a.align_center]}>
          <PostLanguageSelect
            currentLanguages={currentLanguages}
            onSelectLanguage={onSelectLanguage}
          />
          <CharProgress
            count={post.shortenedGraphemeLength}
            style={{width: 65}}
          />
        </View>
      </View>
    </View>
  )

  return (
    <Layout.Screen noInsetTop style={[t.atoms.bg, t.atoms.border_contrast_low]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        <View style={styles.header}>
          <Button
            label={_(msg`Cancel`)}
            variant="ghost"
            color="primary"
            shape="default"
            size="small"
            style={[a.rounded_full, a.py_sm, {paddingLeft: 7, paddingRight: 7}]}
            onPress={onPressCancel}
            accessibilityHint={_(
              msg`Closes post composer and discards post draft`,
            )}>
            <ButtonText style={[a.text_md]}>
              <Trans>Cancel</Trans>
            </ButtonText>
          </Button>
          <View style={a.flex_1} />
          <TouchableOpacity
            onPress={onPressPublish}
            disabled={!canPost || isPublishing}
            accessibilityRole="button"
            accessibilityLabel={_(msg`Post`)}
            accessibilityHint={_(msg`Publishes your post to the network`)}
            style={[
              styles.publishButton,
              (!canPost || isPublishing) && styles.publishButtonDisabled,
            ]}>
            <Text
              style={[
                styles.publishButtonText,
                (!canPost || isPublishing) && styles.publishButtonTextDisabled,
              ]}>
              {isPublishing ? (
                <Trans>Publishing...</Trans>
              ) : (
                <Trans>Post</Trans>
              )}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={a.flex_1}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.postContainer}>
              <View style={[a.flex_row, a.gap_sm, a.mb_sm, a.flex_wrap]}>
                <View style={[a.relative, {zIndex: 2}]}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowMatterPolicyPicker(!showMatterPolicyPicker)
                      setShowFlairPicker(false)
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={_(msg`Select Type`)}
                    accessibilityHint={_(
                      msg`Opens menu to select matter or policy type`,
                    )}
                    style={[
                      styles.flairButton,
                      t.atoms.border_contrast_low,
                      selectedMatterPolicy && styles.flairButtonSelected,
                      a.flex_row,
                      a.align_center,
                      a.gap_xs,
                    ]}>
                    {selectedMatterPolicy &&
                      MATTER_POLICY_OPTIONS.find(
                        o => o.value === selectedMatterPolicy,
                      )?.isOfficial && (
                        <VerifiedIcon
                          width={14}
                          height={14}
                          style={{color: '#5B2FA1'}}
                        />
                      )}
                    <Text style={[styles.flairButtonText, t.atoms.text]}>
                      {selectedMatterPolicy
                        ? MATTER_POLICY_OPTIONS.find(
                            o => o.value === selectedMatterPolicy,
                          )?.label
                        : 'Select Type'}
                    </Text>
                  </TouchableOpacity>

                  {showMatterPolicyPicker && (
                    <View
                      style={[
                        styles.flairPicker,
                        t.atoms.border_contrast_low,
                        t.atoms.bg,
                        a.mt_sm,
                      ]}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}>
                        <View style={[a.flex_row, a.gap_xs]}>
                          {MATTER_POLICY_OPTIONS.map(option => (
                            <TouchableOpacity
                              key={option.value}
                              onPress={() => {
                                setSelectedMatterPolicy(
                                  option.value === selectedMatterPolicy
                                    ? null
                                    : option.value,
                                )
                                setShowMatterPolicyPicker(false)
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={option.label}
                              accessibilityHint={_(
                                msg`Selects this type for your post`,
                              )}
                              style={[
                                styles.flairOption,
                                t.atoms.border_contrast_low,
                                selectedMatterPolicy === option.value &&
                                  styles.flairOptionSelected,
                                a.flex_row,
                                a.align_center,
                                a.gap_xs,
                              ]}>
                              {option.isOfficial && (
                                <VerifiedIcon
                                  width={14}
                                  height={14}
                                  style={{
                                    color:
                                      selectedMatterPolicy === option.value
                                        ? '#FFFFFF'
                                        : '#5B2FA1',
                                  }}
                                />
                              )}
                              <Text
                                style={[
                                  styles.flairOptionText,
                                  t.atoms.text,
                                  selectedMatterPolicy === option.value &&
                                    styles.flairOptionTextSelected,
                                ]}>
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={[a.relative, {zIndex: 1}]}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowFlairPicker(!showFlairPicker)
                      setShowMatterPolicyPicker(false)
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={_(msg`Add Flair`)}
                    accessibilityHint={_(
                      msg`Opens menu to select a post flair`,
                    )}
                    style={[
                      styles.flairButton,
                      t.atoms.border_contrast_low,
                      selectedFlair && styles.flairButtonSelected,
                    ]}>
                    <Text style={[styles.flairButtonText, t.atoms.text]}>
                      {selectedFlair ? selectedFlair.label : 'Add Flair'}
                    </Text>
                  </TouchableOpacity>

                  {showFlairPicker && (
                    <View
                      style={[
                        styles.flairPicker,
                        t.atoms.border_contrast_low,
                        t.atoms.bg,
                        a.mt_sm,
                      ]}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}>
                        <View style={[a.gap_xs, a.flex_row]}>
                          {AVAILABLE_POST_FLAIRS.map(flair => (
                            <TouchableOpacity
                              key={flair.id}
                              onPress={() => {
                                setSelectedFlair(
                                  flair.id === selectedFlair?.id ? null : flair,
                                )
                                setShowFlairPicker(false)
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={flair.label}
                              accessibilityHint={_(
                                msg`Selects this flair for your post`,
                              )}
                              style={[
                                styles.flairOption,
                                t.atoms.border_contrast_low,
                                selectedFlair?.id === flair.id &&
                                  styles.flairOptionSelected,
                                {borderColor: flair.color},
                              ]}>
                              <View
                                style={[
                                  {width: 10, height: 10, borderRadius: 5},
                                  {backgroundColor: flair.color},
                                  a.mr_xs,
                                ]}
                              />
                              <Text
                                style={[
                                  styles.flairOptionText,
                                  t.atoms.text,
                                  selectedFlair?.id === flair.id &&
                                    styles.flairOptionTextSelected,
                                ]}>
                                {flair.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              <View style={[a.flex_row, a.mb_md]}>
                <UserAvatar
                  avatar={currentProfile?.avatar}
                  size={42}
                  type={
                    currentProfile?.associated?.labeler ? 'labeler' : 'user'
                  }
                  style={[a.mt_xs]}
                />
                <View style={[a.flex_1, a.ml_md]}>
                  <TextInput
                    ref={textInput}
                    style={[a.pt_xs]}
                    richtext={richtext}
                    placeholder={_(msg`What's up?`)}
                    autoFocus
                    isActive={true}
                    civicAutocompleteEnabled={false}
                    selectedFlairs={selectedFlair ? [selectedFlair] : []}
                    postType={null}
                    setRichText={rt => {
                      dispatchPost({type: 'update_richtext', richtext: rt})
                    }}
                    setSelectedFlairs={flairs => {
                      const nextFlair = flairs[0]
                      setSelectedFlair(
                        Object.values(POST_FLAIRS).find(
                          flair => flair.id === nextFlair?.id,
                        ) ?? null,
                      )
                    }}
                    setPostType={() => {}}
                    // Fix: Pass the missing prop
                    onPhotoPasted={onPhotoPasted}
                    // Fix: Ensure the signature matches (RichText) => void
                    onPressPublish={() => onPressPublish()}
                    accessible={true}
                    accessibilityLabel={_(msg`Write post`)}
                    accessibilityHint={_(
                      msg`Input field for your post content`,
                    )}
                    onNewLink={uri =>
                      dispatchPost({type: 'embed_add_uri', uri})
                    }
                    webForceMinHeight={false}
                    hasRightPadding={false}
                    onError={setError}
                    onFocus={() => {}}
                  />
                </View>
              </View>

              {media?.type === 'images' && (
                <Gallery images={media.images} dispatch={dispatchPost} />
              )}

              {!media && post.embed.link && (
                <View style={[a.relative, a.mt_lg]}>
                  <ExternalEmbedLink
                    uri={post.embed.link.uri}
                    onRemove={() => dispatchPost({type: 'embed_remove_link'})}
                    hasQuote={!!post.embed.quote}
                  />
                </View>
              )}

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
          {footer}
        </View>
      </KeyboardAvoidingView>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 54,
    gap: 4,
  },
  publishButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#5B2FA1',
  },
  publishButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  publishButtonTextDisabled: {
    color: '#999999',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  postContainer: {
    flex: 1,
  },
  flairButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  flairButtonSelected: {
    backgroundColor: '#EFE9F5',
    borderColor: '#5B2FA1',
  },
  flairButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  flairPicker: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 200,
  },
  flairOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  flairOptionSelected: {
    backgroundColor: '#5B2FA1',
    borderColor: '#5B2FA1',
  },
  flairOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  flairOptionTextSelected: {
    color: '#FFFFFF',
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
  },
})
