import {View} from 'react-native'
import {type AppBskyActorDefs, type ModerationDecision} from '@atproto/api'

import {useAnonymousMode} from '#/lib/m8/hooks/useAnonymousMode'
import {formatUserDisplayName} from '#/lib/strings/profile-names'
import {type Shadow} from '#/state/cache/types'
import {useSession} from '#/state/session'
import {atoms as a, useBreakpoints, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {useSimpleVerificationState} from '#/components/verification'

export function ProfileHeaderDisplayName({
  profile,
  moderation,
}: {
  profile: Shadow<AppBskyActorDefs.ProfileViewDetailed>
  moderation: ModerationDecision
}) {
  const t = useTheme()
  const {gtMobile} = useBreakpoints()
  const {currentAccount} = useSession()
  const {isEnabled: isAnonymous, profile: anonProfile} = useAnonymousMode()
  const isCurrentUserAnonymous =
    currentAccount?.did === profile.did && isAnonymous
  const verification = useSimpleVerificationState({profile})

  return (
    <View pointerEvents="none">
      <Text
        emoji
        testID="profileHeaderDisplayName"
        style={[
          t.atoms.text,
          gtMobile ? a.text_4xl : a.text_3xl,
          a.self_start,
          a.font_bold,
        ]}>
        {formatUserDisplayName({
          displayName: isCurrentUserAnonymous
            ? anonProfile?.displayName
            : profile.displayName,
          handle: profile.handle,
          isFigure: isCurrentUserAnonymous ? false : verification.isVerified,
          isAnonymous: isCurrentUserAnonymous,
          moderation: moderation.ui('displayName'),
        })}
      </Text>
    </View>
  )
}
