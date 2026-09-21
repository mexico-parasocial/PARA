import {memo, useCallback} from 'react'
import {type StyleProp, View, type ViewStyle} from 'react-native'
import {type ModerationDecision} from '@bsky/sdk/moderation'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {useQueryClient} from '@tanstack/react-query'

import {useActorStatus} from '#/lib/actor-status'
import {type CivicInsigniaInfo} from '#/lib/civic-insignias'
import {type PostBadge} from '#/lib/post-flairs'
import {makeProfileLink} from '#/lib/routes/links'
import {forceLTR} from '#/lib/strings/bidi'
import {NON_BREAKING_SPACE} from '#/lib/strings/constants'
import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeHandle} from '#/lib/strings/handles'
import {niceDate} from '#/lib/strings/time'
import {useProfileShadow} from '#/state/cache/profile-shadow'
import {unstableCacheProfileView} from '#/state/queries/profile'
import {atoms as a, platform, useTheme, web} from '#/alf'
import {CivicInsignia} from '#/components/CivicInsignia'
import {WebOnlyInlineLinkText} from '#/components/Link'
import {PostFlairStrip} from '#/components/Post/PostFlairStrip'
import {ProfileHoverCard} from '#/components/ProfileHoverCard'
import {Text} from '#/components/Typography'
import {useSimpleVerificationState} from '#/components/verification'
import {VerificationCheck} from '#/components/verification/VerificationCheck'
import {IS_ANDROID} from '#/env'
import {type app} from '#/lexicons'
import {TimeElapsed} from './TimeElapsed'
import {PreviewableUserAvatar} from './UserAvatar'

interface PostMetaOpts {
  author: app.bsky.actor.defs.ProfileViewBasic
  moderation: ModerationDecision | undefined
  postHref: string
  timestamp: string
  linkDisabled?: boolean
  showAvatar?: boolean
  avatarSize?: number
  onOpenAuthor?: () => void
  style?: StyleProp<ViewStyle>
  /** User flair displayed next to the handle (e.g., political alignment) */
  userFlair?: {
    label: string
    color: string
    bgColor: string
  }
  /** Civic insignia rendered next to author info */
  partyShield?: CivicInsigniaInfo
  /** Optional multiple post flairs (e.g. one policy + one matter) */
  postFlairs?: PostBadge[]
  postFlairsBelow?: boolean
}

