import { useCallback, useEffect, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLingui } from '@lingui/react'

import { m8Fetch } from '#/lib/m8/api'
import { useTheme } from '#/alf'
import { Text } from '#/components/Typography'

// ─── Types ─────────────────────────────────────────────────────────────────

interface IssuerInfo {
  did: string
  name: string
  country: string
  status: 'active' | 'suspended' | 'revoked'
  description?: string
  website?: string
}

interface TrustSettings {
  mode: 'whitelist' | 'any-known' | 'any'
  trustedDids: string[]
  blockedDids: string[]
  requireCountry: string[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchTrustedIssuers(): Promise<IssuerInfo[]> {
  try {
    const res = await m8Fetch('/issuers')
    if (!res.ok) return []
    const issuers = (await res.json()) as Array<{
      did: string
      name: string
      country: string
      status: 'active' | 'suspended' | 'revoked'
      publicKeyPem: string
      allowedElements: string[]
    }>
    return issuers.map(i => ({
      did: i.did,
      name: i.name,
      country: i.country,
      status: i.status,
      description: `Trusted issuer for: ${i.allowedElements.join(', ')}`,
      website: undefined,
    }))
  } catch {
    return []
  }
}

// ─── Trusted Issuers Screen ────────────────────────────────────────────────

export default function TrustedIssuersScreen() {
  const t = useTheme()
  const {} = useLingui()
  const [settings, setSettings] = useState<TrustSettings>({
    mode: 'any-known',
    trustedDids: ['did:m8:ine:emisor-001'],
    blockedDids: [],
    requireCountry: ['MX'],
  })
  const [issuers, setIssuers] = useState<IssuerInfo[]>([])
  const [expandedIssuer, setExpandedIssuer] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchTrustedIssuers()
      .then(data => {
        if (!cancelled) setIssuers(data.length ? data : [])
      })
      .catch(err => {
        console.warn('[m8] Failed to load issuers:', err)
      })
    return () => { cancelled = true }
  }, [])

  const toggleTrusted = useCallback((did: string) => {
    setSettings(prev => {
      const has = prev.trustedDids.includes(did)
      return {
        ...prev,
        trustedDids: has
          ? prev.trustedDids.filter(d => d !== did)
          : [...prev.trustedDids, did],
      }
    })
  }, [])

  const toggleBlocked = useCallback((did: string) => {
    setSettings(prev => {
      const has = prev.blockedDids.includes(did)
      return {
        ...prev,
        blockedDids: has
          ? prev.blockedDids.filter(d => d !== did)
          : [...prev.blockedDids, did],
      }
    })
  }, [])

  const setMode = useCallback((mode: TrustSettings['mode']) => {
    setSettings(prev => ({ ...prev, mode }))
  }, [])

