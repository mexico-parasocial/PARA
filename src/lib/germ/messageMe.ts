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

export function buildGermProfileMessageButton({
  declaration,
  profileDid,
  viewerDid,
  viewerFollowsProfile,
}: {
  declaration: GermDeclarationRecord | null | undefined
  profileDid: string
  viewerDid?: string | null
  viewerFollowsProfile?: boolean
}): GermMessageButton | null {
  const messageMe = declaration?.messageMe
  if (!messageMe?.messageMeUrl) return null

  const visibility = messageMe.showButtonTo ?? 'everyone'
  if (visibility === 'none') return null
  if (visibility === 'usersIFollow' && !viewerFollowsProfile) return null

  const url = new URL(messageMe.messageMeUrl)
  url.hash = viewerDid ? `${profileDid}+${viewerDid}` : profileDid

  return {
    label: 'Message on Germ',
    provider: 'germ',
    url: url.toString(),
  }
}
