import {canModerateChat, canSanctionChatMember} from './roles'

it('requires verified moderator or owner roles for moderation controls', () => {
  expect(canModerateChat(undefined)).toBe(false)
  expect(canModerateChat([])).toBe(false)
  expect(canModerateChat(['member'])).toBe(false)
  expect(canModerateChat(['member', 'moderator'])).toBe(true)
  expect(canModerateChat(['member', 'owner'])).toBe(true)
})

it('keeps sanction controls within the bridge authority boundary', () => {
  expect(canSanctionChatMember(['member'], ['member'])).toBe(false)
  expect(canSanctionChatMember(['moderator'], undefined)).toBe(false)
  expect(canSanctionChatMember(['moderator'], ['member'])).toBe(true)
  expect(canSanctionChatMember(['moderator'], ['member', 'moderator'])).toBe(
    false,
  )
  expect(canSanctionChatMember(['owner'], ['member', 'moderator'])).toBe(true)
  expect(canSanctionChatMember(['owner'], ['member', 'owner'])).toBe(false)
})
