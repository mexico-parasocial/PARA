import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {StyleSheet} from 'react-native'
import {withSpring} from 'react-native-reanimated'
import {SafeAreaView} from 'react-native-safe-area-context'
import {
  type AppBskyActorDefs,
  moderateProfile,
  type ModerationOpts,
  RichText as RichTextAPI,
} from '@atproto/api'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {useFocusEffect} from '@react-navigation/native'
import {useQueryClient} from '@tanstack/react-query'

import {fetchParaIdentity} from '#/lib/api/para-identity'
import {type ParaIdentityRecord} from '#/lib/api/para-lexicons'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {usePajareoEnabled} from '#/lib/hooks/usePajareoEnabled'
import {useSetTitle} from '#/lib/hooks/useSetTitle'
import {findRepresentativeByActor} from '#/lib/representatives/participation'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {combinedDisplayName} from '#/lib/strings/display-names'
import {cleanError} from '#/lib/strings/errors'
import {isInvalidHandle} from '#/lib/strings/handles'
import {colors} from '#/lib/styles'
import {useProfileShadow} from '#/state/cache/profile-shadow'
import {listenSoftReset} from '#/state/events'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {useLabelerInfoQuery} from '#/state/queries/labeler'
import {resetProfilePostsQueries} from '#/state/queries/post-feed'
import {useProfileQuery} from '#/state/queries/profile'
import {useResolveDidQuery} from '#/state/queries/resolve-uri'
import {useAgent, useSession} from '#/state/session'
import {useMinimalShellMode} from '#/state/shell'
import {ProfileFeedgens} from '#/view/com/feeds/ProfileFeedgens'
import {ProfileLists} from '#/view/com/lists/ProfileLists'
import {PagerWithHeader} from '#/view/com/pager/PagerWithHeader'
import {ErrorScreen} from '#/view/com/util/error/ErrorScreen'
import {FAB} from '#/view/com/util/fab/FAB'
import {type ListRef} from '#/view/com/util/List'
import {ProfileHeader, ProfileHeaderLoading} from '#/screens/Profile/Header'
import {ProfileFeedSection} from '#/screens/Profile/Sections/Feed'
import {ProfileHighlightsSection} from '#/screens/Profile/Sections/Highlights'
import {ProfileLabelsSection} from '#/screens/Profile/Sections/Labels'
import {ProfilePajareoSection} from '#/screens/Profile/Sections/Pajareo'
import {ProfileRAQSection} from '#/screens/Profile/Sections/RAQ'
import {ProfileVotesSection} from '#/screens/Profile/Sections/Votes'
import {atoms as a, useTheme} from '#/alf'
import {EditBig_Stroke2_Corner2_Rounded as EditBigIcon} from '#/components/icons/EditBig'
import {Heart2_Stroke1_Corner0_Rounded as HeartIcon} from '#/components/icons/Heart2'
import {Image_Stroke1_Corner0_Rounded as ImageIcon} from '#/components/icons/Image'
import {Message_Stroke1_Corner0_Rounded_Filled as MessageIcon} from '#/components/icons/Message'
import {VideoClip_Stroke1_Corner0_Rounded as VideoIcon} from '#/components/icons/VideoClip'
import * as Layout from '#/components/Layout'
import {ScreenHider} from '#/components/moderation/ScreenHider'
import {navigate} from '#/Navigation'
import {ExpoScrollForwarderView} from '../../../modules/expo-scroll-forwarder'

interface SectionRef {
  scrollToTop: () => void
}

type Props = NativeStackScreenProps<CommonNavigatorParams, 'Profile'>
export function ProfileScreen(props: Props) {
  return (
    <Layout.Screen testID="profileScreen" style={[a.pt_0]}>
      <ProfileScreenInner {...props} />
    </Layout.Screen>
  )
}

