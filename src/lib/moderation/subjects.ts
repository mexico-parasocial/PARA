import {
  hasMutedWord as sdkHasMutedWord,
  moderateFeedGenerator as sdkModerateFeedGenerator,
  moderateNotification as sdkModerateNotification,
  moderatePost as sdkModeratePost,
  moderateProfile as sdkModerateProfile,
  moderateStatus as sdkModerateStatus,
  moderateUserList as sdkModerateUserList,
  type ModerationDecision,
  type ModerationOpts,
} from '@bsky/sdk/moderation'

import {type app, type chat} from '#/lexicons'

/*
 * TRANSITIONAL. The moderation implementation now comes from
 * `@bsky/sdk/moderation`, whose subject types are the generated
 * `#/lexicons` views - so their `did`/`uri`/`cid` fields are branded
 * (`DidString`, `AtUriString`). Many read paths still emit the identically
 * shaped `the legacy SDK` views, whose same fields are plain `string`.
 *
 * A plain `string` is not assignable to a branded template-literal type, so
 * every `moderate*` call taking an unmigrated view fails to typecheck even
 * though the value is byte-identical - the runtime only ever reads `.did`,
 * `.labels` and `.viewer`, none of which the brand affects.
 *
 * These wrappers widen each subject parameter to accept a view from either
 * world and drop the brand on the way in. Delete this module once every
 * producer emits `#/lexicons` views (the `the legacy SDK` removal pass) and point
 * callers back at `@bsky/sdk/moderation` directly.
 */

type AnyProfileSubject =
  | app.bsky.actor.defs.ProfileViewBasic
  | app.bsky.actor.defs.ProfileView
  | app.bsky.actor.defs.ProfileViewDetailed
  | chat.bsky.actor.defs.ProfileViewBasic

type AnyPostSubject = app.bsky.feed.defs.PostView

type AnyUserListSubject =
  app.bsky.graph.defs.ListViewBasic | app.bsky.graph.defs.ListView

type AnyFeedGeneratorSubject = app.bsky.feed.defs.GeneratorView

type AnyNotificationSubject =
  app.bsky.notification.listNotifications.Notification

export function moderateProfile(
  subject: AnyProfileSubject,
  opts: ModerationOpts,
): ModerationDecision {
  return sdkModerateProfile(subject, opts)
}

export function moderateStatus(
  subject: AnyProfileSubject,
  opts: ModerationOpts,
): ModerationDecision {
  return sdkModerateStatus(subject, opts)
}

export function moderatePost(
  subject: AnyPostSubject,
  opts: ModerationOpts,
): ModerationDecision {
  return sdkModeratePost(subject, opts)
}

export function moderateUserList(
  subject: AnyUserListSubject,
  opts: ModerationOpts,
): ModerationDecision {
  return sdkModerateUserList(subject, opts)
}

export function moderateFeedGenerator(
  subject: AnyFeedGeneratorSubject,
  opts: ModerationOpts,
): ModerationDecision {
  return sdkModerateFeedGenerator(subject, opts)
}

export function moderateNotification(
  subject: AnyNotificationSubject,
  opts: ModerationOpts,
): ModerationDecision {
  return sdkModerateNotification(subject, opts)
}

/**
 * Widens `facets`/`actor` for the same reason the `moderate*` wrappers widen
 * their subjects: mute-word matching reads only `text`/`features`/`langs`, none
 * of which the brand affects.
 */
export function hasMutedWord(params: {
  mutedWords: app.bsky.actor.defs.MutedWord[]
  text: string
  facets?: app.bsky.richtext.facet.Main[]
  outlineTags?: string[]
  languages?: string[]
  actor?: AnyProfileSubject
}): boolean {
  return sdkHasMutedWord({
    ...params,
    facets: params.facets,
    actor: params.actor as app.bsky.actor.defs.ProfileView | undefined,
  })
}
