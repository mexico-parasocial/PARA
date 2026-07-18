export type IdentityContextId = 'public' | 'anonymous' | 'isolated'

export type IdentityContext = {
  id: IdentityContextId
  label: string
  handle: string
  displayName: string
  avatarSeed?: string
  isActive: boolean
  isAvailable: boolean
  description: string
}
