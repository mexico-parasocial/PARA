import {
  Fragment,
  memo,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native'
// @ts-expect-error no type definition
import ProgressCircle from 'react-native-progress/Circle'
import Animated, {
  type AnimatedRef,
  Easing,
  FadeIn,
  FadeOut,
  interpolateColor,
  LayoutAnimationConfig,
  LinearTransition,
  runOnUI,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import * as FileSystem from 'expo-file-system'
import {type ImagePickerAsset} from 'expo-image-picker'
import {
  AppBskyUnspeccedDefs,
  type AppBskyUnspeccedGetPostThreadV2,
  AtUri,
  type BskyAgent,
  RichText,
} from '@atproto/api'
import {msg, plural} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'
import {useQueryClient} from '@tanstack/react-query'

import * as apilib from '#/lib/api/index'
import {EmbeddingDisabledError} from '#/lib/api/resolve'
import {useAppState} from '#/lib/appState'
import {retry} from '#/lib/async/retry'
import {until} from '#/lib/async/until'
import {
  canonicalizeCompassCommunityFilter,
  canonicalizeCompassPartyFilter,
  classifyCompassFeedFilters,
} from '#/lib/compass-filters'
import {
  MAX_GRAPHEME_LENGTH,
  SUPPORTED_MIME_TYPES,
  type SupportedMimeTypes,
} from '#/lib/constants'
import {useIsKeyboardVisible} from '#/lib/hooks/useIsKeyboardVisible'
import {useNonReactiveCallback} from '#/lib/hooks/useNonReactiveCallback'
import {usePalette} from '#/lib/hooks/usePalette'
import {useAnonymousMode} from '#/lib/m8/hooks/useAnonymousMode'
import {mimeToExt} from '#/lib/media/video/util'
import {useCallOnce} from '#/lib/once'
import {
  applyOfficialToFlairTag,
  type ComposerFlair,
  derivePostTypeId,
  normalizeComposerFlairs,
} from '#/lib/post-flairs'
import {type NavigationProp} from '#/lib/routes/types'
import {logEvent} from '#/lib/statsig/statsig'
import {cleanError} from '#/lib/strings/errors'
import {colors} from '#/lib/styles'
import {type PostType} from '#/lib/tags'
import {logger} from '#/logger'
import {useDialogStateControlContext} from '#/state/dialogs'
import {emitPostCreated} from '#/state/events'
import {
  type ComposerImage,
  createComposerImage,
  pasteImage,
} from '#/state/gallery'
import {useModalControls} from '#/state/modals'
import {useRequireAltTextEnabled} from '#/state/preferences'
import {
  fromPostLanguages,
  toPostLanguages,
  useLanguagePrefs,
  useLanguagePrefsApi,
} from '#/state/preferences/languages'
import {usePreferencesQuery} from '#/state/queries/preferences'
import {useProfileQuery} from '#/state/queries/profile'
import {useAgent, useSession} from '#/state/session'
import {useCompassFilter} from '#/state/shell/compass-filter'
import {useComposerControls} from '#/state/shell/composer'
import {type ComposerOpts, type OnPostSuccessData} from '#/state/shell/composer'
import {usePoliticalAffiliation} from '#/state/shell/political-affiliation'
import {CharProgress} from '#/view/com/composer/char-progress/CharProgress'
import {ComposerReplyTo} from '#/view/com/composer/ComposerReplyTo'
import {
  ExternalEmbedGif,
  ExternalEmbedLink,
} from '#/view/com/composer/ExternalEmbed'
import {ExternalEmbedRemoveBtn} from '#/view/com/composer/ExternalEmbedRemoveBtn'
import {GifAltTextDialog} from '#/view/com/composer/GifAltText'
import {LabelsBtn} from '#/view/com/composer/labels/LabelsBtn'
import {Gallery} from '#/view/com/composer/photos/Gallery'
import {OpenCameraBtn} from '#/view/com/composer/photos/OpenCameraBtn'
import {SelectGifBtn} from '#/view/com/composer/photos/SelectGifBtn'
import {SuggestedLanguage} from '#/view/com/composer/select-language/SuggestedLanguage'
// TODO: Prevent naming components that coincide with RN primitives
// due to linting false positives
import {TextInput as ComposerTextInput} from '#/view/com/composer/text-input/TextInput'
import {ThreadgateBtn} from '#/view/com/composer/threadgate/ThreadgateBtn'
import {SubtitleDialogBtn} from '#/view/com/composer/videos/SubtitleDialog'
import {VideoPreview} from '#/view/com/composer/videos/VideoPreview'
import {VideoTranscodeProgress} from '#/view/com/composer/videos/VideoTranscodeProgress'
import {Text} from '#/view/com/util/text/Text'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, native, useBreakpoints, useTheme, web} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as EmojiPicker from '#/components/EmojiPicker'
import {
  ChevronLeft_Stroke2_Corner0_Rounded as ChevronLeftIcon,
  ChevronRight_Stroke2_Corner0_Rounded as ChevronRightIcon,
} from '#/components/icons/Chevron'
import {CircleInfo_Stroke2_Corner0_Rounded as CircleInfoIcon} from '#/components/icons/CircleInfo'
import {EmojiArc_Stroke2_Corner0_Rounded as EmojiSmileIcon} from '#/components/icons/Emoji'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import {TimesLarge_Stroke2_Corner0_Rounded as XIcon} from '#/components/icons/Times'
import {Verified_Stroke2_Corner2_Rounded as VerifiedIcon} from '#/components/icons/Verified'
import {LazyQuoteEmbed} from '#/components/Post/Embed/LazyQuoteEmbed'
import * as Prompt from '#/components/Prompt'
import * as Toast from '#/components/Toast'
import {Text as NewText} from '#/components/Typography'
import {useAnalytics} from '#/analytics'
import {IS_ANDROID, IS_IOS, IS_LIQUID_GLASS, IS_NATIVE, IS_WEB} from '#/env'
import {type Gif} from '#/features/gifPicker/types'
import {BottomSheetPortalProvider} from '../../../../modules/bottom-sheet'
import {DraftsButton} from './drafts/DraftsButton'
import {
  draftToComposerPosts,
  extractLocalRefs,
  type RestoredVideo,
} from './drafts/state/api'
import {applyDraftMetadata, loadDraftMetadata} from './drafts/state/metadata'
import {
  loadDraftMedia,
  useCleanupPublishedDraftMutation,
  useSaveDraftMutation,
} from './drafts/state/queries'
import {type DraftSummary} from './drafts/state/schema'
import {revokeAllMediaUrls} from './drafts/state/storage'
import {FlairBtn} from './flair/FlairBtn'
import {PostLanguageSelect} from './select-language/PostLanguageSelect'
import {
  type AssetType,
  SelectMediaButton,
  type SelectMediaButtonProps,
} from './SelectMediaButton'
import {
  type ComposerAction,
  composerReducer,
  createComposerState,
  type EmbedDraft,
  MAX_IMAGES,
  type PostAction,
  type PostDraft,
  type ThreadDraft,
} from './state/composer'
import {
  NO_VIDEO,
  type NoVideoState,
  processVideo,
  type VideoState,
} from './state/video'
import {PostTypeBtn} from './tags/PostTypeBtn'
import {syncComposerSpecialPostTypeText} from './text-input/civic-autocomplete'
import {type TextInputRef} from './text-input/TextInput.types'
import {getVideoMetadata} from './videos/pickVideo'
import {clearThumbnailCache} from './videos/VideoTranscodeBackdrop'

type CancelRef = {
  onPressCancel: () => void
}

type Props = ComposerOpts

export const ComposePost = ({
  replyTo,
  onPost,
  onPostSuccess,
  quote: initQuote,
  mention: initMention,
  text: initText,
  imageUris: initImageUris,
  videoUri: initVideoUri,
  openGallery,
  logContext,
  cancelRef,
}: Props & {
  cancelRef?: RefObject<CancelRef | null>
}) => {
  const {currentAccount} = useSession()
  const agent = useAgent()
  const queryClient = useQueryClient()
  const currentDid = currentAccount!.did
  const {closeComposer} = useComposerControls()
  const {_} = useLingui()
  const ax = useAnalytics()
  const _t = useTheme()
  const requireAltTextEnabled = useRequireAltTextEnabled()
  const langPrefs = useLanguagePrefs()
  const setLangPrefs = useLanguagePrefsApi()
  const textInputRef = useRef<TextInputRef>(null)
  const discardPromptControl = Prompt.usePromptControl()
  // const loadDraftMedia = useLoadDraft() // Removed
  const {mutateAsync: saveDraft, isPending: _isSavingDraft} =
    useSaveDraftMutation()
  const {mutate: cleanupPublishedDraft} = useCleanupPublishedDraftMutation()
  const {closeAllDialogs} = useDialogStateControlContext()
  const {closeAllModals} = useModalControls()
  const {data: preferences} = usePreferencesQuery()
  const navigation = useNavigation<NavigationProp>()
  const {activeFilters} = useCompassFilter()
  const {affiliation} = usePoliticalAffiliation()

  const [isKeyboardVisible] = useIsKeyboardVisible({iosUseWillEvents: true})
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishingStage, setPublishingStage] = useState('')
  const [error, setError] = useState('')

  const enableLargeVideoUploads = ax.features.enabled(
    ax.features.LargeVideoUploads,
  )

  /**
   * Track when a draft was created so we can measure draft age in metrics.
   * Set when a draft is loaded via handleSelectDraft.
   */
  const [loadedDraftCreatedAt, setLoadedDraftCreatedAt] = useState<
    string | null
  >(null)

  // Privacy is now controlled via ThreadgateBtn (Bluesky native interaction settings)

  /**
   * A temporary local reference to a language suggestion that the user has
   * accepted. This overrides the global post language preference, but is not
   * stored permanently.
   */
  const [acceptedLanguageSuggestion, setAcceptedLanguageSuggestion] = useState<
    string | null
  >(null)
  const [langDetectionNudgeAt, setLangDetectionNudgeAt] = useState(0)

  /**
   * The language(s) of the post being replied to.
   */
  const [replyToLanguages, setReplyToLanguages] = useState<string[]>(
    replyTo?.langs || [],
  )

  /**
   * The currently selected languages of the post. Prefer local temporary
   * language suggestion over global lang prefs, if available.
   */
  const currentLanguages = useMemo(
    () =>
      acceptedLanguageSuggestion
        ? [acceptedLanguageSuggestion]
        : toPostLanguages(langPrefs.postLanguage),
    [acceptedLanguageSuggestion, langPrefs.postLanguage],
  )

  /**
   * When the user selects a language from the composer language selector,
   * clear any temporary language suggestions they may have selected
   * previously, and any we might try to suggest to them.
   */
  const onSelectLanguage = () => {
    setAcceptedLanguageSuggestion(null)
    setReplyToLanguages([])
  }

  const [composerState, composerDispatch] = useReducer(
    composerReducer,
    {
      initImageUris,
      initQuoteUri: initQuote?.uri,
      initText,
      initMention,
      initInteractionSettings: preferences?.postInteractionSettings,
    },
    createComposerState,
  )

  const thread = composerState.thread
  const activePost = thread.posts[composerState.activePostIndex]
  const classificationPost = thread.posts[0]
  const nextPost: PostDraft | undefined =
    thread.posts[composerState.activePostIndex + 1]
  const dispatch = useCallback(
    (postAction: PostAction) => {
      composerDispatch({
        type: 'update_post',
        postId: activePost.id,
        postAction,
      })
    },
    [activePost.id],
  )
  const selectedFlairs = classificationPost.flairs
  const isOfficial = classificationPost.isOfficial
  const postType = classificationPost.postType
  const setSelectedFlairs = useCallback(
    (flairs: ComposerFlair[]) => {
      composerDispatch({
        type: 'update_post',
        postId: classificationPost.id,
        postAction: {
          type: 'update_flairs',
          flairs: normalizeComposerFlairs(flairs),
        },
      })
    },
    [classificationPost.id],
  )
  const setIsOfficial = useCallback(
    (value: boolean) => {
      composerDispatch({
        type: 'update_post',
        postId: classificationPost.id,
        postAction: {
          type: 'set_is_official',
          isOfficial: value,
        },
      })
    },
    [classificationPost.id],
  )
  const setPostType = useCallback(
    (value: PostType | null) => {
      const nextText = syncComposerSpecialPostTypeText(
        classificationPost.richtext.text,
        value,
      )

      composerDispatch({
        type: 'update_post',
        postId: classificationPost.id,
        postAction: {
          type: 'set_post_type',
          postType: value,
        },
      })

      if (nextText !== classificationPost.richtext.text) {
        const nextRichText = new RichText({text: nextText})
        nextRichText.detectFacetsWithoutResolution()
        composerDispatch({
          type: 'update_post',
          postId: classificationPost.id,
          postAction: {
            type: 'update_richtext',
            richtext: nextRichText,
          },
        })
      }
    },
    [classificationPost.id, classificationPost.richtext.text],
  )

  const selectVideo = useCallback(
    (postId: string, asset: ImagePickerAsset) => {
      const abortController = new AbortController()
      composerDispatch({
        type: 'update_post',
        postId: postId,
        postAction: {
          type: 'embed_add_video',
          asset,
          abortController,
        },
      })
      processVideo(
        asset,
        videoAction => {
          composerDispatch({
            type: 'update_post',
            postId: postId,
            postAction: {
              type: 'embed_update_video',
              videoAction,
            },
          })
        },
        agent,
        currentDid,
        abortController.signal,
        _,
        enableLargeVideoUploads,
      )
    },
    [_, agent, currentDid, composerDispatch, enableLargeVideoUploads],
  )

  const onInitVideo = useNonReactiveCallback(() => {
    if (initVideoUri) {
      selectVideo(activePost.id, initVideoUri)
    }
  })

  useEffect(() => {
    onInitVideo()
  }, [onInitVideo])

  // Fire composer:open metric on mount
  useCallOnce(() => {
    ax.metric('composer:open', {
      logContext: logContext ?? 'Other',
      isReply: !!replyTo,
      hasQuote: !!initQuote,
      hasDraft: false,
    })
  })()

  const clearVideo = useCallback(
    (postId: string) => {
      composerDispatch({
        type: 'update_post',
        postId: postId,
        postAction: {
          type: 'embed_remove_video',
        },
      })
    },
    [composerDispatch],
  )

  const restoreVideo = useCallback(
    async (postId: string, videoInfo: RestoredVideo) => {
      try {
        logger.debug('restoring video from draft', {
          postId,
          videoUri: videoInfo.uri,
          altText: videoInfo.altText,
          captionCount: videoInfo.captions.length,
        })

        let asset: ImagePickerAsset

        if (IS_WEB) {
          // Web: Convert blob URL to a File, then get video metadata (returns data URL)
          const response = await fetch(videoInfo.uri)
          const blob = await response.blob()
          const file = new File([blob], 'restored-video', {
            type: videoInfo.mimeType,
          })
          asset = await getVideoMetadata(file)
        } else {
          let uri = videoInfo.uri
          if (IS_ANDROID) {
            // Android: expo-file-system double-encodes filenames with special chars.
            // The file exists, but react-native-compressor's MediaMetadataRetriever
            // can't handle the double-encoded URI. Copy to a temp file with a simple name.
            const sourceFile = new FileSystem.File(videoInfo.uri)
            const tempFileName = `draft-video-${Date.now()}.${mimeToExt(videoInfo.mimeType)}`
            const tempFile = new FileSystem.File(
              FileSystem.Paths.cache,
              tempFileName,
            )
            sourceFile.copy(tempFile)
            logger.debug('restoreVideo: copied to temp file', {
              source: videoInfo.uri,
              temp: tempFile.uri,
            })
            uri = tempFile.uri
          }
          asset = await getVideoMetadata(uri)
        }

        // Start video processing using existing flow
        const abortController = new AbortController()
        composerDispatch({
          type: 'update_post',
          postId,
          postAction: {
            type: 'embed_add_video',
            asset,
            abortController,
          },
        })

        // Restore alt text immediately
        if (videoInfo.altText) {
          composerDispatch({
            type: 'update_post',
            postId,
            postAction: {
              type: 'embed_update_video',
              videoAction: {
                type: 'update_alt_text',
                altText: videoInfo.altText,
                signal: abortController.signal,
              },
            },
          })
        }

        // Restore captions (web only - captions use File objects)
        if (IS_WEB && videoInfo.captions.length > 0) {
          const captionTracks = videoInfo.captions.map(c => ({
            lang: c.lang,
            file: new File([c.content], `caption-${c.lang}.vtt`, {
              type: 'text/vtt',
            }),
          }))
          composerDispatch({
            type: 'update_post',
            postId,
            postAction: {
              type: 'embed_update_video',
              videoAction: {
                type: 'update_captions',
                updater: () => captionTracks,
                signal: abortController.signal,
              },
            },
          })
        }

        // Start video compression and upload
        processVideo(
          asset,
          videoAction => {
            composerDispatch({
              type: 'update_post',
              postId,
              postAction: {
                type: 'embed_update_video',
                videoAction,
              },
            })
          },
          agent,
          currentDid,
          abortController.signal,
          _,
          enableLargeVideoUploads,
        )
      } catch (e) {
        logger.error('Failed to restore video from draft', {
          postId,
          error: e,
        })
      }
    },
    [_, agent, currentDid, composerDispatch, enableLargeVideoUploads],
  )

  const handleSelectDraft = useCallback(
    async (draftSummary: DraftSummary) => {
      logger.debug('loading draft for editing', {
        draftId: draftSummary.id,
      })
      // Load local media files for the draft
      const {loadedMedia} = await loadDraftMedia(draftSummary.draft)

      // Extract original localRefs for orphan detection on save
      const originalLocalRefs = extractLocalRefs(draftSummary.draft)

      logger.debug('draft loaded', {
        draftId: draftSummary.id,
        loadedMediaCount: loadedMedia.size,
        originalLocalRefCount: originalLocalRefs.size,
      })

      // Convert server draft to composer posts (videos returned separately)
      const draftMetadata = await loadDraftMetadata(draftSummary.id)
      const {posts: restoredPosts, restoredVideos} = await draftToComposerPosts(
        draftSummary.draft,
        loadedMedia,
      )
      const posts = applyDraftMetadata(restoredPosts, draftMetadata)

      // Dispatch restore action (this also sets draftId in state)
      composerDispatch({
        type: 'restore_from_draft',
        draftId: draftSummary.id,
        posts,
        threadgateAllow: draftSummary.draft.threadgateAllow,
        postgateEmbeddingRules: draftSummary.draft.postgateEmbeddingRules,
        loadedMedia,
        originalLocalRefs,
      })

      // Track when the draft was created for metrics
      setLoadedDraftCreatedAt(draftSummary.createdAt)

      // Fire draft:load metric
      const draftPosts = draftSummary.posts
      const draftAgeMs = Date.now() - new Date(draftSummary.createdAt).getTime()
      ax.metric('draft:load', {
        draftAgeMs,
        hasText: draftPosts.some(p => p.text.trim().length > 0),
        hasImages: draftPosts.some(p => p.images && p.images.length > 0),
        hasVideo: draftPosts.some(p => !!p.video),
        hasGif: draftPosts.some(p => !!p.gif),
        postCount: draftPosts.length,
      })

      // Initiate video processing for any restored videos
      // This is async but we don't await - videos process in the background
      for (const [postIndex, videoInfo] of restoredVideos) {
        const postId = posts[postIndex].id
        restoreVideo(postId, videoInfo)
      }
    },
    [composerDispatch, restoreVideo, ax],
  )

  /*
   * Handled by useSaveDraftMutation hook at line 227
   * const { mutateAsync: saveDraft } = useSaveDraftMutation()
   */
  const [publishOnUpload, setPublishOnUpload] = useState(false)

  const onClose = useCallback(() => {
    closeComposer()
    clearThumbnailCache(queryClient)
    revokeAllMediaUrls()
  }, [closeComposer, queryClient])

  const handleSaveDraft = useCallback(async () => {
    const isNewDraft = !composerState.draftId
    try {
      const {draftId: newDraftId} = await saveDraft({
        composerState,
        existingDraftId: composerState.draftId,
      })

      composerDispatch({
        type: 'mark_saved',
        draftId: newDraftId,
      })

      // Fire draft:save metric
      const posts = composerState.thread.posts
      ax.metric('draft:save', {
        isNewDraft,
        hasText: posts.some(p => p.richtext.text.trim().length > 0),
        hasImages: posts.some(p => p.embed.media?.type === 'images'),
        hasVideo: posts.some(p => p.embed.media?.type === 'video'),
        hasGif: posts.some(p => p.embed.media?.type === 'gif'),
        hasQuote: posts.some(p => !!p.embed.quote),
        hasLink: posts.some(p => !!p.embed.link),
        postCount: posts.length,
        textLength: posts[0].richtext.text.length,
      })

      Toast.show(_(msg`Draft saved`))
      onClose()
    } catch (e) {
      Toast.show(_(msg`Failed to save draft`), {type: 'error'})
      logger.error('Failed to save draft', {error: e})
    }
  }, [composerState, saveDraft, composerDispatch, onClose, _, ax])

  // Handle discard action - fires metric and closes composer
  const handleDiscard = useCallback(() => {
    const posts = thread.posts
    const hasContent = posts.some(
      post =>
        post.richtext.text.trim().length > 0 ||
        post.embed.media ||
        post.embed.link,
    )
    ax.metric('draft:discard', {
      logContext: 'ComposerClose',
      hadContent: hasContent,
      textLength: posts[0].richtext.text.length,
    })
    onClose()
  }, [thread.posts, ax, onClose])

  const insets = useSafeAreaInsets()
  const viewStyles = useMemo(
    () => ({
      paddingTop: IS_ANDROID ? insets.top : 0,
      paddingBottom:
        // iOS - when keyboard is closed, keep the bottom bar in the safe area
        (IS_IOS && !isKeyboardVisible) ||
        // Android - Android >=35 KeyboardAvoidingView adds double padding when
        // keyboard is closed, so we subtract that in the offset and add it back
        // here when the keyboard is open
        (IS_ANDROID && isKeyboardVisible)
          ? insets.bottom
          : 0,
    }),
    [insets, isKeyboardVisible],
  )

  const onPressCancel = useCallback(() => {
    if (textInputRef.current?.maybeClosePopup()) {
      return
    } else if (
      thread.posts.some(
        post =>
          post.shortenedGraphemeLength > 0 ||
          post.embed.media ||
          post.embed.link,
      )
    ) {
      closeAllDialogs()
      Keyboard.dismiss()
      discardPromptControl.open()
    } else {
      onClose()
    }
  }, [thread, closeAllDialogs, discardPromptControl, onClose])

  useImperativeHandle(cancelRef, () => ({onPressCancel}))

  // On Android, pressing Back should ask confirmation.
  useEffect(() => {
    if (!IS_ANDROID) {
      return
    }
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (closeAllDialogs() || closeAllModals()) {
          return true
        }
        onPressCancel()
        return true
      },
    )
    return () => {
      backHandler.remove()
    }
  }, [onPressCancel, closeAllDialogs, closeAllModals])

  const missingAltError = (() => {
    if (!requireAltTextEnabled) {
      return
    }
    for (let i = 0; i < thread.posts.length; i++) {
      const media = thread.posts[i].embed.media
      if (media) {
        if (media.type === 'images' && media.images.some(img => !img.alt)) {
          return _(msg`One or more images is missing alt text.`)
        }
        if (media.type === 'gif' && !media.alt) {
          return _(msg`One or more GIFs is missing alt text.`)
        }
        if (
          media.type === 'video' &&
          media.video.status !== 'error' &&
          !media.video.altText
        ) {
          return _(msg`One or more videos is missing alt text.`)
        }
      }
    }
  })()

  const placeholderTagError = (() => {
    for (let i = 0; i < thread.posts.length; i++) {
      const text = thread.posts[i].richtext.text
      if (
        /(^|\s)\|\|#Policy($|\s)/i.test(text) ||
        /(^|\s)\|#Matter($|\s)/i.test(text)
      ) {
        return _(
          msg`Por favor, selecciona una insignia específica en lugar de usar etiquetas genéricas (#Policy / #Matter).`,
        )
      }
    }
    return undefined
  })()

  const canPost =
    !missingAltError &&
    !placeholderTagError &&
    thread.posts.every(
      post =>
        post.shortenedGraphemeLength <= MAX_GRAPHEME_LENGTH &&
        !isEmptyPost(post) &&
        !(
          post.embed.media?.type === 'video' &&
          post.embed.media.video.status === 'error'
        ),
    )

  const isComposerEmpty = useMemo(() => {
    return thread.posts.every(
      post =>
        post.richtext.text.trim().length === 0 &&
        !post.embed.media &&
        !post.embed.link &&
        !post.embed.quote,
    )
  }, [thread.posts])

  const onPressPublish = useCallback(async () => {
    if (isPublishing) {
      return
    }

    if (!canPost) {
      return
    }

    if (
      thread.posts.some(
        post =>
          post.embed.media?.type === 'video' &&
          post.embed.media.video.asset &&
          post.embed.media.video.status !== 'done',
      )
    ) {
      setPublishOnUpload(true)
      return
    }

    setError('')
    setIsPublishing(true)

    let postUri: string | undefined
    let postSuccessData: OnPostSuccessData
    try {
      logger.info(`composer: posting...`)

      const normalizedThread = {
        ...thread,
        posts: thread.posts.map((post, index) => {
          if (index !== 0) return post

          const normalizedText = syncComposerSpecialPostTypeText(
            post.richtext.text,
            classificationPost.postType,
          )
          if (normalizedText === post.richtext.text) {
            return post
          }

          const normalizedRichText = new RichText({text: normalizedText})
          normalizedRichText.detectFacetsWithoutResolution()

          return {
            ...post,
            richtext: normalizedRichText,
          }
        }),
      }

      // Derive party/community BEFORE post creation so they get stored
      // directly on the com.para.post record for backend indexing.
      const compassFeedFilters = classifyCompassFeedFilters(activeFilters)
      const derivedParty = affiliation
        ? canonicalizeCompassPartyFilter(affiliation)
        : compassFeedFilters.party
      const derivedCommunity =
        compassFeedFilters.community ||
        (activeFilters[0]
          ? canonicalizeCompassCommunityFilter(activeFilters[0])
          : undefined) ||
        (affiliation
          ? canonicalizeCompassCommunityFilter(affiliation)
          : undefined)

      postUri = (
        await apilib.post(
          agent,
          queryClient,
          {
            thread: normalizedThread,
            replyTo: replyTo?.uri,
            onStateChange: setPublishingStage,
            langs: currentLanguages,
            collection: apilib.PARA_POST_COLLECTION,
            party: derivedParty || undefined,
            community: derivedCommunity || undefined,
          },
          {
            highResolutionImages: ax.features.enabled(
              ax.features.ImageUploadsHighResolution,
            ),
          },
        )
      ).uris[0]

      // Sequential postMeta creation for Para posts (Section 7.1: client-side authority)
      const derivedPostType = derivePostTypeId(classificationPost)
      const adjustedFlairTags = selectedFlairs.map(flair =>
        applyOfficialToFlairTag(flair.tag, isOfficial),
      )
      if (
        postUri &&
        (adjustedFlairTags.length > 0 ||
          derivedPostType ||
          isOfficial ||
          derivedParty ||
          derivedCommunity)
      ) {
        try {
          const postRkey = new AtUri(postUri).rkey
          await agent.com.atproto.repo.createRecord({
            repo: agent.assertDid,
            collection: apilib.PARA_POST_META_COLLECTION,
            rkey: postRkey,
            record: {
              $type: apilib.PARA_POST_META_COLLECTION,
              post: postUri,
              postType: derivedPostType,
              official: isOfficial || undefined,
              party: derivedParty || undefined,
              community: derivedCommunity || undefined,
              category:
                derivedPostType === 'policy' || derivedPostType === 'matter'
                  ? 'governance'
                  : undefined,
              flairs: adjustedFlairTags.length ? adjustedFlairTags : undefined,
              voteScore: 0,
              createdAt: new Date().toISOString(),
            },
          })
          logger.info('composer: created postMeta record', {postUri, postRkey})
        } catch (metaErr) {
          // Non-fatal: the post itself was published successfully
          logger.error('composer: failed to create postMeta', {error: metaErr})
        }
      }

      /*
       * Wait for app view to have received the post(s). If this fails, it's
       * ok, because the post _was_ actually published above.
       */
      try {
        if (postUri) {
          logger.info(`composer: waiting for app view`)

          const posts = await retry(
            5,
            _e => true,
            async () => {
              const res = await agent.app.bsky.unspecced.getPostThreadV2({
                anchor: postUri!,
                above: false,
                below: normalizedThread.posts.length - 1,
                branchingFactor: 1,
              })
              if (res.data.thread.length !== normalizedThread.posts.length) {
                throw new Error(`composer: app view is not ready`)
              }
              if (
                !res.data.thread.every(p =>
                  AppBskyUnspeccedDefs.isThreadItemPost(p.value),
                )
              ) {
                throw new Error(`composer: app view returned non-post items`)
              }
              return res.data.thread
            },
            1e3,
          )
          postSuccessData = {
            replyToUri: replyTo?.uri,
            posts,
          }
        }
      } catch (waitErr: unknown) {
        logger.info(`composer: waiting for app view failed`, {
          safeMessage: waitErr,
        })
      }
    } catch (e) {
      logger.error(e as Error, {
        message: `Composer: create post failed`,
        hasImages: thread.posts.some(p => p.embed.media?.type === 'images'),
      })

      let err = cleanError(e instanceof Error ? e.message : String(e))
      if (
        e instanceof apilib.ReplyDeletedError ||
        err.includes('not locate record')
      ) {
        err = _(
          msg`We're sorry! The post you are replying to has been deleted.`,
        )
      } else if (e instanceof EmbeddingDisabledError) {
        err = _(msg`This post's author has disabled quote posts.`)
      }
      setError(err)
      setIsPublishing(false)
      return
    } finally {
      if (postUri) {
        let index = 0
        for (let post of thread.posts) {
          logEvent('post:create', {
            imageCount:
              post.embed.media?.type === 'images'
                ? post.embed.media.images.length
                : 0,
            isReply: index > 0 || !!replyTo,
            isPartOfThread: thread.posts.length > 1,
            hasLink: !!post.embed.link,
            hasQuote: !!post.embed.quote,
            langs: fromPostLanguages(currentLanguages),
            logContext: 'Composer',
          })
          index++
        }
      }
      if (thread.posts.length > 1) {
        logEvent('thread:create', {
          postCount: thread.posts.length,
          isReply: !!replyTo,
        })
      }
    }
    if (postUri && !replyTo) {
      emitPostCreated()
    }
    // Clean up draft and its media after successful publish
    if (composerState.draftId && composerState.originalLocalRefs) {
      // Fire draft:post metric
      if (loadedDraftCreatedAt) {
        const draftAgeMs = Date.now() - new Date(loadedDraftCreatedAt).getTime()
        ax.metric('draft:post', {
          draftAgeMs,
          wasEdited: composerState.isDirty,
        })
      }

      logger.debug('post published, cleaning up draft', {
        draftId: composerState.draftId,
        mediaFileCount: composerState.originalLocalRefs.size,
      })
      cleanupPublishedDraft({
        draftId: composerState.draftId,
        originalLocalRefs: composerState.originalLocalRefs,
      })
    }
    setLangPrefs.savePostLanguageToHistory()
    if (initQuote) {
      // We want to wait for the quote count to update before we call `onPost`, which will refetch data
      void whenAppViewReady(agent, initQuote.uri, res => {
        const anchor = res.data.thread.at(0)
        if (
          AppBskyUnspeccedDefs.isThreadItemPost(anchor?.value) &&
          anchor.value.post.quoteCount !== initQuote.quoteCount
        ) {
          onPost?.(postUri)
          onPostSuccess?.(postSuccessData)
          return true
        }
        return false
      })
    } else {
      onPost?.(postUri)
      onPostSuccess?.(postSuccessData)
    }
    onClose()
    setTimeout(() => {
      Toast.show(
        <Toast.Outer>
          <Toast.Icon />
          <Toast.Text>
            {thread.posts.length > 1
              ? _(msg`Your posts were sent`)
              : replyTo
                ? _(msg`Your reply was sent`)
                : _(msg`Your post was sent`)}
          </Toast.Text>
          {postUri && (
            <Toast.Action
              label={_(msg`View post`)}
              onPress={() => {
                const {host: name, rkey} = new AtUri(postUri)
                navigation.navigate('PostThread', {name, rkey})
              }}>
              <Trans context="Action to view the post the user just created">
                View
              </Trans>
            </Toast.Action>
          )}
        </Toast.Outer>,
        {type: 'success'},
      )
    }, 500)
  }, [
    _,
    agent,
    canPost,
    isPublishing,
    currentLanguages,
    onClose,
    onPost,
    onPostSuccess,
    initQuote,
    replyTo,
    setLangPrefs,
    queryClient,
    classificationPost,
    isOfficial,
    selectedFlairs,
    activeFilters,
    affiliation,
    composerState.draftId,
    composerState.originalLocalRefs,
    composerState.isDirty,
    cleanupPublishedDraft,
    loadedDraftCreatedAt,
    ax,
  ])

  // Preserves the referential identity passed to each post item.
  // Avoids re-rendering all posts on each keystroke.
  const onComposerPostPublish = useNonReactiveCallback(() => {
    onPressPublish()
  })

  useEffect(() => {
    if (publishOnUpload) {
      let erroredVideos = 0
      let uploadingVideos = 0
      for (let post of thread.posts) {
        if (post.embed.media?.type === 'video') {
          const video = post.embed.media.video
          if (video.status === 'error') {
            erroredVideos++
          } else if (video.status !== 'done') {
            uploadingVideos++
          }
        }
      }
      if (erroredVideos > 0) {
        setPublishOnUpload(false)
      } else if (uploadingVideos === 0) {
        setPublishOnUpload(false)
        if (!isPublishing && !error) {
          onPressPublish()
        }
      }
    }
  }, [thread.posts, onPressPublish, publishOnUpload, isPublishing, error])

  // TODO: It might make more sense to display this error per-post.
  // Right now we're just displaying the first one.
  let erroredVideoPostId: string | undefined
  let erroredVideo: VideoState | NoVideoState = NO_VIDEO
  for (let i = 0; i < thread.posts.length; i++) {
    const post = thread.posts[i]
    if (
      post.embed.media?.type === 'video' &&
      post.embed.media.video.status === 'error'
    ) {
      erroredVideoPostId = post.id
      erroredVideo = post.embed.media.video
      break
    }
  }

  const scrollViewRef = useAnimatedRef<Animated.ScrollView>()
  useEffect(() => {
    if (composerState.mutableNeedsFocusActive) {
      composerState.mutableNeedsFocusActive = false
      // On Android, this risks getting the cursor stuck behind the keyboard.
      // Not worth it.
      if (!IS_ANDROID) {
        textInputRef.current?.focus()
      }
    }
  }, [composerState])

  const isLastThreadedPost = thread.posts.length > 1 && nextPost === undefined
  const {
    scrollHandler,
    onScrollViewContentSizeChange,
    onScrollViewLayout,
    topBarAnimatedStyle,
    bottomBarAnimatedStyle,
  } = useScrollTracker({
    scrollViewRef,
    stickyBottom: isLastThreadedPost,
  })

  const keyboardVerticalOffset = useKeyboardVerticalOffset()

  const footer = (
    <>
      <SuggestedLanguage
        text={activePost.richtext.text}
        replyToLanguages={replyToLanguages}
        currentLanguages={currentLanguages}
        onAcceptSuggestedLanguage={setAcceptedLanguageSuggestion}
        onNudge={() => setLangDetectionNudgeAt(Date.now())}
      />
      <ComposerPills
        isReply={!!replyTo}
        activePost={activePost}
        thread={composerState.thread}
        dispatch={composerDispatch}
        bottomBarAnimatedStyle={bottomBarAnimatedStyle}
        selectedFlairs={selectedFlairs}
        setSelectedFlairs={setSelectedFlairs}
        isOfficial={isOfficial}
        setIsOfficial={setIsOfficial}
        postType={postType}
        setPostType={setPostType}
      />
      <ComposerFooter
        post={activePost}
        dispatch={dispatch}
        showAddButton={
          !isEmptyPost(activePost) && (!nextPost || !isEmptyPost(nextPost))
        }
        onError={setError}
        onSelectVideo={selectVideo}
        onAddPost={() => {
          composerDispatch({
            type: 'add_post',
          })
        }}
        currentLanguages={currentLanguages}
        onSelectLanguage={onSelectLanguage}
        openGallery={openGallery}
        textInputRef={textInputRef}
        nudgeAt={langDetectionNudgeAt}
      />
    </>
  )

  const isWebFooterSticky = !IS_NATIVE && thread.posts.length > 1
  return (
    <BottomSheetPortalProvider>
      <KeyboardAvoidingView
        testID="composePostView"
        behavior={IS_IOS ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={a.flex_1}>
        <View
          style={[a.flex_1, viewStyles]}
          aria-modal
          accessibilityViewIsModal>
          <ComposerTopBar
            canPost={canPost}
            isReply={!!replyTo}
            isPublishQueued={publishOnUpload}
            isPublishing={isPublishing}
            isThread={thread.posts.length > 1}
            publishingStage={publishingStage}
            topBarAnimatedStyle={topBarAnimatedStyle}
            onCancel={onPressCancel}
            onPublish={onPressPublish}
            draftsButton={
              <DraftsButton
                onSelectDraft={handleSelectDraft}
                onSaveDraft={handleSaveDraft}
                onDiscard={onClose}
                isEmpty={isComposerEmpty}
                isDirty={composerState.isDirty}
                isEditingDraft={!!composerState.draftId}
                textLength={thread.posts[0].richtext.text.length}
              />
            }>
            {missingAltError && <AltTextReminder error={missingAltError} />}
            {placeholderTagError && (
              <AltTextReminder error={placeholderTagError} />
            )}
            <ErrorBanner
              error={error}
              videoState={erroredVideo}
              clearError={() => setError('')}
              clearVideo={
                erroredVideoPostId
                  ? () => clearVideo(erroredVideoPostId)
                  : () => {}
              }
            />
          </ComposerTopBar>

          <Animated.ScrollView
            ref={scrollViewRef}
            layout={native(LinearTransition)}
            onScroll={scrollHandler}
            contentContainerStyle={a.flex_grow}
            style={a.flex_1}
            keyboardShouldPersistTaps="always"
            onContentSizeChange={onScrollViewContentSizeChange}
            onLayout={onScrollViewLayout}>
            {replyTo ? <ComposerReplyTo replyTo={replyTo} /> : undefined}
            {thread.posts.map((post, index) => (
              <Fragment key={post.id + (composerState.draftId ?? '')}>
                <ComposerPost
                  post={post}
                  dispatch={composerDispatch}
                  textInputRef={post.id === activePost.id ? textInputRef : null}
                  classificationPostId={classificationPost.id}
                  selectedFlairs={selectedFlairs}
                  postType={postType}
                  setSelectedFlairs={setSelectedFlairs}
                  setPostType={setPostType}
                  isFirstPost={index === 0}
                  isLastPost={index === thread.posts.length - 1}
                  isPartOfThread={thread.posts.length > 1}
                  isReply={index > 0 || !!replyTo}
                  isActive={post.id === activePost.id}
                  canRemovePost={thread.posts.length > 1}
                  canRemoveQuote={index > 0 || !initQuote}
                  onSelectVideo={selectVideo}
                  onClearVideo={clearVideo}
                  onPublish={onComposerPostPublish}
                  onError={setError}
                />
                {isWebFooterSticky && post.id === activePost.id && (
                  <View style={styles.stickyFooterWeb}>{footer}</View>
                )}
              </Fragment>
            ))}
          </Animated.ScrollView>
          {!isWebFooterSticky && footer}
        </View>

        {replyTo ? (
          <Prompt.Basic
            control={discardPromptControl}
            title={_(msg`Discard draft?`)}
            description=""
            confirmButtonCta={_(msg`Discard`)}
            confirmButtonColor="negative"
            onConfirm={handleDiscard}
          />
        ) : (
          <Prompt.Outer control={discardPromptControl}>
            <Prompt.Content>
              <Prompt.TitleText>
                {composerState.draftId ? (
                  <Trans>Save changes?</Trans>
                ) : (
                  <Trans>Save draft?</Trans>
                )}
              </Prompt.TitleText>
              <Prompt.DescriptionText>
                {composerState.draftId ? (
                  <Trans>
                    You have unsaved changes to this draft, would you like to
                    save them?
                  </Trans>
                ) : (
                  <Trans>
                    Would you like to save this as a draft to edit later?
                  </Trans>
                )}
              </Prompt.DescriptionText>
              <Prompt.Actions>
                <Prompt.Action
                  cta={
                    composerState.draftId
                      ? _(msg`Save changes`)
                      : _(msg`Save draft`)
                  }
                  onPress={handleSaveDraft}
                  color="primary"
                />
                <Prompt.Action
                  cta={_(msg`Discard`)}
                  onPress={handleDiscard}
                  color="negative_subtle"
                />
                <Prompt.Cancel />
              </Prompt.Actions>
            </Prompt.Content>
          </Prompt.Outer>
        )}
      </KeyboardAvoidingView>
    </BottomSheetPortalProvider>
  )
}

