import {type $Typed} from '@atproto/lex'
import {currentDatetimeString} from '@atproto/syntax'

import {type app, type com} from '#/lexicons'

/*
 * Typed fixture builders for debug screens, mirroring the `mock` export of
 * `@bsky/sdk` (which does not expose it publicly). Inputs are kept loose -
 * these are hand-built fixtures, so branding on uris/dids would only add
 * noise at the call sites - while the returns carry the generated `#/lexicons`
 * types so the values flow through `#/types/bsky` guards, the moderation
 * stack, and view components unchanged.
 */

const FAKE_CID = 'bafyreiclp443lavogvhj3d2ob2cxbfuscni2k5jk7bebjzg7khl3esabwq'

export const mock = {
  post({
    text,
    facets,
    reply,
    embed,
  }: {
    text: string
    facets?: app.bsky.feed.post.Main['facets']
    reply?: unknown
    embed?: unknown
  }): $Typed<app.bsky.feed.post.Main> {
    return {
      $type: 'app.bsky.feed.post',
      text,
      facets,
      reply,
      embed,
      langs: ['en'],
      createdAt: currentDatetimeString(),
    } as $Typed<app.bsky.feed.post.Main>
  },
  postView({
    record,
    author,
    embed,
    labels,
  }: {
    record: app.bsky.feed.post.Main
    author: app.bsky.actor.defs.ProfileViewBasic
    embed?: unknown
    labels?: com.atproto.label.defs.Label[]
  }): $Typed<app.bsky.feed.defs.PostView> {
    return {
      $type: 'app.bsky.feed.defs#postView',
      uri: `at://${author.did}/app.bsky.feed.post/fake`,
      cid: FAKE_CID,
      author,
      record,
      embed,
      replyCount: 0,
      repostCount: 0,
      likeCount: 0,
      indexedAt: currentDatetimeString(),
      viewer: undefined,
      labels,
    } as $Typed<app.bsky.feed.defs.PostView>
  },
  embedRecordView({
    record,
    author,
    labels,
  }: {
    record: app.bsky.feed.post.Main
    author: app.bsky.actor.defs.ProfileViewBasic
    labels?: com.atproto.label.defs.Label[]
  }): $Typed<app.bsky.embed.record.View> {
    return {
      $type: 'app.bsky.embed.record#view',
      record: {
        $type: 'app.bsky.embed.record#viewRecord',
        uri: `at://${author.did}/app.bsky.feed.post/fake`,
        cid: FAKE_CID,
        author,
        value: record,
        labels,
        indexedAt: currentDatetimeString(),
      },
    }
  },
  profileViewBasic({
    handle,
    displayName,
    description,
    viewer,
    labels,
  }: {
    handle: string
    displayName?: string
    description?: string
    viewer?: app.bsky.actor.defs.ViewerState
    labels?: com.atproto.label.defs.Label[]
  }): app.bsky.actor.defs.ProfileViewBasic {
    return {
      did: `did:web:${handle}`,
      handle,
      displayName,
      description,
      viewer,
      labels,
    } as app.bsky.actor.defs.ProfileViewBasic
  },
  actorViewerState({
    muted,
    mutedByList,
    blockedBy,
    blocking,
    blockingByList,
    following,
    followedBy,
  }: {
    muted?: boolean
    mutedByList?: app.bsky.graph.defs.ListViewBasic
    blockedBy?: boolean
    blocking?: string
    blockingByList?: app.bsky.graph.defs.ListViewBasic
    following?: string
    followedBy?: string
  }): app.bsky.actor.defs.ViewerState {
    return {
      muted,
      mutedByList,
      blockedBy,
      blocking,
      blockingByList,
      following,
      followedBy,
    } as app.bsky.actor.defs.ViewerState
  },
  listViewBasic({name}: {name: string}): app.bsky.graph.defs.ListViewBasic {
    return {
      uri: 'at://did:plc:fake/app.bsky.graph.list/fake',
      cid: FAKE_CID,
      name,
      purpose: 'app.bsky.graph.defs#modlist',
      indexedAt: currentDatetimeString(),
    }
  },
  replyNotification({
    author,
    record,
    labels,
  }: {
    record: app.bsky.feed.post.Main
    author: app.bsky.actor.defs.ProfileViewBasic
    labels?: com.atproto.label.defs.Label[]
  }): app.bsky.notification.listNotifications.Notification {
    return {
      uri: `at://${author.did}/app.bsky.feed.post/fake`,
      cid: FAKE_CID,
      author,
      reason: 'reply',
      reasonSubject: `at://${author.did}/app.bsky.feed.post/fake-parent`,
      record,
      isRead: false,
      indexedAt: currentDatetimeString(),
      labels,
    } as app.bsky.notification.listNotifications.Notification
  },
  followNotification({
    author,
    subjectDid,
    labels,
  }: {
    author: app.bsky.actor.defs.ProfileViewBasic
    subjectDid: string
    labels?: com.atproto.label.defs.Label[]
  }): app.bsky.notification.listNotifications.Notification {
    return {
      uri: `at://${author.did}/app.bsky.graph.follow/fake`,
      cid: FAKE_CID,
      author,
      reason: 'follow',
      record: {
        $type: 'app.bsky.graph.follow',
        createdAt: currentDatetimeString(),
        subject: subjectDid,
      },
      isRead: false,
      indexedAt: currentDatetimeString(),
      labels,
    } as app.bsky.notification.listNotifications.Notification
  },
  label({
    val,
    uri,
    src,
  }: {
    val: string
    uri: string
    src?: string
  }): com.atproto.label.defs.Label {
    return {
      src: src || 'did:plc:fake-labeler',
      uri,
      val,
      cts: currentDatetimeString(),
    } as com.atproto.label.defs.Label
  },
}
