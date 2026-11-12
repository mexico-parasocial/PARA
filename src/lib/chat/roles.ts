export type ChatCommunityRole = 'member' | 'moderator' | 'owner'

/** UI hints only; the bridge independently authorizes every operation. */
export function canModerateChat(
  roles: readonly ChatCommunityRole[] | undefined,
): boolean {
  return roles?.some(role => role === 'moderator' || role === 'owner') ?? false
}

/** Match the bridge's owner/moderator sanction boundary. */
export function canSanctionChatMember(
  viewer: readonly ChatCommunityRole[] | undefined,
  target: readonly ChatCommunityRole[] | undefined,
): boolean {
  if (!target?.includes('member') || target.includes('owner')) return false
  return (
    canModerateChat(viewer) &&
    (!target.includes('moderator') || Boolean(viewer?.includes('owner')))
  )
}