let ComposerPost = memo(function ComposerPost({
  post,
  dispatch,
  textInputRef,
  classificationPostId,
  selectedFlairs,
  postType,
  setSelectedFlairs,
  setPostType,
  isActive,
  isReply,
  isFirstPost,
  isLastPost,
  isPartOfThread,
  canRemovePost,
  canRemoveQuote,
  onClearVideo,
  onSelectVideo,
  onError,
  onPublish,
}: {
  post: PostDraft
  dispatch: (action: ComposerAction) => void
  textInputRef: React.RefObject<TextInputRef | null> | null
  classificationPostId: string
  selectedFlairs: ComposerFlair[]
  postType: PostType | null
  setSelectedFlairs: (flairs: ComposerFlair[]) => void
  setPostType: (postType: PostType | null) => void
  isActive: boolean
  isReply: boolean
  isFirstPost: boolean
  isLastPost: boolean
  isPartOfThread: boolean
  canRemovePost: boolean
  canRemoveQuote: boolean
  onClearVideo: (postId: string) => void
  onSelectVideo: (postId: string, asset: ImagePickerAsset) => void
  onError: (error: string) => void
  onPublish: (richtext: RichText) => void
}) {
  const {currentAccount} = useSession()
  const currentDid = currentAccount!.did
  const {_} = useLingui()
  const {data: currentProfile} = useProfileQuery({did: currentDid})
  const {isEnabled: isAnonymous} = useAnonymousMode()
  const t = useTheme()
  const richtext = post.richtext
  const isTextOnly = !post.embed.link && !post.embed.quote && !post.embed.media
  const forceMinHeight = IS_WEB && isTextOnly && isActive
  const selectTextInputPlaceholder = isReply
    ? isFirstPost
      ? _(msg`Write your reply`)
      : _(msg`Add another post`)
    : _(msg`What's up?`)
  const discardPromptControl = Prompt.usePromptControl()

  const dispatchPost = useCallback(
    (action: PostAction) => {
      dispatch({
        type: 'update_post',
        postId: post.id,
        postAction: action,
      })
    },
    [dispatch, post.id],
  )

  const onImageAdd = useCallback(
    (next: ComposerImage[]) => {
      dispatchPost({
        type: 'embed_add_images',
        images: next,
      })
    },
    [dispatchPost],
  )

  const onNewLink = useCallback(
    (uri: string) => {
      dispatchPost({type: 'embed_add_uri', uri})
    },
    [dispatchPost],
  )

  const onPhotoPasted = useCallback(
    async (uri: string) => {
      if (
        uri.startsWith('data:video/') ||
        (IS_WEB && uri.startsWith('data:image/gif'))
      ) {
        if (IS_NATIVE) return // web only
        const [mimeType] = uri.slice('data:'.length).split(';')
        if (!SUPPORTED_MIME_TYPES.includes(mimeType as SupportedMimeTypes)) {
          Toast.show(_(msg`Unsupported video type: ${mimeType}`), {
            type: 'error',
          })
          return
        }
        const name = `pasted.${mimeToExt(mimeType)}`
        const file = await fetch(uri)
          .then(res => res.blob())
          .then(blob => new File([blob], name, {type: mimeType}))
        onSelectVideo(post.id, await getVideoMetadata(file))
      } else {
        const res = await pasteImage(uri)
        onImageAdd([res])
      }
    },
    [post.id, onSelectVideo, onImageAdd, _],
  )

  useHideKeyboardOnBackground()

  return (
    <View
      style={[
        a.mx_lg,
        a.mb_sm,
        !isActive && isLastPost && a.mb_lg,
        !isActive && styles.inactivePost,
        isTextOnly && IS_NATIVE && a.flex_grow,
      ]}>
      <View style={[a.flex_row, IS_NATIVE && a.flex_1]}>
        <View style={[a.align_center, a.mt_xs]}>
          <UserAvatar
            avatar={currentProfile?.avatar}
            size={42}
            type={currentProfile?.associated?.labeler ? 'labeler' : 'user'}
          />
          {isAnonymous && (
            <View
              style={[
                a.mt_2xs,
                a.rounded_md,
                a.px_xs,
                a.py_2xs,
                {backgroundColor: t.palette.primary_500},
              ]}>
              <Text style={[a.text_2xs, {color: t.palette.white}]}>
                <Trans>Anónimo · Verificado</Trans>
              </Text>
            </View>
          )}
        </View>
        <ComposerTextInput
          ref={textInputRef}
          style={[a.pt_xs]}
          richtext={richtext}
          placeholder={selectTextInputPlaceholder}
          autoFocus={isLastPost}
          webForceMinHeight={forceMinHeight}
          // To avoid overlap with the close button:
          hasRightPadding={isPartOfThread}
          isActive={isActive}
          civicAutocompleteEnabled={post.id === classificationPostId}
          selectedFlairs={selectedFlairs}
          postType={postType}
          setRichText={(rt: RichText) => {
            dispatchPost({type: 'update_richtext', richtext: rt})
          }}
          setSelectedFlairs={setSelectedFlairs}
          setPostType={setPostType}
          onFocus={() => {
            dispatch({
              type: 'focus_post',
              postId: post.id,
            })
          }}
          onPhotoPasted={onPhotoPasted}
          onNewLink={onNewLink}
          onError={onError}
          onPressPublish={onPublish}
          accessible={true}
          accessibilityLabel={_(msg`Write post`)}
          accessibilityHint={_(
            msg`Compose posts up to ${plural(MAX_GRAPHEME_LENGTH || 0, {
              other: '# characters',
            })} in length`,
          )}
        />
      </View>

      {canRemovePost && isActive && (
        <>
          <Button
            label={_(msg`Delete post`)}
            size="small"
            color="secondary"
            variant="ghost"
            shape="round"
            style={[a.absolute, {top: 0, right: 0}]}
            onPress={() => {
              if (
                post.shortenedGraphemeLength > 0 ||
                post.embed.media ||
                post.embed.link ||
                post.embed.quote
              ) {
                discardPromptControl.open()
              } else {
                dispatch({
                  type: 'remove_post',
                  postId: post.id,
                })
              }
            }}>
            <ButtonIcon icon={XIcon} />
          </Button>
          <Prompt.Basic
            control={discardPromptControl}
            title={_(msg`Discard post?`)}
            description={_(msg`Are you sure you'd like to discard this post?`)}
            onConfirm={() => {
              dispatch({
                type: 'remove_post',
                postId: post.id,
              })
            }}
            confirmButtonCta={_(msg`Discard`)}
            confirmButtonColor="negative"
          />
        </>
      )}

      <ComposerEmbeds
        canRemoveQuote={canRemoveQuote}
        embed={post.embed}
        dispatch={dispatchPost}
        clearVideo={() => onClearVideo(post.id)}
        isActivePost={isActive}
      />
    </View>
  )
})

