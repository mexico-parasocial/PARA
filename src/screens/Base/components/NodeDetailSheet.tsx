import {useMemo, useState} from 'react'
import {Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {RELATIONSHIP_TYPES} from '#/state/queries/deliberation'
import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {VotingButtonHorizontal} from '#/components/VotingButtonHorizontal'
import {CARD_TYPE_COLORS} from '../deliberation-colors'
import {type GraphEdge, type GraphNode} from '../deliberation-types'
import {computeSuggestedConnections, type SuggestedTarget} from './suggestion-engine'

interface NodeDetail {
  id: string
  title: string
  content: string | null
  card_type: string
  author_did: string
  source_url: string | null
  influence?: number
}

interface NodeDetailSheetProps {
  node: NodeDetail | null
  availableNodes?: GraphNode[]
  availableEdges?: GraphEdge[]
  visible: boolean
  onClose: () => void
  voterDid?: string
  userVote?: number
  onVote?: (cardId: string, influence: number) => void
  onCreateRelationship?: (
    sourceCardId: string,
    targetCardId: string,
    relationshipType: string,
  ) => void
  isCreatingRelationship?: boolean
}

// Map reasonType to a display color for the reason badge
const REASON_TYPE_COLORS: Record<string, string> = {
  dialectical_tension: '#ef4444',
  structural_bridge: '#8b5cf6',
  same_source: '#06b6d4',
  compass_proximity: '#f59e0b',
  topic_overlap: '#3b82f6',
  same_type: '#10b981',
  influence_gravity: '#ec4899',
}

export function NodeDetailSheet({
  node,
  availableNodes = [],
  availableEdges = [],
  visible,
  onClose,
  voterDid,
  userVote = 0,
  onVote,
  onCreateRelationship,
  isCreatingRelationship,
}: NodeDetailSheetProps) {
  const t = useTheme()
  const [showConnect, setShowConnect] = useState(false)
  const [targetQuery, setTargetQuery] = useState('')
  const [selectedTargetId, setSelectedTargetId] = useState<string>()
  const [relationshipType, setRelationshipType] = useState<string>(
    RELATIONSHIP_TYPES[0]?.value ?? 'supports',
  )

  // ── Civic-aware suggestions ──────────────────────────────────────
  const suggestedTargets: SuggestedTarget[] = useMemo(() => {
    if (!node || availableNodes.length === 0) return []
    // Build a ScoringNode from the currently selected node detail
    const sourceNode = {
      id: node.id,
      title: node.title,
      content: node.content,
      card_type: node.card_type,
      author_did: node.author_did,
      source_url: node.source_url,
      influence: node.influence,
      // Try to find the full GraphNode to get stance/compass/metadata
      ...(() => {
        const full = availableNodes.find(n => n.id === node.id)
        return full
          ? {
              stance: full.stance,
              compass_quadrant: full.compass_quadrant,
              vote_count: full.vote_count,
              metadata: full.metadata,
            }
          : {}
      })(),
    }

    // Build ScoringNodes from available graph nodes
    const scoringNodes = availableNodes.map(n => ({
      id: n.id,
      title: n.title,
      content: n.content ?? null,
      card_type: n.card_type,
      author_did: n.author_did,
      source_url: n.source_url ?? null,
      stance: n.stance,
      compass_quadrant: n.compass_quadrant,
      influence: n.influence,
      vote_count: n.vote_count,
      metadata: n.metadata ?? null,
    }))

    // Build ScoringEdges
    const scoringEdges = availableEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      relationship_type: e.relationship_type,
    }))

    return computeSuggestedConnections(sourceNode, scoringNodes, scoringEdges, 3)
  }, [node, availableNodes, availableEdges])

  // ── Filtered targets for manual search ──────────────────────────
  const filteredTargets = useMemo(() => {
    if (!node) return []
    const query = targetQuery.trim().toLowerCase()
    return availableNodes
      .filter(candidate => candidate.id !== node.id)
      .filter(candidate =>
        query ? candidate.title.toLowerCase().includes(query) : true,
      )
      .slice(0, 8)
  }, [availableNodes, node, targetQuery])

  if (!node) return null

  const color = CARD_TYPE_COLORS[node.card_type] || '#6b7280'
  const totalInfluence = node.influence ?? 0
  const canVote = !!voterDid && !!onVote
  const canConnect = !!voterDid && !!onCreateRelationship
  const showSuggestions =
    suggestedTargets.length > 0 && targetQuery.trim().length === 0

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, {backgroundColor: t.palette.contrast_0}]}>
          <View style={styles.header}>
            <Text style={[styles.title, {color: t.palette.contrast_900}]}>
              {node.title}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close detail"
              accessibilityHint="Closes card detail panel"
              onPress={onClose}
              style={styles.closeBtn}>
              <Text style={{color: t.palette.contrast_500, fontSize: 20}}>
                ×
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.metaRow}>
            <View
              style={[styles.badge, {backgroundColor: color + '20'}]}>
              <Text style={[styles.badgeText, {color}]}>
                {node.card_type}
              </Text>
            </View>
            <Text style={[styles.meta, {color: t.palette.contrast_500}]}>
              {node.author_did.slice(0, 24)}...
            </Text>
          </View>

          {node.content && (
            <Text
              style={[styles.content, {color: t.palette.contrast_700}]}
              numberOfLines={6}>
              {node.content}
            </Text>
          )}

          {node.source_url && (
            <Text
              style={[styles.url, {color: t.palette.primary_500}]}
              numberOfLines={1}>
              {node.source_url}
            </Text>
          )}

          {/* Influence Section */}
          <View
            style={[
              styles.influenceSection,
              {borderTopColor: t.palette.contrast_100},
            ]}>
            <View style={styles.influenceHeader}>
              <Text
                style={[
                  styles.influenceLabel,
                  {color: t.palette.contrast_700},
                ]}>
                <Trans>Influence</Trans>
              </Text>
              <Text
                style={[
                  styles.influenceTotal,
                  {
                    color:
                      totalInfluence > 0
                        ? '#22c55e'
                        : totalInfluence < 0
                          ? '#ef4444'
                          : t.palette.contrast_500,
                  },
                ]}>
                {totalInfluence > 0 ? `+${totalInfluence}` : totalInfluence}
              </Text>
            </View>
            {canVote ? (
              <View style={styles.sliderRow}>
                <VotingButtonHorizontal
                  initialVote={userVote}
                  onVoteChange={val => onVote(node.id, val)}
                />
              </View>
            ) : (
              <Text
                style={[
                  styles.influenceHint,
                  {color: t.palette.contrast_400},
                ]}>
                <Trans>Sign in to influence this claim</Trans>
              </Text>
            )}
          </View>

          {canConnect && (
            <View
              style={[
                styles.connectSection,
                {borderTopColor: t.palette.contrast_100},
              ]}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Conectar con otro nodo"
                accessibilityHint="Abre una herramienta opcional para relacionar este nodo con otro"
                onPress={() => setShowConnect(prev => !prev)}
                style={[
                  styles.connectToggle,
                  {borderColor: t.palette.contrast_200},
                ]}>
                <Text
                  style={[
                    styles.connectToggleText,
                    {color: t.palette.primary_500},
                  ]}>
                  <Trans>Conectar con otro nodo</Trans>
                </Text>
              </TouchableOpacity>

              {showConnect && (
                <View style={styles.connectPanel}>
                  <Text style={[styles.connectHint, t.atoms.text_contrast_medium]}>
                    <Trans>Optional: create a relationship to help read the map.</Trans>
                  </Text>

                  {/* ── Suggested Connections ──────────────────────── */}
                  {showSuggestions && (
                    <View style={styles.suggestionsSection}>
                      <Text
                        style={[
                          styles.suggestionsSectionTitle,
                          {color: t.palette.contrast_600},
                        ]}>
                        <Trans>Sugeridos</Trans>
                      </Text>
                      {suggestedTargets.map(suggestion => {
                        const selected = suggestion.node.id === selectedTargetId
                        const reasonColor =
                          REASON_TYPE_COLORS[suggestion.reasonType] ||
                          t.palette.primary_500
                        const nodeColor =
                          CARD_TYPE_COLORS[suggestion.node.card_type] || '#6b7280'
                        return (
                          <TouchableOpacity
                            key={suggestion.node.id}
                            accessibilityRole="button"
                            accessibilityLabel={`Sugerido: ${suggestion.node.title}`}
                            accessibilityHint={`${suggestion.reason}: ${suggestion.reasonDetail}`}
                            accessibilityState={{selected}}
                            onPress={() =>
                              setSelectedTargetId(suggestion.node.id)
                            }
                            style={[
                              styles.suggestionRow,
                              {
                                borderColor: selected
                                  ? t.palette.primary_500
                                  : reasonColor + '40',
                                backgroundColor: selected
                                  ? t.palette.primary_500 + '08'
                                  : reasonColor + '06',
                              },
                            ]}>
                            <View style={styles.suggestionLeft}>
                              {/* Colored accent bar */}
                              <View
                                style={[
                                  styles.suggestionAccent,
                                  {backgroundColor: reasonColor},
                                ]}
                              />
                              <View style={styles.suggestionTextWrap}>
                                <Text
                                  style={[
                                    styles.suggestionTitle,
                                    {color: t.palette.contrast_900},
                                  ]}
                                  numberOfLines={1}>
                                  {suggestion.node.title}
                                </Text>
                                <View style={styles.suggestionMetaRow}>
                                  {/* Card type chip */}
                                  <View
                                    style={[
                                      styles.suggestionTypeChip,
                                      {backgroundColor: nodeColor + '18'},
                                    ]}>
                                    <Text
                                      style={[
                                        styles.suggestionTypeText,
                                        {color: nodeColor},
                                      ]}>
                                      {suggestion.node.card_type}
                                    </Text>
                                  </View>
                                  {/* Reason badge */}
                                  <View
                                    style={[
                                      styles.suggestionReasonBadge,
                                      {backgroundColor: reasonColor + '15'},
                                    ]}>
                                    <Text
                                      style={[
                                        styles.suggestionReasonText,
                                        {color: reasonColor},
                                      ]}>
                                      {suggestion.reason}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                            {selected ? (
                              <Text style={{color: t.palette.primary_500}}>
                                ✓
                              </Text>
                            ) : (
                              <Text
                                style={[
                                  styles.suggestionScore,
                                  {color: t.palette.contrast_400},
                                ]}>
                                {Math.round(suggestion.score)}
                              </Text>
                            )}
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  )}

                  {/* ── Manual Search ─────────────────────────────── */}
                  <TextInput
                    value={targetQuery}
                    onChangeText={setTargetQuery}
                    accessibilityLabel="Buscar nodo para conectar"
                    accessibilityHint="Filters available nodes by title"
                    placeholder="Buscar nodo"
                    placeholderTextColor={t.palette.contrast_400}
                    style={[
                      styles.connectInput,
                      t.atoms.text,
                      {borderColor: t.palette.contrast_100},
                    ]}
                  />

                  {/* ── Relationship type chips ───────────────────── */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.relationshipTypes}>
                    {RELATIONSHIP_TYPES.map(type => {
                      const active = relationshipType === type.value
                      return (
                        <TouchableOpacity
                          key={type.value}
                          accessibilityRole="button"
                          accessibilityLabel={`Relationship: ${type.label}`}
                          accessibilityHint="Selects the connection type between nodes"
                          accessibilityState={{selected: active}}
                          onPress={() => setRelationshipType(type.value)}
                          style={[
                            styles.relationshipType,
                            {
                              borderColor: active
                                ? type.color
                                : t.palette.contrast_100,
                              backgroundColor: active
                                ? type.color + '18'
                                : t.palette.contrast_25,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.relationshipTypeText,
                              {color: active ? type.color : t.palette.contrast_700},
                            ]}>
                            {type.label}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>

                  {/* ── Filtered target list (manual search results) ── */}
                  <View style={styles.targetList}>
                    {filteredTargets.length === 0 ? (
                      <Text style={[styles.connectHint, t.atoms.text_contrast_medium]}>
                        <Trans>No hay nodos disponibles para conectar.</Trans>
                      </Text>
                    ) : (
                      filteredTargets.map(candidate => {
                        const selected = candidate.id === selectedTargetId
                        return (
                          <TouchableOpacity
                            key={candidate.id}
                            accessibilityRole="button"
                            accessibilityLabel={`Seleccionar ${candidate.title}`}
                            accessibilityHint="Choose this node as the connection destination"
                            accessibilityState={{selected}}
                            onPress={() => setSelectedTargetId(candidate.id)}
                            style={[
                              styles.targetRow,
                              {
                                borderColor: selected
                                  ? t.palette.primary_500
                                  : t.palette.contrast_100,
                              },
                            ]}>
                            <View style={styles.targetTextWrap}>
                              <Text
                                style={[styles.targetTitle, t.atoms.text]}
                                numberOfLines={1}>
                                {candidate.title}
                              </Text>
                              <Text
                                style={[
                                  styles.targetMeta,
                                  t.atoms.text_contrast_medium,
                                ]}>
                                {candidate.card_type}
                              </Text>
                            </View>
                            {selected ? (
                              <Text style={{color: t.palette.primary_500}}>✓</Text>
                            ) : null}
                          </TouchableOpacity>
                        )
                      })
                    )}
                  </View>

                  {/* ── Create connection button ──────────────────── */}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Create connection"
                    accessibilityHint="Creates the selected relationship with the chosen node"
                    disabled={!selectedTargetId || isCreatingRelationship}
                    onPress={() => {
                      if (!selectedTargetId || !onCreateRelationship) return
                      onCreateRelationship(node.id, selectedTargetId, relationshipType)
                      setShowConnect(false)
                      setSelectedTargetId(undefined)
                      setTargetQuery('')
                    }}
                    style={[
                      styles.createConnectionBtn,
                      {backgroundColor: t.palette.primary_500},
                      (!selectedTargetId || isCreatingRelationship) && {opacity: 0.5},
                    ]}>
                    <Text style={styles.createConnectionText}>
                      <Trans>Create connection</Trans>
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          </ScrollView>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close"
            accessibilityHint="Closes card detail panel"
            style={[styles.doneBtn, {borderColor: t.palette.contrast_200}]}
            onPress={onClose}>
            <Text style={{color: t.palette.primary_500, fontWeight: '600'}}>
              <Trans>Done</Trans>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    lineHeight: 22,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  meta: {
    fontSize: 12,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  url: {
    fontSize: 13,
    marginBottom: 16,
  },
  influenceSection: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginBottom: 16,
  },
  influenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  influenceLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  influenceTotal: {
    fontSize: 15,
    fontWeight: '700',
  },
  sliderRow: {
    alignItems: 'center',
  },
  influenceHint: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  connectSection: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginBottom: 16,
    gap: 10,
  },
  connectToggle: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  connectToggleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  connectPanel: {
    gap: 10,
  },
  connectHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  // ── Suggestions section ──
  suggestionsSection: {
    gap: 6,
  },
  suggestionsSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  suggestionRow: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  suggestionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionAccent: {
    width: 3,
    height: 32,
    borderRadius: 2,
  },
  suggestionTextWrap: {
    flex: 1,
    gap: 3,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  suggestionTypeChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  suggestionTypeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  suggestionReasonBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  suggestionReasonText: {
    fontSize: 10,
    fontWeight: '700',
  },
  suggestionScore: {
    fontSize: 11,
    fontWeight: '600',
  },
  // ── Search & targets ──
  connectInput: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  relationshipTypes: {
    gap: 8,
    paddingRight: 8,
  },
  relationshipType: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  relationshipTypeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  targetList: {
    gap: 8,
  },
  targetRow: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  targetTextWrap: {
    flex: 1,
  },
  targetTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  targetMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  createConnectionBtn: {
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  createConnectionText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '900',
  },
  doneBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
  },
})