let PostMeta = (opts: PostMetaOpts): React.ReactNode => {
  const t = useTheme()
  const {i18n, _} = useLingui()

  const author = useProfileShadow(opts.author)
  const displayName = author.displayName || author.handle
  const handle = author.handle
  const profileLink = makeProfileLink(author)
  const queryClient = useQueryClient()
  const onOpenAuthor = opts.onOpenAuthor
  const onBeforePressAuthor = useCallback(() => {
    unstableCacheProfileView(queryClient, author)
    onOpenAuthor?.()
  }, [queryClient, author, onOpenAuthor])
  const onBeforePressPost = useCallback(() => {
    unstableCacheProfileView(queryClient, author)
  }, [queryClient, author])

  const timestampLabel = niceDate(i18n, opts.timestamp)
  const verification = useSimpleVerificationState({profile: author})
  const {isActive: live} = useActorStatus(author)
  const postFlairs = opts.postFlairs || []
  const postFlairsBelow = opts.postFlairsBelow && postFlairs.length > 0

  const MaybeLinkText = opts.linkDisabled ? Text : WebOnlyInlineLinkText

  return (
    <View
      style={[
        postFlairsBelow ? a.flex_col : a.flex_row,
        !postFlairsBelow && a.align_center,
        a.pb_xs,
        a.gap_xs,
        a.z_20,
        opts.style,
      ]}>
      {opts.showAvatar && !postFlairsBelow && (
        <View style={[a.self_center, a.mr_2xs]}>
          <PreviewableUserAvatar
            size={opts.avatarSize || 16}
            profile={author}
            moderation={opts.moderation?.ui('avatar')}
            type={author.associated?.labeler ? 'labeler' : 'user'}
            live={live}
            hideLiveBadge
            disableNavigation={opts.linkDisabled}
          />
        </View>
      )}
      <View style={[a.flex_row, a.align_end, a.flex_shrink]}>
        <ProfileHoverCard did={author.did}>
          <View style={[a.flex_row, a.align_end, a.flex_shrink]}>
            <MaybeLinkText
              emoji
              numberOfLines={1}
              to={profileLink}
              label={_(msg`View profile`)}
              disableMismatchWarning
              onPress={opts.linkDisabled ? undefined : onBeforePressAuthor}
              style={[
                a.text_md,
                a.font_semi_bold,
                t.atoms.text,
                a.leading_tight,
                a.flex_shrink_0,
                {maxWidth: '70%'},
                web({direction: 'ltr', unicodeBidi: 'isolate'}),
              ]}>
              {forceLTR(
                sanitizeDisplayName(
                  displayName,
                  opts.moderation?.ui('displayName'),
                ),
              )}
            </MaybeLinkText>
            {verification.showBadge && (
              <View
                style={[
                  a.pl_2xs,
                  a.self_center,
                  {
                    marginTop: platform({web: 0, ios: 0, android: -1}),
                  },
                ]}>
                <VerificationCheck
                  width={platform({android: 13, default: 12})}
                  verifier={verification.role === 'verifier'}
                />
              </View>
            )}
            <MaybeLinkText
              emoji
              numberOfLines={1}
              to={profileLink}
              label={_(msg`View profile`)}
              disableMismatchWarning
              disableUnderline
              onPress={opts.linkDisabled ? undefined : onBeforePressAuthor}
              style={[
                a.text_md,
                t.atoms.text_contrast_medium,
                a.leading_tight,
                {flexShrink: 10},
              ]}>
              {NON_BREAKING_SPACE + sanitizeHandle(handle, '@')}
            </MaybeLinkText>
            {/* Civic insignia (party shield) */}
            {opts.partyShield && (
              <View style={[a.ml_xs, a.self_center]}>
                <CivicInsignia
                  variant="shield"
                  abbreviation={opts.partyShield.abbreviation}
                  colors={opts.partyShield.colors}
                  size="sm"
                />
              </View>
            )}
            {/* User flair badge - like political alignment */}
            {opts.userFlair && (
              <View
                style={[
                  a.ml_xs,
                  a.px_xs,
                  a.py_2xs,
                  a.rounded_xs,
                  a.self_center,
                  {backgroundColor: opts.userFlair.bgColor},
                ]}>
                <Text
                  style={[
                    a.text_xs,
                    a.font_bold,
                    {color: opts.userFlair.color},
                  ]}>
                  {opts.userFlair.label}
                </Text>
              </View>
            )}
          </View>
        </ProfileHoverCard>

        <TimeElapsed timestamp={opts.timestamp}>
          {({timeElapsed}) => (
            <MaybeLinkText
              to={opts.postHref}
              label={timestampLabel}
              title={timestampLabel}
              disableMismatchWarning
              disableUnderline
              onPress={opts.linkDisabled ? undefined : onBeforePressPost}
              style={[
                a.pl_xs,
                a.text_md,
                a.leading_tight,
                IS_ANDROID && a.flex_grow,
                a.text_right,
                t.atoms.text_contrast_medium,
                web({
                  whiteSpace: 'nowrap',
                }),
              ]}>
              {!IS_ANDROID && (
                <Text
                  style={[
                    a.text_md,
                    a.leading_tight,
                    t.atoms.text_contrast_medium,
                  ]}
                  accessible={false}>
                  &middot;{' '}
                </Text>
              )}
              {timeElapsed}
            </MaybeLinkText>
          )}
        </TimeElapsed>
      </View>
      {postFlairs.length ? (
        <View
          style={[
            postFlairsBelow
              ? [a.mt_xs, a.flex_shrink]
              : [a.ml_xs, a.flex_shrink],
          ]}>
          <PostFlairStrip badges={postFlairs} compact />
        </View>
      ) : null}
    </View>
  )
}
PostMeta = memo(PostMeta)
export {PostMeta}