function ComposerTopBar({
  canPost,
  isReply,
  isPublishQueued,
  isPublishing,
  isThread,
  publishingStage,
  onCancel,
  onPublish,
  topBarAnimatedStyle,
  children,
  draftsButton,
}: {
  isPublishing: boolean
  publishingStage: string
  canPost: boolean
  isReply: boolean
  isPublishQueued: boolean
  isThread: boolean
  onCancel: () => void
  onPublish: () => void
  topBarAnimatedStyle: StyleProp<ViewStyle>
  children?: ReactNode
  draftsButton?: ReactNode
}) {
  const pal = usePalette('default')
  const t = useTheme()
  const {_} = useLingui()
  return (
    <Animated.View
      style={topBarAnimatedStyle}
      layout={native(LinearTransition)}>
      <View
        style={[
          a.flex_row,
          a.align_center,
          a.gap_xs,
          IS_LIQUID_GLASS ? [a.px_lg, a.pt_lg, a.pb_md] : [a.p_sm],
        ]}>
        <Button
          label={_(msg`Cancel`)}
          variant="ghost"
          color="primary"
          shape="default"
          size="small"
          style={[a.rounded_full, a.py_sm, {paddingLeft: 7, paddingRight: 7}]}
          onPress={onCancel}
          accessibilityHint={_(
            msg`Closes post composer and discards post draft`,
          )}>
          <ButtonText style={[a.text_md]} maxFontSizeMultiplier={2}>
            <Trans>Cancel</Trans>
          </ButtonText>
        </Button>
        {draftsButton}
        <View style={a.flex_1} />
        {isPublishing ? (
          <>
            <Text style={pal.textLight}>{publishingStage}</Text>
            <View style={styles.postBtn}>
              <ActivityIndicator />
            </View>
          </>
        ) : (
          <Button
            testID="composerPublishBtn"
            label={
              isReply
                ? isThread
                  ? _(
                      msg({
                        message: 'Publish replies',
                        comment:
                          'Accessibility label for button to publish multiple replies in a thread',
                      }),
                    )
                  : _(
                      msg({
                        message: 'Publish reply',
                        comment:
                          'Accessibility label for button to publish a single reply',
                      }),
                    )
                : isThread
                  ? _(
                      msg({
                        message: 'Publish posts',
                        comment:
                          'Accessibility label for button to publish multiple posts in a thread',
                      }),
                    )
                  : _(
                      msg({
                        message: 'Publish post',
                        comment:
                          'Accessibility label for button to publish a single post',
                      }),
                    )
            }
            variant="solid"
            color="primary"
            shape="default"
            size="small"
            style={[
              a.rounded_full,
              a.py_sm,
              {backgroundColor: t.palette.primary_500},
            ]}
            hoverStyle={{backgroundColor: t.palette.primary_600}}
            onPress={onPublish}
            disabled={!canPost || isPublishQueued}>
            <ButtonText style={[a.text_md]} maxFontSizeMultiplier={2}>
              {isReply ? (
                <Trans context="action">Reply</Trans>
              ) : isThread ? (
                <Trans context="action">Post All</Trans>
              ) : (
                <Trans context="action">Post</Trans>
              )}
            </ButtonText>
          </Button>
        )}
      </View>
      {children}
    </Animated.View>
  )
}

