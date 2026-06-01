export type ChatIdentityMode =
  | 'civic_pseudonym'
  | 'isolated_anonymous'
  | 'public_profile'

export type ChatIdentitySurface =
  | 'matrix_community'
  | 'matrix_chamber'
  | 'matrix_assembly'
  | 'matrix_delegate'
  | 'bsky_dm'
  | 'para_dm'
  | 'public_dm'
  | 'isolated_post'
  | 'isolated_testimony'
  | 'anonymous_disclosure'

export type ChatIdentityTone = 'civic' | 'isolated' | 'public'

export type ChatIdentityCopy = {
  label: string
  shortLabel: string
  microcopy: string
  tone: ChatIdentityTone
}

export const CHAT_IDENTITY_COPY: Record<ChatIdentityMode, ChatIdentityCopy> = {
  civic_pseudonym: {
    label: 'Pseudónimo cívico',
    shortLabel: 'Cívico',
    microcopy: 'Tu reputación comunitaria se mantiene.',
    tone: 'civic',
  },
  isolated_anonymous: {
    label: 'Aislado',
    shortLabel: 'Aislado',
    microcopy: 'Este mensaje no se vincula públicamente con otros disclosures.',
    tone: 'isolated',
  },
  public_profile: {
    label: 'Perfil público',
    shortLabel: 'Público',
    microcopy: 'Tu perfil público será visible.',
    tone: 'public',
  },
}

export function getDefaultChatIdentityMode(
  surface: ChatIdentitySurface,
): ChatIdentityMode {
  switch (surface) {
    case 'matrix_community':
    case 'matrix_chamber':
    case 'matrix_assembly':
    case 'matrix_delegate':
      return 'civic_pseudonym'
    case 'isolated_post':
    case 'isolated_testimony':
    case 'anonymous_disclosure':
      return 'isolated_anonymous'
    case 'bsky_dm':
    case 'para_dm':
    case 'public_dm':
      return 'public_profile'
  }
}