  return (
    <View style={[styles.container, t.atoms.bg]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <Text style={[styles.headerTitle, t.atoms.text]}>Trusted Issuers</Text>
        <Text style={[styles.headerSubtitle, t.atoms.text_contrast_medium]}>
          Configure which credential issuers your app trusts
        </Text>

        {/* Trust Mode Selector */}
        <View style={[styles.modeCard, t.atoms.bg_contrast_25, { borderColor: t.palette.contrast_100 }]}>
          <Text style={[styles.modeTitle, t.atoms.text]}>Trust Mode</Text>

          {(['any', 'any-known', 'whitelist'] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              accessibilityRole="radio"
              accessibilityState={{ checked: settings.mode === mode }}
              onPress={() => setMode(mode)}
              style={styles.modeOption}
            >
              <View
                style={[
                  styles.modeRadio,
                  {
                    borderColor: settings.mode === mode ? t.palette.primary_500 : t.palette.contrast_200,
                    backgroundColor: settings.mode === mode ? t.palette.primary_500 : 'transparent',
                  },
                ]}
              >
                {settings.mode === mode && <Text style={styles.modeRadioDot}>●</Text>}
              </View>
              <View style={styles.modeLabelBox}>
                <Text style={[styles.modeLabel, t.atoms.text]}>{modeLabel(mode)}</Text>
                <Text style={[styles.modeDesc, t.atoms.text_contrast_medium]}>{modeDesc(mode)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Country Filter */}
        <View style={[styles.filterCard, t.atoms.bg_contrast_25, { borderColor: t.palette.contrast_100 }]}>
          <Text style={[styles.filterTitle, t.atoms.text]}>Country Filter</Text>
          <View style={styles.countryRow}>
            {['MX', 'US', 'CA'].map(country => (
              <TouchableOpacity accessibilityRole="button"
                key={country}
                onPress={() => {
                  setSettings(prev => {
                    const has = prev.requireCountry.includes(country)
                    return {
                      ...prev,
                      requireCountry: has
                        ? prev.requireCountry.filter(c => c !== country)
                        : [...prev.requireCountry, country],
                    }
                  })
                }}
                style={[
                  styles.countryChip,
                  {
                    backgroundColor: settings.requireCountry.includes(country)
                      ? t.palette.primary_500 + '20'
                      : t.palette.contrast_100 + '40',
                    borderColor: settings.requireCountry.includes(country)
                      ? t.palette.primary_500
                      : t.palette.contrast_200,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countryChipText,
                    {
                      color: settings.requireCountry.includes(country)
                        ? t.palette.primary_500
                        : t.atoms.text.color,
                    },
                  ]}
                >
                  {country === 'MX' ? '🇲🇽 Mexico' : country === 'US' ? '🇺🇸 USA' : '🇨🇦 Canada'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Issuer List */}
        <Text style={[styles.sectionTitle, t.atoms.text]}>Known Issuers</Text>
        {issuers.map(issuer => {
          const isTrusted = settings.trustedDids.includes(issuer.did)
          const isBlocked = settings.blockedDids.includes(issuer.did)
          const isExpanded = expandedIssuer === issuer.did

          return (
            <View
              key={issuer.did}
              style={[
                styles.issuerCard,
                t.atoms.bg_contrast_25,
                { borderColor: isBlocked ? t.palette.contrast_500 : t.palette.contrast_100 },
              ]}
            >
              <TouchableOpacity accessibilityRole="button"
                onPress={() => setExpandedIssuer(isExpanded ? null : issuer.did)}
                style={styles.issuerHeader}
              >
                <View style={styles.issuerLeft}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          issuer.status === 'active'
                            ? t.palette.primary_500
                            : issuer.status === 'suspended'
                              ? '#f59e0b'
                              : t.palette.contrast_500,
                      },
                    ]}
                  />
                  <View>
                    <Text style={[styles.issuerName, t.atoms.text]}>{issuer.name}</Text>
                    <Text style={[styles.issuerDid, t.atoms.text_contrast_medium]}>{issuer.did}</Text>
                  </View>
                </View>
                <Text style={[styles.issuerArrow, t.atoms.text_contrast_medium]}>
                  {isExpanded ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.issuerDetail}>
                  <Text style={[styles.issuerDesc, t.atoms.text_contrast_medium]}>
                    {issuer.description}
                  </Text>
                  {issuer.website && (
                    <Text style={[styles.issuerWeb, t.atoms.text_contrast_medium]}>
                      🌐 {issuer.website}
                    </Text>
                  )}

                  <View style={styles.issuerActions}>
                    <View style={styles.issuerToggleRow}>
                      <Text style={[styles.toggleLabel, t.atoms.text]}>Trusted</Text>
                      <Switch
                        value={isTrusted}
                        onValueChange={() => toggleTrusted(issuer.did)}
                        trackColor={{ false: t.palette.contrast_200, true: t.palette.primary_500 + '60' }}
                        thumbColor={isTrusted ? t.palette.primary_500 : t.palette.contrast_400}
                      />
                    </View>
                    <View style={styles.issuerToggleRow}>
                      <Text style={[styles.toggleLabel, t.atoms.text]}>Blocked</Text>
                      <Switch
                        value={isBlocked}
                        onValueChange={() => toggleBlocked(issuer.did)}
                        trackColor={{ false: t.palette.contrast_200, true: t.palette.contrast_500 + '60' }}
                        thumbColor={isBlocked ? t.palette.contrast_500 : t.palette.contrast_400}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          )
        })}

        {/* Summary */}
        <View style={[styles.summaryCard, t.atoms.bg_contrast_25, { borderColor: t.palette.contrast_100 }]}>
          <Text style={[styles.summaryTitle, t.atoms.text]}>Current Policy Summary</Text>
          <Text style={[styles.summaryItem, t.atoms.text_contrast_medium]}>
            Mode: {settings.mode}
          </Text>
          <Text style={[styles.summaryItem, t.atoms.text_contrast_medium]}>
            Trusted: {settings.trustedDids.length} issuers
          </Text>
          <Text style={[styles.summaryItem, t.atoms.text_contrast_medium]}>
            Blocked: {settings.blockedDids.length} issuers
          </Text>
          <Text style={[styles.summaryItem, t.atoms.text_contrast_medium]}>
            Countries: {settings.requireCountry.join(', ') || 'Any'}
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

function modeLabel(mode: string): string {
  switch (mode) {
    case 'any': return 'Allow Any Issuer'
    case 'any-known': return 'Allow Known Issuers'
    case 'whitelist': return 'Whitelist Only'
    default: return mode
  }
}

function modeDesc(mode: string): string {
  switch (mode) {
    case 'any': return 'Accept credentials from any issuer, even unknown ones'
    case 'any-known': return 'Only accept from issuers in this registry'
    case 'whitelist': return 'Only accept from explicitly trusted issuers below'
    default: return ''
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  modeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  modeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRadioDot: {
    color: '#fff',
    fontSize: 10,
  },
  modeLabelBox: {
    flex: 1,
    gap: 2,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  modeDesc: {
    fontSize: 12,
  },
  filterCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  countryRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  countryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  countryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  issuerCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  issuerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  issuerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  issuerName: {
    fontSize: 14,
    fontWeight: '700',
  },
  issuerDid: {
    fontSize: 11,
    marginTop: 1,
  },
  issuerArrow: {
    fontSize: 12,
    marginLeft: 8,
  },
  issuerDetail: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  issuerDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  issuerWeb: {
    fontSize: 12,
  },
  issuerActions: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 8,
  },
  issuerToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryItem: {
    fontSize: 13,
  },
})