function AltTextReminder({error}: {error: string}) {
  const pal = usePalette('default')
  return (
    <View style={[styles.reminderLine, pal.viewLight]}>
      <View style={styles.errorIcon}>
        <Text style={styles.errorIconText}>!</Text>
      </View>
      <Text style={[pal.text, a.flex_1]}>{error}</Text>
    </View>
  )
}

function ComposerEmbeds({
  embed,
  dispatch,
  clearVideo,
  canRemoveQuote,
  isActivePost,
}: {
  embed: EmbedDraft
  dispatch: (action: PostAction) => void
  clearVideo: () => void
  canRemoveQuote: boolean
  isActivePost: boolean
}) {
  const video = embed.media?.type === 'video' ? embed.media.video : null
  return (
    <>
      {embed.media?.type === 'images' && (
        <Gallery images={embed.media.images} dispatch={dispatch} />
      )}

      {embed.media?.type === 'gif' && (
        <View style={[a.relative, a.mt_lg]} key={embed.media.gif.url}>
          <ExternalEmbedGif
            gif={embed.media.gif}
            onRemove={() => dispatch({type: 'embed_remove_gif'})}
          />
          <GifAltTextDialog
            gif={embed.media.gif}
            altText={embed.media.alt ?? ''}
            onSubmit={(altText: string) => {
              dispatch({type: 'embed_update_gif', alt: altText})
            }}
          />
        </View>
      )}

      {!embed.media && embed.link && (
        <View style={[a.relative, a.mt_lg]} key={embed.link.uri}>
          <ExternalEmbedLink
            uri={embed.link.uri}
            hasQuote={!!embed.quote}
            onRemove={() => dispatch({type: 'embed_remove_link'})}
          />
        </View>
      )}

      <LayoutAnimationConfig skipExiting>
        {video && (
          <Animated.View
            style={[a.w_full, a.mt_lg]}
            entering={native(ZoomIn)}
            exiting={native(ZoomOut)}>
            {video.asset &&
              (video.status === 'compressing' ? (
                <VideoTranscodeProgress
                  asset={video.asset}
                  progress={video.progress}
                  clear={clearVideo}
                />
              ) : video.video ? (
                <VideoPreview
                  asset={video.asset}
                  video={video.video}
                  isActivePost={isActivePost}
                  clear={clearVideo}
                />
              ) : null)}
            <SubtitleDialogBtn
              defaultAltText={video.altText}
              saveAltText={altText =>
                dispatch({
                  type: 'embed_update_video',
                  videoAction: {
                    type: 'update_alt_text',
                    altText,
                    signal: video.abortController.signal,
                  },
                })
              }
              captions={video.captions}
              setCaptions={updater => {
                dispatch({
                  type: 'embed_update_video',
                  videoAction: {
                    type: 'update_captions',
                    updater,
                    signal: video.abortController.signal,
                  },
                })
              }}
            />
          </Animated.View>
        )}
      </LayoutAnimationConfig>
      {embed.quote?.uri ? (
        <View
          style={[a.pb_sm, video ? [a.pt_md] : [a.pt_xl], IS_WEB && [a.pb_md]]}>
          <View style={[a.relative]}>
            <View style={{pointerEvents: 'none'}}>
              <LazyQuoteEmbed uri={embed.quote.uri} />
            </View>
            {canRemoveQuote && (
              <ExternalEmbedRemoveBtn
                onRemove={() => dispatch({type: 'embed_remove_quote'})}
                style={{top: 16}}
              />
            )}
          </View>
        </View>
      ) : null}
    </>
  )
}

