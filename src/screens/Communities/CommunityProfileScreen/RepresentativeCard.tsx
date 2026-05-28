import {TouchableOpacity, View} from 'react-native'

import type {
  CommunityGovernanceOfficialRepresentative,
  CommunityGovernancePerson,
} from '#/lib/api/para-lexicons'
import {type UsePaletteValue} from '#/lib/hooks/usePalette'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {Macintosh_Stroke2_Corner2_Rounded as MacintoshIcon} from '#/components/icons/Macintosh'
import {Message_Stroke2_Corner0_Rounded as ChatIcon} from '#/components/icons/Message'
import {ProfileHoverCard} from '#/components/ProfileHoverCard'
import {styles} from './styles'

export function RepresentativeCard({
  featuredRepresentative,
  agentDisplayName,
  agentRoleLabel,
  agentGovernanceRole,
  agentMandate,
  agentActorId,
  isGeographicGroup,
  onPressAgentProfile,
  onPressChat,
  pal,
}: {
  featuredRepresentative:
    | CommunityGovernanceOfficialRepresentative
    | CommunityGovernancePerson
    | null
  agentDisplayName: string
  agentRoleLabel: string
  agentGovernanceRole: string
  agentMandate: string
  agentActorId: string
  isGeographicGroup: boolean
  onPressAgentProfile: () => void
  onPressChat: () => void
  pal: UsePaletteValue
}) {
  const t = useTheme()

  if (isGeographicGroup) return null

  return (
    <View
      style={[
        styles.repCardContainer,
        {
          backgroundColor:
            t.scheme === 'dark'
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(99,102,241,0.04)',
          borderColor:
            t.scheme === 'dark'
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(99,102,241,0.12)',
        },
      ]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="View AI Delegate Profile"
        accessibilityHint="Navigates to the AI Delegate's profile page"
        onPress={onPressAgentProfile}
        disabled={!agentActorId}
        style={[
          styles.repCardTouchable,
          !featuredRepresentative && {paddingVertical: 8},
        ]}>
        <View style={styles.repAvatarWrap}>
          {featuredRepresentative?.did ? (
            <ProfileHoverCard inline did={featuredRepresentative.did}>
              <View
                style={[
                  styles.repAvatarCircle,
                  {
                    backgroundColor: featuredRepresentative
                      ? t.scheme === 'dark'
                        ? '#6366f1'
                        : t.palette.primary_500
                      : t.palette.contrast_100,
                  },
                ]}>
                <MacintoshIcon
                  style={{
                    color: featuredRepresentative
                      ? '#fff'
                      : t.palette.contrast_400,
                  }}
                  size="sm"
                />
              </View>
            </ProfileHoverCard>
          ) : (
            <View
              style={[
                styles.repAvatarCircle,
                {
                  backgroundColor: featuredRepresentative
                    ? t.scheme === 'dark'
                      ? '#6366f1'
                      : t.palette.primary_500
                    : t.palette.contrast_100,
                },
              ]}>
              <MacintoshIcon
                style={{
                  color: featuredRepresentative
                    ? '#fff'
                    : t.palette.contrast_400,
                }}
                size="sm"
              />
            </View>
          )}
          {/* Status dot */}
          <View
            style={[
              styles.repStatusDot,
              {
                backgroundColor: featuredRepresentative ? '#34d399' : '#9ca3af',
              },
            ]}
          />
        </View>
        <View style={{flex: 1}}>
          <Text
            style={[
              pal.text,
              {fontSize: 15, fontWeight: '700'},
              !featuredRepresentative && {
                color: t.palette.contrast_500,
              },
            ]}>
            {agentDisplayName}
          </Text>
          <Text
            style={[
              {
                fontSize: 12,
                color:
                  t.scheme === 'dark'
                    ? 'rgba(255,255,255,0.45)'
                    : t.palette.primary_400,
              },
              !featuredRepresentative && {
                color: t.palette.contrast_400,
              },
            ]}>
            {agentRoleLabel}
          </Text>
          {featuredRepresentative && (agentGovernanceRole || agentMandate) ? (
            <Text
              numberOfLines={1}
              style={[
                {
                  fontSize: 11,
                  marginTop: 2,
                  color: t.palette.contrast_500,
                },
              ]}>
              {agentGovernanceRole
                ? `${agentGovernanceRole}${agentMandate ? ` • ${agentMandate}` : ''}`
                : agentMandate}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onPressChat}
          style={[
            styles.repMessageBtn,
            {
              backgroundColor:
                t.scheme === 'dark' ? '#6366f1' : t.palette.primary_500,
            },
          ]}>
          <ChatIcon style={{color: '#fff'}} size="xs" />
          <Text style={styles.repMessageText}>Chat</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  )
}
