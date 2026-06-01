export type GermMessageMeVisibility = 'none' | 'usersIFollow' | 'everyone' | 'all'

export type GermDeclarationRecord = {
  $type?: 'com.germnetwork.declaration' | (string & {})
  messageMe?: {
    showButtonTo?: GermMessageMeVisibility | (string & {})
    messageMeUrl?: string
  } | null
}

export type GermMessageButton = {
  label: 'Message on Germ'
  provider: 'germ'
  url: string
}

export type GermAssociatedProfile = {
  messageMeUrl?: string | null
  showButtonTo?: GermMessageMeVisibility | (string & {})
} | null

export type GermAnonymousContact =
  | {dmEnabled: false}
  | {
      dmEnabled: true
      provider: 'germ'
      label: string
      contactUrl: string
    }

export function buildGermProfileMessageButton({
  declaration,
  profileDid,
  viewerDid,
  viewerFollowsProfile,
  viewerIsFollowedByProfile,
}: {
  declaration: GermDeclarationRecord | null | undefined
  profileDid: string
  viewerDid?: string | null
  viewerFollowsProfile?: boolean
  viewerIsFollowedByProfile?: boolean
}): GermMessageButton | null {
  const messageMe = declaration?.messageMe
  if (!messageMe?.messageMeUrl) return null

  const visibility = messageMe.showButtonTo ?? 'everyone'
  if (visibility === 'none') return null
  if (
    visibility === 'usersIFollow' &&
    !(viewerIsFollowedByProfile ?? viewerFollowsProfile)
  ) {
    return null
  }

  const url = buildGermMessageUrl({
    messageMeUrl: messageMe.messageMeUrl,
    profileDid,
    viewerDid,
  })
  if (!url) return null

  return {
    label: 'Message on Germ',
    provider: 'germ',
    url,
  }
}

export function buildGermAssociatedProfileButton({
  germ,
  profileDid,
  viewerDid,
  viewerIsFollowedByProfile,
}: {
  germ: GermAssociatedProfile
  profileDid: string
  viewerDid?: string | null
  viewerIsFollowedByProfile?: boolean
}): GermMessageButton | null {
  if (!germ?.messageMeUrl) return null
  return buildGermProfileMessageButton({
    declaration: {
      messageMe: {
        messageMeUrl: germ.messageMeUrl,
        showButtonTo: germ.showButtonTo,
      },
    },
    profileDid,
    viewerDid,
    viewerIsFollowedByProfile,
  })
}

export function buildAnonymousGermContactButton(
  contact: GermAnonymousContact | null | undefined,
): GermMessageButton | null {
  if (!contact?.dmEnabled || contact.provider !== 'germ') return null
  return {
    label: 'Message on Germ',
    provider: 'germ',
    url: contact.contactUrl,
  }
}

function buildGermMessageUrl({
  messageMeUrl,
  profileDid,
  viewerDid,
}: {
  messageMeUrl: string
  profileDid: string
  viewerDid?: string | null
}) {
  try {
    const url = new URL(messageMeUrl)
    url.hash = viewerDid ? `${profileDid}+${viewerDid}` : profileDid
    return url.toString()
  } catch {
    return null
  }
}
