import {StyleSheet} from 'react-native'

import {DECK_CARD_HEIGHT, DECK_SECONDARY_TOP} from './helpers'

export const styles = StyleSheet.create({
  topChrome: {
    elevation: 20,
    zIndex: 20,
  },
  contentShell: {
    flex: 1,
    zIndex: 0,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
    paddingTop: 8,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  headerSearchContent: {
    paddingRight: 8,
    width: '100%',
  },
  headerIconButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  boardRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  boardCell: {
    flex: 1,
  },
  centeredState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  cardShell: {
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
    width: '100%',
  },
  cardVisual: {
    minHeight: 196,
    padding: 18,
  },
  mediaVisual: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  mediaVisualOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  cardBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 38,
  },
  cardVisualBottom: {
    gap: 10,
  },
  partyInsignia: {
    borderColor: 'rgba(15, 23, 42, 0.24)',
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 4,
    width: 32,
  },
  /*
   * Titles always sit on either a darkened thumbnail or the saturated fallback
   * color, so they are always light.
   */
  cardTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 29,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  cardBody: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardMeta: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deckShell: {
    flex: 1,
    overflow: 'hidden',
    paddingTop: 20,
  },
  deckStage: {
    alignSelf: 'center',
    flex: 1,
    position: 'relative',
  },
  deckBoundaryNotice: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: -4,
    zIndex: 20,
  },
  deckBoundaryNoticeInner: {
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  deckBoundaryNoticeText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  deckEndCard: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'absolute',
    right: 0,
    top: DECK_SECONDARY_TOP + 16,
    zIndex: 2,
  },
  deckEndTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  deckEndBody: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  deckCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'absolute',
  },
  deckPrimary: {
    left: 0,
    top: 0,
    zIndex: 3,
  },
  deckPrevIncoming: {
    left: 0,
    top: 0,
    zIndex: 5,
  },
  deckSecondary: {
    right: 0,
    top: DECK_SECONDARY_TOP,
    zIndex: 2,
  },
  deckHidden: {
    right: 0,
    top: DECK_SECONDARY_TOP * 2,
    zIndex: 1,
  },
  deckCardShell: {
    height: DECK_CARD_HEIGHT,
  },
  deckVisual: {
    padding: 15,
  },
  deckVisualBottom: {
    gap: 8,
    marginTop: 'auto',
  },
  deckBodyContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  deckTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  deckCommandCenter: {
    position: 'absolute',
    top: DECK_SECONDARY_TOP - 44,
    zIndex: 10,
  },
  deckCommandCenterZone: {
    alignItems: 'center',
    bottom: 0,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
  },
  commentChipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  metaPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    maxWidth: '100%',
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaPillOnImage: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaPillTextOnImage: {
    color: '#ffffff',
  },
  expandedModalOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  expandedModalDismiss: {
    ...StyleSheet.absoluteFill,
  },
  expandedModalSheet: {
    alignSelf: 'center',
    borderRadius: 16,
    maxHeight: '90%',
    maxWidth: 600,
    paddingHorizontal: 16,
    paddingTop: 12,
    width: '100%',
  },
  expandedScroll: {
    flexGrow: 0,
  },
  expandedHandle: {
    alignSelf: 'center',
    borderRadius: 8,
    height: 5,
    marginBottom: 14,
    width: 44,
  },
  expandedVisual: {
    borderRadius: 8,
    minHeight: 236,
    padding: 18,
  },
  expandedBody: {
    gap: 10,
    paddingHorizontal: 4,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 28,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 320,
    textAlign: 'center',
  },
})