function ProfileScreenInner({route}: Props) {
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()
  const name =
    route.params.name === 'me' ? currentAccount?.did : route.params.name
  const moderationOpts = useModerationOpts()
  const {
    data: resolvedDid,
    error: resolveError,
    refetch: refetchDid,
    isLoading: isLoadingDid,
  } = useResolveDidQuery(name)
  const {
    data: profile,
    error: profileError,
    refetch: refetchProfile,
    isLoading: isLoadingProfile,
    isPlaceholderData: isPlaceholderProfile,
  } = useProfileQuery({
    did: resolvedDid,
  })

  const onPressTryAgain = useCallback(() => {
    if (resolveError) {
      refetchDid()
    } else {
      refetchProfile()
    }
  }, [resolveError, refetchDid, refetchProfile])

  // Apply hard-coded redirects as need
  useEffect(() => {
    if (resolveError) {
      if (name === 'lulaoficial.bsky.social') {
        navigate('Profile', {name: 'lula.com.br'})
      }
    }
  }, [name, resolveError])

  // When we open the profile, we want to reset the posts query if we are blocked.
  useEffect(() => {
    if (resolvedDid && profile?.viewer?.blockedBy) {
      resetProfilePostsQueries(queryClient, resolvedDid)
    }
  }, [queryClient, profile?.viewer?.blockedBy, resolvedDid])

  // Most pushes will happen here, since we will have only placeholder data
  if (isLoadingDid || isLoadingProfile) {
    return (
      <Layout.Content>
        <ProfileHeaderLoading />
      </Layout.Content>
    )
  }
  if (resolveError || profileError) {
    return (
      <SafeAreaView style={[a.flex_1]}>
        <ErrorScreen
          testID="profileErrorScreen"
          title={profileError ? _(msg`Not Found`) : _(msg`Oops!`)}
          message={cleanError(resolveError || profileError)}
          onPressTryAgain={onPressTryAgain}
          showHeader
        />
      </SafeAreaView>
    )
  }
  if (profile && moderationOpts) {
    return (
      <ProfileScreenLoaded
        profile={profile}
        moderationOpts={moderationOpts}
        isPlaceholderProfile={isPlaceholderProfile}
        hideBackButton={!!route.params.hideBackButton}
      />
    )
  }
  // should never happen
  return (
    <SafeAreaView style={[a.flex_1]}>
      <ErrorScreen
        testID="profileErrorScreen"
        title="Oops!"
        message="Something went wrong and we're not sure what."
        onPressTryAgain={onPressTryAgain}
        showHeader
      />
    </SafeAreaView>
  )
}

