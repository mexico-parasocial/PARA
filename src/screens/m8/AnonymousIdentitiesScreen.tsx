import {useCallback, useEffect, useMemo, useState} from 'react'
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import {
  getAnonymousIdentities,
  patchAnonymousIdentity,
  patchAnonymousPostDmPolicy,
  postAnonymousGermLink,
  postAnonymousGermUnlink,
  postAnonymousIdentity,
} from '#/lib/m8/api'
import {type AnonymousIdentityCard} from '#/lib/m8/types'
import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export default function AnonymousIdentitiesScreen() {
  const t = useTheme()
  const [identities, setIdentities] = useState<AnonymousIdentityCard[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [contactUrls, setContactUrls] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const data = await getAnonymousIdentities()
    setIdentities(data.identities)
  }, [])

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
      .catch(err => console.warn('[m8] Failed to load anonymous identities:', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }, [load])

  const createIdentity = useCallback(async () => {
    try {
      setBusyId('new')
      await postAnonymousIdentity({surface: 'civic'})
      await load()
    } catch (err) {
      Alert.alert('Could not create card', getMessage(err))
    } finally {
      setBusyId(null)
    }
  }, [load])

  const archiveIdentity = useCallback(
    async (identity: AnonymousIdentityCard) => {
      try {
        setBusyId(identity.id)
        await patchAnonymousIdentity(identity.id, {status: 'archived'})
        await load()
      } catch (err) {
        Alert.alert('Could not archive card', getMessage(err))
      } finally {
        setBusyId(null)
      }
    },
    [load],
  )

  const linkGerm = useCallback(
    async (identity: AnonymousIdentityCard) => {
      const contactUrl = contactUrls[identity.id]?.trim()
      if (!contactUrl) {
        Alert.alert('Germ card link required', 'Paste a Germ burner-card or contact URL first.')
        return
      }
      try {
        setBusyId(identity.id)
        await postAnonymousGermLink(identity.id, {
          contactUrl,
          mode: 'germ-card-link',
        })
        await load()
      } catch (err) {
        Alert.alert('Could not link Germ', getMessage(err))
      } finally {
        setBusyId(null)
      }
    },
    [contactUrls, load],
  )

  const unlinkGerm = useCallback(
    async (identity: AnonymousIdentityCard) => {
      try {
        setBusyId(identity.id)
        await postAnonymousGermUnlink(identity.id)
        await load()
      } catch (err) {
        Alert.alert('Could not unlink Germ', getMessage(err))
      } finally {
        setBusyId(null)
      }
    },
    [load],
  )

  const toggleReplies = useCallback(
    async (identity: AnonymousIdentityCard, enabled: boolean) => {
      try {
        setBusyId(identity.id)
        for (const post of identity.posts) {
          await patchAnonymousPostDmPolicy(post.id, enabled ? 'requests' : 'off')
        }
        await load()
      } catch (err) {
        Alert.alert('Could not update private replies', getMessage(err))
      } finally {
        setBusyId(null)
      }
    },
    [load],
  )

  const activeCount = useMemo(
    () => identities.filter(identity => identity.status === 'active').length,
    [identities],
  )

  if (loading) {
    return (
      <View style={[styles.container, t.atoms.bg]}>
        <Text style={[styles.headerTitle, t.atoms.text]}>Anonymous identities</Text>
        <Text style={[styles.muted, t.atoms.text_contrast_medium]}>
          Loading your cards...
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, t.atoms.bg]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void onRefresh()
            }}
          />
        }
        contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, t.atoms.text]}>Anonymous identities</Text>
            <Text style={[styles.muted, t.atoms.text_contrast_medium]}>
              {activeCount} active cards
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Create anonymous identity card"
            accessibilityHint="Creates a new anonymous identity card"
            disabled={busyId !== null}
            onPress={() => {
              void createIdentity()
            }}
            style={[styles.primaryButton, {backgroundColor: t.palette.primary_500}]}>
            <Text style={styles.primaryButtonText}>New card</Text>
          </TouchableOpacity>
        </View>

        {identities.length === 0 ? (
          <View style={[styles.emptyState, t.atoms.bg_contrast_25, {borderColor: t.palette.contrast_100}]}>
            <Text style={[styles.cardTitle, t.atoms.text]}>No anonymous cards yet</Text>
            <Text style={[styles.muted, t.atoms.text_contrast_medium]}>
              Cards appear here when m8 links anonymous activity to a durable persona.
            </Text>
          </View>
        ) : (
          identities.map(identity => (
            <IdentityCard
              key={identity.id}
              identity={identity}
              contactUrl={contactUrls[identity.id] ?? ''}
              busy={busyId === identity.id}
              onContactUrlChange={value =>
                setContactUrls(prev => ({...prev, [identity.id]: value}))
              }
              onArchive={() => {
                void archiveIdentity(identity)
              }}
              onLinkGerm={() => {
                void linkGerm(identity)
              }}
              onUnlinkGerm={() => {
                void unlinkGerm(identity)
              }}
              onEnableReplies={() => {
                void toggleReplies(identity, true)
              }}
              onDisableReplies={() => {
                void toggleReplies(identity, false)
              }}
            />
          ))
        )}
      </ScrollView>
    </View>
  )
}