function ComposerPills({
  isReply,
  thread,
  activePost,
  dispatch,
  bottomBarAnimatedStyle,
  selectedFlairs,
  setSelectedFlairs,
  isOfficial,
  setIsOfficial,
  postType,
  setPostType,
}: {
  isReply: boolean
  thread: ThreadDraft
  activePost: PostDraft
  dispatch: (action: ComposerAction) => void
  bottomBarAnimatedStyle: StyleProp<ViewStyle>
  selectedFlairs: ComposerFlair[]
  setSelectedFlairs: (flairs: ComposerFlair[]) => void
  isOfficial: boolean
  setIsOfficial: (val: boolean) => void
  postType: PostType | null
  setPostType: (type: PostType | null) => void
}) {
  const t = useTheme()
  const {_} = useLingui()

  const scrollRef = useRef<ScrollView>(null)
  const [scrollState, setScrollState] = useState({left: false, right: false})

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      // @ts-ignore
      const node = scrollRef.current.getScrollableNode()
      if (node) {
        setScrollState({
          left: node.scrollLeft > 1,
          right: node.scrollLeft + node.offsetWidth < node.scrollWidth - 1,
        })
      }
    }
  }, [scrollRef])

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (IS_WEB) {
        checkScroll()
        return
      }
      const {contentOffset, contentSize, layoutMeasurement} = e.nativeEvent
      setScrollState({
        left: contentOffset.x > 1,
        right:
          contentOffset.x + layoutMeasurement.width < contentSize.width - 1,
      })
    },
    [checkScroll],
  )

  const scroll = useCallback(
    (direction: 'left' | 'right') => {
      if (scrollRef.current) {
        // @ts-ignore
        const node = scrollRef.current.getScrollableNode()
        if (node) {
          const amount = direction === 'left' ? -200 : 200
          node.scrollBy({left: amount, behavior: 'smooth'})
        }
      }
    },
    [scrollRef],
  )

  const media = activePost.embed.media
  const hasMedia = media?.type === 'images' || media?.type === 'video'
  const hasLink = !!activePost.embed.link
  const hasFlair = selectedFlairs.length > 0

  if (isReply && !hasMedia && !hasLink && !hasFlair) {
    return null
  }

  return (
    <Animated.View style={[t.atoms.bg, bottomBarAnimatedStyle, a.pb_lg]}>
      <View style={[a.flex_row, a.p_sm, a.relative, a.align_center]}>
        {IS_WEB && scrollState.left && (
          <Button
            label={_(msg`Scroll left`)}
            size="tiny"
            variant="ghost"
            shape="round"
            color="secondary"
            onPress={() => scroll('left')}
            style={[
              a.absolute,
              {left: 0, zIndex: 1, backgroundColor: t.palette.contrast_50},
            ]}>
            <ButtonIcon icon={ChevronLeftIcon} />
          </Button>
        )}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[a.gap_sm]}
          horizontal={true}
          bounces={false}
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          onContentSizeChange={checkScroll}
          onLayout={checkScroll}
          scrollEventThrottle={16}>
          {isReply ? null : (
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
              style={bottomBarAnimatedStyle}
            />
          )}
          {hasMedia || hasLink ? (
            <LabelsBtn
              labels={activePost.labels}
              onChange={nextLabels => {
                dispatch({
                  type: 'update_post',
                  postId: activePost.id,
                  postAction: {
                    type: 'update_labels',
                    labels: nextLabels,
                  },
                })
              }}
            />
          ) : null}

          {/* Advanced Flair & Verification Buttons (Split + Post Type) */}
          {!isReply && (
            <>
              {/* Post Type (Meme, RAQ, etc.) */}
              <PostTypeBtn postType={postType} setPostType={setPostType} />

              {/* official status toggle */}
              <Pressable
                onPress={() => setIsOfficial(!isOfficial)}
                accessibilityRole="button"
                accessibilityLabel={_(msg`Toggle official status`)}
                accessibilityHint={_(
                  msg`Toggles whether this post is official`,
                )}
                style={({pressed}) => [
                  a.flex_row,
                  a.align_center,
                  a.gap_xs,
                  {opacity: pressed ? 0.8 : 1},
                ]}>
                {/* Circle Icon */}
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: isOfficial
                      ? t.palette.primary_500
                      : t.palette.contrast_300,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                  <VerifiedIcon style={{color: 'white'}} size="sm" />
                </View>

                {/* Selection Pill */}
                {isOfficial && (
                  <View
                    style={[
                      a.px_sm,
                      a.py_xs,
                      a.rounded_full,
                      {
                        backgroundColor: t.palette.primary_500,
                        height: 34,
                        justifyContent: 'center',
                        minWidth: 50,
                      },
                    ]}>
                    <Text style={[a.font_bold, {color: 'white', fontSize: 13}]}>
                      <Trans>Official</Trans>
                    </Text>
                  </View>
                )}
              </Pressable>

              {/* Policy (Official/High Level) */}
              <FlairBtn
                selectedFlairs={selectedFlairs}
                setSelectedFlairs={setSelectedFlairs}
                mode="policy"
              />
              {/* Matter (Topic/Low Level) */}
              <FlairBtn
                selectedFlairs={selectedFlairs}
                setSelectedFlairs={setSelectedFlairs}
                mode="matter"
              />
            </>
          )}

          {/* Remove old separate toggles and lists */}
        </ScrollView>
        {IS_WEB && scrollState.right && (
          <Button
            label={_(msg`Scroll right`)}
            size="tiny"
            variant="ghost"
            shape="round"
            color="secondary"
            onPress={() => scroll('right')}
            style={[
              a.absolute,
              {right: 0, zIndex: 1, backgroundColor: t.palette.contrast_50},
            ]}>
            <ButtonIcon icon={ChevronRightIcon} />
          </Button>
        )}
      </View>
    </Animated.View>
  )
}