function ProfileScreenLoaded({
  profile: profileUnshadowed,
  isPlaceholderProfile,
  moderationOpts,
  hideBackButton,
}: {
  profile: AppBskyActorDefs.ProfileViewDetailed
  moderationOpts: ModerationOpts
  hideBackButton: boolean
  isPlaceholderProfile: boolean
}) {
  const t = useTheme()
  const profile = useProfileShadow(profileUnshadowed)
  const {hasSession, currentAccount} = useSession()
  const {headerMode} = useMinimalShellMode()
  const showHeader = useCallback(() => {
    'worklet'
    headerMode.set(withSpring(0, {overshootClamping: true}))
  }, [headerMode])
  const {openComposer} = useOpenComposer()
  const {
    data: labelerInfo,
    error: labelerError,
    isLoading: isLabelerLoading,
  } = useLabelerInfoQuery({
    did: profile.did,
    enabled: !!profile.associated?.labeler,
  })
  const [currentPage, setCurrentPage] = useState(0)
  const {_} = useLingui()

  const [scrollViewTag, setScrollViewTag] = useState<number | null>(null)

  const postsSectionRef = useRef<SectionRef>(null)
  const votesSectionRef = useRef<SectionRef>(null)
  const raqSectionRef = useRef<SectionRef>(null)
  const highlightsSectionRef = useRef<SectionRef>(null)
  const pajareoSectionRef = useRef<SectionRef>(null)
  const repliesSectionRef = useRef<SectionRef>(null)
  const mediaSectionRef = useRef<SectionRef>(null)
  const videosSectionRef = useRef<SectionRef>(null)
  const likesSectionRef = useRef<SectionRef>(null)
  const feedsSectionRef = useRef<SectionRef>(null)
  const listsSectionRef = useRef<SectionRef>(null)
  const labelsSectionRef = useRef<SectionRef>(null)

  useSetTitle(combinedDisplayName(profile))

  const description = profile.description ?? ''
  const hasDescription = description !== ''
  const [descriptionRT, isResolvingDescriptionRT] = useRichText(description)
  const showPlaceholder = isPlaceholderProfile || isResolvingDescriptionRT
  const moderation = useMemo(
    () => moderateProfile(profile, moderationOpts),
    [profile, moderationOpts],
  )

  const [paraIdentity, setParaIdentity] = useState<ParaIdentityRecord | null>(
    null,
  )
  const isMe = profile.did === currentAccount?.did
  const representativeProfile = useMemo(
    () =>
      findRepresentativeByActor({
        did: profile.did,
        handle: profile.handle,
      }),
    [profile.did, profile.handle],
  )

  const agent = useAgent()

  // Load visibility from ATProto ParaIdentity record so other users can read it
  useFocusEffect(
    useCallback(() => {
      if (!profile.did) return
      if (isMe) {
        // For self: read from local AsyncStorage first (snappier), then sync from server
        AsyncStorage.getItem('para_public_votes').then(val =>
          setParaIdentity(prev => ({
            ...prev,
            publicVotes: val === 'true',
            createdAt: prev?.createdAt ?? new Date().toISOString(),
            isVerifiedPublicFigure: prev?.isVerifiedPublicFigure ?? false,
          })),
        )
        AsyncStorage.getItem('para_public_raq').then(val =>
          setParaIdentity(prev => ({
            ...prev,
            publicRaq: val === 'true',
            createdAt: prev?.createdAt ?? new Date().toISOString(),
            isVerifiedPublicFigure: prev?.isVerifiedPublicFigure ?? false,
          })),
        )
        AsyncStorage.getItem('para_public_highlights').then(val =>
          setParaIdentity(prev => ({
            ...prev,
            publicHighlights: val === 'true',
            createdAt: prev?.createdAt ?? new Date().toISOString(),
            isVerifiedPublicFigure: prev?.isVerifiedPublicFigure ?? false,
          })),
        )
      }
      // For everyone: fetch the owner's ParaIdentity from ATProto
      fetchParaIdentity(agent, profile.did).then(identity => {
        if (identity) {
          setParaIdentity(identity)
        }
      })
    }, [profile.did, isMe, agent]),
  )

  const hasLabeler = !!profile.associated?.labeler
  const showFiltersTab = hasLabeler
  const showPostsTab = true
  const showRepliesTab = hasSession
  const showMediaTab = !hasLabeler
  const showVideosTab = !hasLabeler
  const showLikesTab = isMe
  const feedGenCount = profile.associated?.feedgens || 0
  const showFeedsTab = isMe || feedGenCount > 0
  const listCount = profile.associated?.lists || 0
  const showListsTab = hasSession && (isMe || listCount > 0)

  // Visibility tabs: read from owner's ParaIdentity record so the switch actually works
  const showVotesTab =
    isMe || (paraIdentity?.publicVotes ?? false)
  const showRaqTab =
    isMe || (paraIdentity?.publicRaq ?? false)
  const showHighlightsTab =
    isMe || (paraIdentity?.publicHighlights ?? false)
  const isPajareoEnabled = usePajareoEnabled()
  const showPajareoTab =
    isPajareoEnabled && representativeProfile?.status === 'verified'

  const sectionTitles = [
    showFiltersTab ? _(msg`Labels`) : undefined,
    showListsTab && hasLabeler ? _(msg`Lists`) : undefined,
    showPostsTab ? _(msg`Posts`) : undefined,
    showHighlightsTab ? _(msg`Highlights`) : undefined, // Highlights higher prio
    showPajareoTab ? _(msg`Pajareo`) : undefined,
    showVotesTab ? _(msg`Votes`) : undefined,
    showRaqTab ? _(msg`RAQ`) : undefined,
    showRepliesTab ? _(msg`Replies`) : undefined,
    showMediaTab ? _(msg`Media`) : undefined,
    showVideosTab ? _(msg`Videos`) : undefined,
    showLikesTab ? _(msg`Likes`) : undefined,
    showFeedsTab ? _(msg`Feeds`) : undefined,
    showListsTab && !hasLabeler ? _(msg`Lists`) : undefined,
  ].filter(Boolean) as string[]

  let nextIndex = 0
  let filtersIndex: number | null = null
  let postsIndex: number | null = null
  let highlightsIndex: number | null = null
  let pajareoIndex: number | null = null
  let votesIndex: number | null = null
  let raqIndex: number | null = null
  let repliesIndex: number | null = null
  let mediaIndex: number | null = null
  let videosIndex: number | null = null
  let likesIndex: number | null = null
  let feedsIndex: number | null = null
  let listsIndex: number | null = null

  if (showFiltersTab) {
    filtersIndex = nextIndex++
  }
  if (showPostsTab) {
    postsIndex = nextIndex++
  }
  if (showHighlightsTab) {
    highlightsIndex = nextIndex++
  }
  if (showPajareoTab) {
    pajareoIndex = nextIndex++
  }
  if (showVotesTab) {
    votesIndex = nextIndex++
  }
  if (showRaqTab) {
    raqIndex = nextIndex++
  }
  if (showRepliesTab) {
    repliesIndex = nextIndex++
  }
  if (showMediaTab) {
    mediaIndex = nextIndex++
  }
  if (showVideosTab) {
    videosIndex = nextIndex++
  }
  if (showLikesTab) {
    likesIndex = nextIndex++
  }
  if (showFeedsTab) {
    feedsIndex = nextIndex++
  }
  if (showListsTab) {
    listsIndex = nextIndex++
  }

  const scrollSectionToTop = useCallback(
    (index: number) => {
      if (index === filtersIndex) {
        labelsSectionRef.current?.scrollToTop()
      } else if (index === postsIndex) {
        postsSectionRef.current?.scrollToTop()
      } else if (index === highlightsIndex) {
        highlightsSectionRef.current?.scrollToTop()
      } else if (index === pajareoIndex) {
        pajareoSectionRef.current?.scrollToTop()
      } else if (index === votesIndex) {
        votesSectionRef.current?.scrollToTop()
      } else if (index === raqIndex) {
        raqSectionRef.current?.scrollToTop()
      } else if (index === repliesIndex) {
        repliesSectionRef.current?.scrollToTop()
      } else if (index === mediaIndex) {
        mediaSectionRef.current?.scrollToTop()
      } else if (index === videosIndex) {
        videosSectionRef.current?.scrollToTop()
      } else if (index === likesIndex) {
        likesSectionRef.current?.scrollToTop()
      } else if (index === feedsIndex) {
        feedsSectionRef.current?.scrollToTop()
      } else if (index === listsIndex) {
        listsSectionRef.current?.scrollToTop()
      }
    },
    [
      filtersIndex,
      postsIndex,
      highlightsIndex,
      pajareoIndex,
      votesIndex,
      raqIndex,
      repliesIndex,
      mediaIndex,
      videosIndex,
      likesIndex,
      feedsIndex,
      listsIndex,
    ],
  )

  useFocusEffect(
    useCallback(() => {
      showHeader()
      return listenSoftReset(() => {
        scrollSectionToTop(currentPage)
      })
    }, [showHeader, currentPage, scrollSectionToTop]),
  )

  const onPressCompose = () => {
    const mention =
      profile.handle === currentAccount?.handle ||
      isInvalidHandle(profile.handle)
        ? undefined
        : profile.handle
    openComposer({mention})
  }

  const onPageSelected = (i: number) => {
    setCurrentPage(i)
  }

  const onCurrentPageSelected = (index: number) => {
    scrollSectionToTop(index)
  }

  const renderHeader = ({
    setMinimumHeight,
  }: {
    setMinimumHeight: (height: number) => void
  }) => {
    return (
      <ExpoScrollForwarderView scrollViewTag={scrollViewTag}>
        <ProfileHeader
          profile={profile}
          labeler={labelerInfo}
          descriptionRT={hasDescription ? descriptionRT : null}
          moderationOpts={moderationOpts}
          hideBackButton={hideBackButton}
          isPlaceholderProfile={showPlaceholder}
          setMinimumHeight={setMinimumHeight}
          paraIdentity={paraIdentity}
        />
      </ExpoScrollForwarderView>
    )
  }

  return (
    <ScreenHider
      testID="profileView"
      style={styles.container}
      screenDescription={_(msg`user`)}
      modui={moderation.ui('profileView')}>
      <PagerWithHeader
        testID="profilePager"
        isHeaderReady={!showPlaceholder}
        items={sectionTitles}
        onPageSelected={onPageSelected}
        onCurrentPageSelected={onCurrentPageSelected}
        renderHeader={renderHeader}
        allowHeaderOverScroll>
        {showFiltersTab
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileLabelsSection
                ref={labelsSectionRef}
                labelerInfo={labelerInfo}
                labelerError={labelerError}
                isLabelerLoading={isLabelerLoading}
                moderationOpts={moderationOpts}
                scrollElRef={scrollElRef as ListRef}
                headerHeight={headerHeight}
                isFocused={isFocused}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {showListsTab && !!profile.associated?.labeler
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileLists
                ref={listsSectionRef}
                did={profile.did}
                scrollElRef={scrollElRef as ListRef}
                headerOffset={headerHeight}
                enabled={isFocused}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {showPostsTab
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileFeedSection
                ref={postsSectionRef}
                feed={`author|${profile.did}|posts_and_author_threads`}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                ignoreFilterFor={profile.did}
                setScrollViewTag={setScrollViewTag}
                emptyStateMessage={_(msg`No posts yet`)}
                emptyStateButton={
                  isMe
                    ? {
                        label: _(msg`Write a post`),
                        text: _(msg`Write a post`),
                        onPress: () => openComposer({}),
                        size: 'small',
                        color: 'primary',
                      }
                    : undefined
                }
              />
            )
          : null}
        {showHighlightsTab
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileHighlightsSection
                ref={highlightsSectionRef}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {showPajareoTab && representativeProfile
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfilePajareoSection
                ref={pajareoSectionRef}
                representative={representativeProfile}
                viewerDid={currentAccount?.did}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {showVotesTab
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileVotesSection
                ref={votesSectionRef}
                did={profile?.did}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {showRaqTab
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileRAQSection
                ref={raqSectionRef}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {showRepliesTab
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileFeedSection
                ref={repliesSectionRef}
                feed={`author|${profile.did}|posts_with_replies`}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                ignoreFilterFor={profile.did}
                setScrollViewTag={setScrollViewTag}
                emptyStateMessage={_(msg`No replies yet`)}
                emptyStateIcon={MessageIcon}
              />
            )
          : null}
        {showMediaTab
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileFeedSection
                ref={mediaSectionRef}
                feed={`author|${profile.did}|posts_with_media`}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                ignoreFilterFor={profile.did}
                setScrollViewTag={setScrollViewTag}
                emptyStateMessage={_(msg`No media yet`)}
                emptyStateButton={
                  isMe
                    ? {
                        label: _(msg`Post a photo`),
                        text: _(msg`Post a photo`),
                        onPress: () => openComposer({}),
                        size: 'small',
                        color: 'primary',
                      }
                    : undefined
                }
                emptyStateIcon={ImageIcon}
              />
            )
          : null}
        {showVideosTab
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileFeedSection
                ref={videosSectionRef}
                feed={`author|${profile.did}|posts_with_video`}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                ignoreFilterFor={profile.did}
                setScrollViewTag={setScrollViewTag}
                emptyStateMessage={_(msg`No video posts yet`)}
                emptyStateButton={
                  isMe
                    ? {
                        label: _(msg`Post a video`),
                        text: _(msg`Post a video`),
                        onPress: () => openComposer({}),
                        size: 'small',
                        color: 'primary',
                      }
                    : undefined
                }
                emptyStateIcon={VideoIcon}
              />
            )
          : null}
        {showLikesTab
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileFeedSection
                ref={likesSectionRef}
                feed={`likes|${profile.did}`}
                headerHeight={headerHeight}
                isFocused={isFocused}
                scrollElRef={scrollElRef as ListRef}
                ignoreFilterFor={profile.did}
                setScrollViewTag={setScrollViewTag}
                emptyStateMessage={_(msg`No likes yet`)}
                emptyStateIcon={HeartIcon}
              />
            )
          : null}
        {showFeedsTab
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileFeedgens
                ref={feedsSectionRef}
                did={profile.did}
                scrollElRef={scrollElRef as ListRef}
                headerOffset={headerHeight}
                enabled={isFocused}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
        {showListsTab && !profile.associated?.labeler
          ? ({headerHeight, isFocused, scrollElRef}) => (
              <ProfileLists
                ref={listsSectionRef}
                did={profile.did}
                scrollElRef={scrollElRef as ListRef}
                headerOffset={headerHeight}
                enabled={isFocused}
                setScrollViewTag={setScrollViewTag}
              />
            )
          : null}
      </PagerWithHeader>
      {hasSession && (
        <FAB
          testID="composeFAB"
          onPress={onPressCompose}
          icon={<EditBigIcon size="lg" fill={t.palette.white} />}
          accessibilityRole="button"
          accessibilityLabel={_(msg`New post`)}
          accessibilityHint=""
        />
      )}
    </ScreenHider>
  )
}

function useRichText(text: string): [RichTextAPI, boolean] {
  const agent = useAgent()
  const [prevText, setPrevText] = useState(text)
  const [rawRT, setRawRT] = useState(() => new RichTextAPI({text}))
  const [resolvedRT, setResolvedRT] = useState<RichTextAPI | null>(null)

  if (text !== prevText) {
    setPrevText(text)
    setRawRT(new RichTextAPI({text}))
    setResolvedRT(null)
  }

  useEffect(() => {
    let ignore = false
    async function resolveRTFacets() {
      const resRT = new RichTextAPI({text})
      await resRT.detectFacets(agent)
      if (!ignore) {
        setResolvedRT(resRT)
      }
    }
    resolveRTFacets()
    return () => {
      ignore = true
    }
  }, [text, agent])

  const isResolving = resolvedRT === null
  return [resolvedRT ?? rawRT, isResolving]
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    height: '100%',
    // @ts-ignore Web-only.
    overflowAnchor: 'none',
  },
  loading: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  emptyState: {
    paddingVertical: 40,
  },
  loadingMoreFooter: {
    paddingVertical: 20,
  },
  endItem: {
    paddingTop: 20,
    paddingBottom: 30,
    color: colors.gray5,
    textAlign: 'center',
  },
})