function IdentityCard({
  identity,
  contactUrl,
  busy,
  onContactUrlChange,
  onArchive,
  onLinkGerm,
  onUnlinkGerm,
  onEnableReplies,
  onDisableReplies,
}: {
  identity: AnonymousIdentityCard
  contactUrl: string
  busy: boolean
  onContactUrlChange: (value: string) => void
  onArchive: () => void
  onLinkGerm: () => void
  onUnlinkGerm: () => void
  onEnableReplies: () => void
  onDisableReplies: () => void
}) {
  const t = useTheme()
  const repliesEnabled = identity.posts.some(post => post.dmPolicy === 'requests')
  const canEnableReplies =
    identity.status === 'active' &&
    identity.germ?.status === 'active' &&
    identity.deviceTrust.status === 'trusted' &&
    identity.posts.length > 0

  return (
    <View style={[styles.card, t.atoms.bg_contrast_25, {borderColor: t.palette.contrast_100}]}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, {backgroundColor: colorFromSeed(identity.avatarSeed)}]}>
          <Text style={styles.avatarText}>{identity.displayName.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={[styles.cardTitle, t.atoms.text]} numberOfLines={1}>
            {identity.displayName}
          </Text>
          <Text style={[styles.muted, t.atoms.text_contrast_medium]} numberOfLines={1}>
            {identity.surface} · {identity.status}
          </Text>
        </View>
        <StatusBadge
          label={identity.deviceTrust.status === 'trusted' ? 'Trusted device' : 'Limited'}
          tone={identity.deviceTrust.status === 'trusted' ? 'positive' : 'neutral'}
        />
      </View>

      <View style={styles.metaGrid}>
        <Metric label="Posts" value={String(identity.posts.length)} />
        <Metric label="Proofs" value={String(identity.proofBadges.length)} />
        <Metric label="Germ" value={identity.germ?.status === 'active' ? 'Linked' : 'Off'} />
      </View>

      {identity.proofBadges.length > 0 && (
        <View style={styles.chips}>
          {identity.proofBadges.map(badge => (
            <View key={`${identity.id}-${badge.claimType}`} style={[styles.chip, {backgroundColor: t.palette.primary_500 + '18'}]}>
              <Text style={[styles.chipText, {color: t.palette.primary_500}]}>{badge.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.posts}>
        {identity.posts.length === 0 ? (
          <Text style={[styles.muted, t.atoms.text_contrast_medium]}>
            Anonymous posts will appear here after they are linked by PARA.
          </Text>
        ) : (
          identity.posts.slice(0, 3).map(post => (
            <View key={post.id} style={styles.postSummary}>
              <View style={styles.postRow}>
                <Text style={[styles.postUri, t.atoms.text]} numberOfLines={1}>
                  {post.postUri}
                </Text>
                <StatusBadge
                  label={post.dmPolicy === 'requests' ? 'Replies on' : 'Replies off'}
                  tone={post.dmPolicy === 'requests' ? 'positive' : 'neutral'}
                />
              </View>
              <View style={styles.postStats}>
                <PostStat label="Threads" value={post.stats.threadCount} />
                <PostStat label="Replies" value={post.stats.replyCount} />
                <PostStat label="Likes" value={post.stats.likeCount} />
                <PostStat label="Quotes" value={post.stats.quoteCount} />
              </View>
            </View>
          ))
        )}
      </View>

      {identity.germ?.status !== 'active' && identity.status === 'active' && (
        <View style={styles.germLinkBox}>
          <TextInput
            accessibilityLabel="Germ anonymous contact URL"
            accessibilityHint="Enter an opaque Germ contact link for this anonymous identity"
            autoCapitalize="none"
            autoCorrect={false}
            value={contactUrl}
            onChangeText={onContactUrlChange}
            placeholder="https://landing.ger.mx/..."
            placeholderTextColor={t.atoms.text_contrast_low.color}
            style={[
              styles.input,
              t.atoms.text,
              {borderColor: t.palette.contrast_100},
            ]}
          />
          <Text style={[styles.muted, t.atoms.text_contrast_medium]}>
            m8 stores this as an opaque Germ contact link and blocks links that expose your real DID.
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {identity.germ?.status === 'active' ? (
          <ActionButton label="Unlink Germ" disabled={busy} onPress={onUnlinkGerm} />
        ) : (
          <ActionButton label="Link Germ" disabled={busy || identity.status !== 'active'} onPress={onLinkGerm} />
        )}
        {repliesEnabled ? (
          <ActionButton label="Disable replies" disabled={busy} onPress={onDisableReplies} />
        ) : (
          <ActionButton label="Enable replies" disabled={busy || !canEnableReplies} onPress={onEnableReplies} />
        )}
        <ActionButton label="Archive" disabled={busy || identity.status === 'archived'} onPress={onArchive} />
      </View>
    </View>
  )
}

function Metric({label, value}: {label: string; value: string}) {
  const t = useTheme()
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, t.atoms.text]}>{value}</Text>
      <Text style={[styles.metricLabel, t.atoms.text_contrast_medium]}>{label}</Text>
    </View>
  )
}

function PostStat({label, value}: {label: string; value: number}) {
  const t = useTheme()
  return (
    <View style={[styles.postStat, {borderColor: t.palette.contrast_100}]}>
      <Text style={[styles.postStatValue, t.atoms.text]}>{formatCount(value)}</Text>
      <Text style={[styles.postStatLabel, t.atoms.text_contrast_medium]}>{label}</Text>
    </View>
  )
}

function StatusBadge({label, tone}: {label: string; tone: 'positive' | 'neutral'}) {
  const t = useTheme()
  const color = tone === 'positive' ? t.palette.positive_400 : t.palette.contrast_500
  return (
    <View style={[styles.badge, {backgroundColor: color + '18'}]}>
      <Text style={[styles.badgeText, {color}]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

function ActionButton({
  label,
  disabled,
  onPress,
}: {
  label: string
  disabled: boolean
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={`${label} for this anonymous identity card`}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        {
          borderColor: t.palette.contrast_100,
          opacity: disabled ? 0.45 : 1,
        },
      ]}>
      <Text style={[styles.actionButtonText, t.atoms.text]}>{label}</Text>
    </TouchableOpacity>
  )
}

function colorFromSeed(seed: string) {
  const colors = ['#176B87', '#3D7068', '#8A5A44', '#5C6F68', '#7A4E7D']
  const index = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length
  return colors[index]
}

function getMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Please try again.'
}

function formatCount(value: number) {
  if (value >= 1_000_000) return `${Math.floor(value / 100_000) / 10}M`
  if (value >= 1_000) return `${Math.floor(value / 100) / 10}K`
  return String(value)
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  muted: {
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metric: {
    flex: 1,
    gap: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  posts: {
    gap: 8,
  },
  postSummary: {
    gap: 8,
  },
  postRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postUri: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
  },
  postStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  postStat: {
    minWidth: 72,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  postStatValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  postStatLabel: {
    fontSize: 11,
  },
  badge: {
    maxWidth: 130,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  germLinkBox: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 42,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    minHeight: 38,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
})