function ComposerFooter({
  post,
  dispatch,
  showAddButton,
  onSelectVideo,
  onAddPost,
  currentLanguages,
  onSelectLanguage,
  openGallery,
  textInputRef,
  nudgeAt,
}: {
  post: PostDraft
  dispatch: (action: PostAction) => void
  showAddButton: boolean
  onError: (error: string) => void
  onSelectVideo: (postId: string, asset: ImagePickerAsset) => void
  onAddPost: () => void
  currentLanguages: string[]
  onSelectLanguage?: (language: string) => void
  openGallery?: boolean
  textInputRef: React.RefObject<TextInputRef | null>
  nudgeAt: number
}) {
  const [shouldOpenGallery, setShouldOpenGallery] = useState(false)

  useEffect(() => {
    if (openGallery) {
      setShouldOpenGallery(true)
      const timer = setTimeout(() => setShouldOpenGallery(false), 100)
      return () => clearTimeout(timer)
    }
  }, [openGallery])

  const t = useTheme()
  const {_} = useLingui()

  const {gtPhone} = useBreakpoints()
  /*
   * Once we've allowed a certain type of asset to be selected, we don't allow
   * other types of media to be selected.
   */
  const [selectedAssetsType, setSelectedAssetsType] = useState<
    AssetType | undefined
  >(undefined)

  const media = post.embed.media
  const images = media?.type === 'images' ? media.images : []
  const video = media?.type === 'video' ? media.video : null
  const isMaxImages = images.length >= MAX_IMAGES
  const isMaxVideos = !!video

  let selectedAssetsCount = 0
  let isMediaSelectionDisabled = false

  if (media?.type === 'images') {
    isMediaSelectionDisabled = isMaxImages
    selectedAssetsCount = images.length
  } else if (media?.type === 'video') {
    isMediaSelectionDisabled = isMaxVideos
    selectedAssetsCount = 1
  } else {
    isMediaSelectionDisabled = !!media
  }

  const onImageAdd = useCallback(
    (next: ComposerImage[]) => {
      dispatch({
        type: 'embed_add_images',
        images: next,
      })
    },
    [dispatch],
  )

  const onSelectGif = useCallback(
    (gif: Gif) => {
      dispatch({type: 'embed_add_gif', gif})
    },
    [dispatch],
  )

  /*
   * Reset if the user clears any selected media
   */
  if (selectedAssetsType !== undefined && !media) {
    setSelectedAssetsType(undefined)
  }

  const onSelectAssets = useCallback<SelectMediaButtonProps['onSelectAssets']>(
    async ({type, assets, errors}) => {
      setSelectedAssetsType(type)

      if (assets.length) {
        if (type === 'image') {
          const imagesToAdd: ComposerImage[] = []

          await Promise.all(
            assets.map(async image => {
              const composerImage = await createComposerImage({
                path: image.uri,
                width: image.width,
                height: image.height,
                mime: image.mimeType!,
              })
              imagesToAdd.push(composerImage)
            }),
          ).catch(e => {
            logger.error(`createComposerImage failed`, {
              safeMessage: e.message,
            })
          })

          onImageAdd(imagesToAdd)
        } else if (type === 'video') {
          onSelectVideo(post.id, assets[0])
        } else if (type === 'gif') {
          onSelectVideo(post.id, assets[0])
        }
      }

      errors.map(error => {
        Toast.show(error, {
          type: 'warning',
        })
      })
    },
    [post.id, onSelectVideo, onImageAdd],
  )

  return (
    <View
      style={[
        a.flex_row,
        a.py_xs,
        {paddingLeft: 7, paddingRight: 16},
        a.align_center,
        a.border_t,
        t.atoms.bg,
        t.atoms.border_contrast_medium,
        a.justify_between,
      ]}>
      <View style={[a.flex_row, a.align_center]}>
        <LayoutAnimationConfig skipEntering skipExiting>
          {video && video.status !== 'done' ? (
            <VideoUploadToolbar state={video} />
          ) : (
            <ToolbarWrapper style={[a.flex_row, a.align_center, a.gap_xs]}>
              <SelectMediaButton
                disabled={isMediaSelectionDisabled}
                allowedAssetTypes={selectedAssetsType}
                selectedAssetsCount={selectedAssetsCount}
                onSelectAssets={onSelectAssets}
                autoOpen={shouldOpenGallery}
              />
              <OpenCameraBtn
                disabled={media?.type === 'images' ? isMaxImages : !!media}
                onAdd={onImageAdd}
              />
              <SelectGifBtn onSelectGif={onSelectGif} disabled={!!media} />
              {IS_WEB && gtPhone ? (
                <EmojiPicker.Root nextFocusRef={textInputRef}>
                  <EmojiPicker.Trigger label={_(msg`Open emoji picker`)}>
                    {({props}) => (
                      <Button
                        style={a.p_sm}
                        label={props.accessibilityLabel}
                        variant="ghost"
                        shape="round"
                        color="primary"
                        {...props}>
                        <EmojiSmileIcon size="lg" />
                      </Button>
                    )}
                  </EmojiPicker.Trigger>
                  <EmojiPicker.Picker />
                </EmojiPicker.Root>
              ) : null}
            </ToolbarWrapper>
          )}
        </LayoutAnimationConfig>
      </View>
      <View style={[a.flex_row, a.align_center, a.justify_between]}>
        {showAddButton && (
          <Button
            label={_(msg`Add another post to thread`)}
            onPress={onAddPost}
            style={[a.p_sm]}
            variant="ghost"
            shape="round"
            color="primary">
            <PlusIcon size="lg" />
          </Button>
        )}
        <PostLanguageSelect
          currentLanguages={currentLanguages}
          onSelectLanguage={onSelectLanguage}
          nudgeAt={nudgeAt}
        />
        <CharProgress
          count={post.shortenedGraphemeLength}
          style={{width: 65}}
        />
      </View>
    </View>
  )
}

