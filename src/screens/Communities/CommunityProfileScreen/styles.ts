import {StyleSheet} from 'react-native'

export const styles = StyleSheet.create({
  feedScroll: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabsInner: {
    flexDirection: 'row',
    padding: 3,
  },
  pillTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  pillTabActive: {
    shadowColor: '#6366f1',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  pillTabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  contentArea: {
    padding: 16,
  },
  // Posts Section - Enhanced
  postsContainer: {
    gap: 12,
  },
  postContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  postLayout: {
    flexDirection: 'row',
    gap: 12,
  },
  postAvatarColumn: {
    width: 42,
  },
  postContentColumn: {
    flex: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  postAuthorName: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  postAuthorHandle: {
    fontSize: 14,
    flexShrink: 1,
  },
  postTime: {
    fontSize: 14,
  },
  postContext: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pinnedBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pinnedText: {
    fontSize: 11,
    color: '#666',
  },
  postBody: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  voteControlContainer: {
    marginRight: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
  },
  // Old post styles (keeping voteButton and voteCount for backwards compat)
  postVotes: {
    alignItems: 'center',
    marginRight: 12,
    gap: 4,
  },
  voteButton: {
    fontSize: 18,
  },
  voteCount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  postContent: {
    flex: 1,
  },
  postMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  postAuthor: {
    fontSize: 12,
  },
  postComments: {
    fontSize: 12,
  },
  aboutCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  estandarteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  estandarteToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  aboutHelperText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  aboutInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  aboutLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    width: 100,
  },
  aboutValue: {
    fontSize: 14,
    flex: 1,
  },
  badgesSection: {
    marginTop: 12,
  },
  badgesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  badgesSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  badgesSectionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgesSectionButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgesCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgesStatCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  badgesStatCount: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  badgesStatLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  rulesCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rulesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  ruleNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ruleNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 32,
  },
  // New About Section Styles
  aboutContainer: {
    gap: 12,
  },
  sectionCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 10,
  },
  sectionCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  civicActionsHeader: {
    marginBottom: 16,
  },
  civicActionsSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -6,
  },
  civicActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  civicActionCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  civicActionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  civicActionSigil: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  civicActionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  civicActionSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  governanceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  governanceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  governanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  governanceAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  governanceAvatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  governanceBody: {
    flex: 1,
  },
  governanceTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  governanceSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  governanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  governanceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  repCard: {
    borderTopWidth: 1,
    paddingTop: 14,
    paddingBottom: 4,
  },
  repHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  repHeaderText: {
    flex: 1,
  },
  repName: {
    fontSize: 16,
    fontWeight: '700',
  },
  repOffice: {
    fontSize: 13,
    marginTop: 2,
  },
  repMandate: {
    fontSize: 14,
    lineHeight: 20,
  },
  flexOne: {
    flex: 1,
  },
  deputyIntro: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: -8,
  },
  deputyCard: {
    borderTopWidth: 1,
    paddingTop: 14,
    paddingBottom: 4,
  },
  deputyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  deputyTier: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  deputyRole: {
    fontSize: 16,
    fontWeight: '700',
  },
  deputyMetricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  deputyMetricCard: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
  },
  deputyMetricLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  deputyMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  deputyApplicantsWrap: {
    gap: 8,
  },
  applicantChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  applicantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  applicantChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  policyTreeItem: {
    gap: 12,
  },
  policyTreeHeader: {
    marginBottom: 8,
  },
  policyTreeTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultsSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  resultsSectionLabel: {
    fontSize: 14,
  },
  resultsSectionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  statsLabel: {
    flex: 1,
    fontSize: 13,
  },
  statsHeader: {
    width: 50,
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statsValue: {
    width: 50,
    fontSize: 13,
    textAlign: 'center',
  },
  badgeContainer: {
    alignItems: 'flex-end',
    marginVertical: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  extendedStatsTable: {
    marginTop: 12,
    gap: 8,
  },
  expandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  expandCardContent: {
    flex: 1,
  },
  expandCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  expandCardSubtitle: {
    fontSize: 14,
  },
  expandIcon: {
    fontSize: 24,
  },
  draftBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  draftBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  draftBannerBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  chamberBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  chamberBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  chamberBannerBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  quorumBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  quorumBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Feed States
  feedLoadingWrap: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
    gap: 12,
  },
  feedLoadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  feedErrorCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center' as const,
    gap: 8,
    marginTop: 20,
  },
  feedErrorTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  feedErrorBody: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center' as const,
  },
  feedRetryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 4,
  },
  feedRetryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  feedEmptyWrap: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
    gap: 8,
  },
  feedEmptyIcon: {
    fontSize: 40,
  },
  feedEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  feedEmptyBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center' as const,
    maxWidth: 280,
  },
})