export function useComposerCancelRef() {
  return useRef<CancelRef>(null)
}

function useScrollTracker({
  scrollViewRef,
  stickyBottom,
}: {
  scrollViewRef: AnimatedRef<Animated.ScrollView>
  stickyBottom: boolean
}) {
  const t = useTheme()
  const contentOffset = useSharedValue(0)
  const scrollViewHeight = useSharedValue(Infinity)
  const contentHeight = useSharedValue(0)

  const hasScrolledToTop = useDerivedValue(() =>
    withTiming(contentOffset.get() === 0 ? 1 : 0),
  )

  const hasScrolledToBottom = useDerivedValue(() =>
    withTiming(
      contentHeight.get() - contentOffset.get() - 5 <= scrollViewHeight.get()
        ? 1
        : 0,
    ),
  )

  const showHideBottomBorder = useCallback(
    ({
      newContentHeight,
      newContentOffset,
      newScrollViewHeight,
    }: {
      newContentHeight?: number
      newContentOffset?: number
      newScrollViewHeight?: number
    }) => {
      'worklet'
      if (typeof newContentHeight === 'number')
        contentHeight.set(Math.floor(newContentHeight))
      if (typeof newContentOffset === 'number')
        contentOffset.set(Math.floor(newContentOffset))
      if (typeof newScrollViewHeight === 'number')
        scrollViewHeight.set(Math.floor(newScrollViewHeight))
    },
    [contentHeight, contentOffset, scrollViewHeight],
  )

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      'worklet'
      showHideBottomBorder({
        newContentOffset: event.contentOffset.y,
        newContentHeight: event.contentSize.height,
        newScrollViewHeight: event.layoutMeasurement.height,
      })
    },
  })

  const onScrollViewContentSizeChangeUIThread = useCallback(
    (newContentHeight: number) => {
      'worklet'
      const oldContentHeight = contentHeight.get()
      let shouldScrollToBottom = false
      if (stickyBottom && newContentHeight > oldContentHeight) {
        const isFairlyCloseToBottom =
          oldContentHeight - contentOffset.get() - 100 <= scrollViewHeight.get()
        if (isFairlyCloseToBottom) {
          shouldScrollToBottom = true
        }
      }
      showHideBottomBorder({newContentHeight})
      if (shouldScrollToBottom) {
        scrollTo(scrollViewRef, 0, newContentHeight, true)
      }
    },
    [
      showHideBottomBorder,
      scrollViewRef,
      contentHeight,
      stickyBottom,
      contentOffset,
      scrollViewHeight,
    ],
  )

  const onScrollViewContentSizeChange = useCallback(
    (_width: number, height: number) => {
      runOnUI(onScrollViewContentSizeChangeUIThread)(height)
    },
    [onScrollViewContentSizeChangeUIThread],
  )

  const onScrollViewLayout = useCallback(
    (evt: LayoutChangeEvent) => {
      showHideBottomBorder({
        newScrollViewHeight: evt.nativeEvent.layout.height,
      })
    },
    [showHideBottomBorder],
  )

  const topBarAnimatedStyle = useAnimatedStyle(() => {
    return {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: interpolateColor(
        hasScrolledToTop.get(),
        [0, 1],
        [t.atoms.border_contrast_medium.borderColor, 'transparent'],
      ),
    }
  })
  const bottomBarAnimatedStyle = useAnimatedStyle(() => {
    return {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: interpolateColor(
        hasScrolledToBottom.get(),
        [0, 1],
        [t.atoms.border_contrast_medium.borderColor, 'transparent'],
      ),
    }
  })

  return {
    scrollHandler,
    onScrollViewContentSizeChange,
    onScrollViewLayout,
    topBarAnimatedStyle,
    bottomBarAnimatedStyle,
  }
}

function useKeyboardVerticalOffset() {
  const {top, bottom} = useSafeAreaInsets()

  // Android etc
  if (!IS_IOS) {
    // need to account for the edge-to-edge nav bar
    return bottom * -1
  }

  if (IS_LIQUID_GLASS) {
    return top
  }

  // iPhone SE
  if (top === 20) return 40

  // all other iPhones on <26
  return top + 10
}

async function whenAppViewReady(
  agent: BskyAgent,
  uri: string,
  fn: (res: AppBskyUnspeccedGetPostThreadV2.Response) => boolean,
) {
  await until(
    5, // 5 tries
    1e3, // 1s delay between tries
    fn,
    () =>
      agent.app.bsky.unspecced.getPostThreadV2({
        anchor: uri,
        above: false,
        below: 0,
        branchingFactor: 0,
      }),
  )
}

function isEmptyPost(post: PostDraft) {
  return (
    post.richtext.text.trim().length === 0 &&
    !post.embed.media &&
    !post.embed.link &&
    !post.embed.quote
  )
}

function useHideKeyboardOnBackground() {
  const appState = useAppState()

  useEffect(() => {
    if (IS_IOS) {
      if (appState === 'inactive') {
        Keyboard.dismiss()
      }
    }
  }, [appState])
}

const styles = StyleSheet.create({
  postBtn: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 6,
    marginLeft: 12,
  },
  stickyFooterWeb: web({
    position: 'sticky',
    bottom: 0,
  }),
  errorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.red1,
    borderRadius: 6,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  reminderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  errorIcon: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.red4,
    borderRadius: 30,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  errorIconText: {
    color: colors.red4,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  inactivePost: {
    opacity: 0.5,
  },
  addExtLinkBtn: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 10,
    marginBottom: 4,
  },
})

function ErrorBanner({
  error: standardError,
  videoState,
  clearError,
  clearVideo,
}: {
  error: string
  videoState: VideoState | NoVideoState
  clearError: () => void
  clearVideo: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()

  const videoError =
    videoState.status === 'error' ? videoState.error : undefined
  const error = standardError || videoError

  const onClearError = () => {
    if (standardError) {
      clearError()
    } else {
      clearVideo()
    }
  }

  if (!error) return null

  return (
    <Animated.View
      style={[a.px_lg, a.pb_sm]}
      entering={FadeIn}
      exiting={FadeOut}>
      <View
        style={[
          a.px_md,
          a.py_sm,
          a.gap_xs,
          a.rounded_sm,
          t.atoms.bg_contrast_25,
        ]}>
        <View style={[a.relative, a.flex_row, a.gap_sm, {paddingRight: 48}]}>
          <CircleInfoIcon fill={t.palette.negative_400} />
          <NewText style={[a.flex_1, a.leading_snug, {paddingTop: 1}]}>
            {error}
          </NewText>
          <Button
            label={_(msg`Dismiss error`)}
            size="tiny"
            color="secondary"
            variant="ghost"
            shape="round"
            style={[a.absolute, {top: 0, right: 0}]}
            onPress={onClearError}>
            <ButtonIcon icon={XIcon} />
          </Button>
        </View>
        {videoError && videoState.jobId && (
          <NewText
            style={[
              {paddingLeft: 28},
              a.text_xs,
              a.font_semi_bold,
              a.leading_snug,
              t.atoms.text_contrast_low,
            ]}>
            <Trans>Job ID: {videoState.jobId}</Trans>
          </NewText>
        )}
      </View>
    </Animated.View>
  )
}

function ToolbarWrapper({
  style,
  children,
}: {
  style: StyleProp<ViewStyle>
  children: ReactNode
}) {
  if (IS_WEB) return children
  return (
    <Animated.View
      style={style}
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(400)}>
      {children}
    </Animated.View>
  )
}

function VideoUploadToolbar({state}: {state: VideoState}) {
  const t = useTheme()
  const {_} = useLingui()
  const progress = state.progress
  const shouldRotate =
    state.status === 'processing' && (progress === 0 || progress === 1)
  let wheelProgress = shouldRotate ? 0.33 : progress

  const rotate = useDerivedValue(() => {
    if (shouldRotate) {
      return withRepeat(
        withTiming(360, {
          duration: 2500,
          easing: Easing.out(Easing.cubic),
        }),
        -1,
      )
    }
    return 0
  })

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{rotateZ: `${rotate.get()}deg`}],
    }
  })

  let text = ''

  switch (state.status) {
    case 'compressing':
      text = _(msg`Compressing video...`)
      break
    case 'uploading':
      text =
        state.video.mimeType === 'image/gif'
          ? _(msg`Uploading GIF...`)
          : _(msg`Uploading video...`)
      break
    case 'processing':
      text = _(msg`Processing video...`)
      break
    case 'error':
      text = _(msg`Error`)
      wheelProgress = 100
      break
    case 'done':
      text = _(msg`Video uploaded`)
      break
  }

  return (
    <ToolbarWrapper style={[a.flex_row, a.align_center, {paddingVertical: 5}]}>
      <Animated.View style={[animatedStyle]}>
        <ProgressCircle
          size={30}
          borderWidth={1}
          borderColor={t.atoms.border_contrast_low.borderColor}
          color={
            state.status === 'error'
              ? t.palette.negative_500
              : t.palette.primary_500
          }
          progress={wheelProgress}
        />
      </Animated.View>
      <NewText style={[a.font_semi_bold, a.ml_sm]}>{text}</NewText>
    </ToolbarWrapper>
  )
}
