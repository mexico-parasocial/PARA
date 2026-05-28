import {
  type CommunityAxis,
  type OpenQuestion,
  type ProposedQuestion,
  type RAQAxisSection,
} from './types'

export const OPEN_QUESTIONS: OpenQuestion[] = [
  {
    id: '1',
    text: 'What do you think is the biggest challenge for urbanism in Mexico City?',
    author: {
      handle: 'urban_planner_99',
      avatar: '',
    },
    replyCount: 42,
    timestamp: '2h ago',
  },
  {
    id: '2',
    text: 'How should we balance freedom of speech with misinformation?',
    author: {
      handle: 'philosopher_king',
      avatar: '',
    },
    replyCount: 156,
    timestamp: '5h ago',
  },
  {
    id: '3',
    text: 'Is universal basic income strictly a leftist policy?',
    author: {
      handle: 'econ_student',
      avatar: '',
    },
    replyCount: 89,
    timestamp: '1d ago',
  },
  {
    id: '4',
    text: 'What is the most underrated political philosophy?',
    author: {
      handle: 'history_buff',
      avatar: '',
    },
    replyCount: 230,
    timestamp: '2d ago',
  },
]

export const PROPOSED_QUESTIONS: ProposedQuestion[] = [
  {
    id: 'prop_1',
    text: 'Should AI development be paused until safety is guaranteed?',
    targetCommunity: 'Tech Ethics',
    upvotes: 120,
    downvotes: 45,
    isMainstream: false,
  },
  {
    id: 'prop_2',
    text: 'Is universal basic income necessary in a post-labor economy?',
    upvotes: 340,
    downvotes: 110,
    isMainstream: true,
  },
  {
    id: 'prop_3',
    text: 'Should social media algorithms be transparent by law?',
    targetCommunity: 'Digital Rights',
    upvotes: 89,
    downvotes: 12,
    isMainstream: false,
  },
]

export const COMMUNITY_AXES: CommunityAxis[] = [
  {
    id: 'c1',
    name: 'Technology',
    description: 'Primitivism vs Transhumanism',
    color: '#AF52DE',
    votes: 1240,
    author: 'futurist_99',
  },
  {
    id: 'c2',
    name: 'Centralization',
    description: 'Decentralized vs Centralized',
    color: '#FF9500',
    votes: 890,
    author: 'crypto_fan',
  },
  {
    id: 'c3',
    name: 'Environment',
    description: 'Industrial vs Ecological',
    color: '#5AC8FA',
    votes: 650,
    author: 'eco_warrior',
  },
  {
    id: 'c4',
    name: 'Globalism',
    description: 'Global vs National',
    color: '#5856D6',
    votes: 400,
    author: 'pol_sci',
  },
]

export const RAQ_AXES: RAQAxisSection[] = [
  {
    id: 'eco_coord',
    title: '1. ECONOMIC COORDINATION',
    labelLow: 'Market',
    labelHigh: 'Planning',
    data: [
      {
        id: '1_1',
        text: 'Key industries should be planned or coordinated by the state rather than left to the market.',
      },
      {
        id: '1_2',
        text: 'Markets alone cannot reliably allocate resources in the public interest.',
      },
      {
        id: '1_3',
        text: 'Government should actively guide long-term economic development.',
      },
      {
        id: '1_4',
        text: 'Essential goods should not be subject to pure supply-and-demand pricing.',
      },
      {
        id: '1_5',
        text: 'Price controls on essential goods are justified even if they cause temporary shortages or reduce supply.',
      },
      {
        id: '1_6',
        text: 'The government should directly own banking and energy sectors, not merely regulate them.',
      },
      {
        id: '1_7',
        text: 'Innovation happens faster under centralized planning than under competitive markets.',
      },
    ],
  },
  {
    id: 'eco_dist',
    title: '2. ECONOMIC DISTRIBUTION',
    labelLow: 'Merit',
    labelHigh: 'Equality',
    data: [
      {
        id: '2_1',
        text: 'Wealth ceilings should exist where 95th percentile earnings cant exceed 20x median',
      },
      {
        id: '2_2',
        text: 'Inheritance tax rates should exceed 50% for estates above $10M',
      },
      {
        id: '2_3',
        text: 'Economic equality is more important than economic incentives.',
      },
      {
        id: '2_4',
        text: 'Should governments mandate basic universal healthcare coverage, even if it reduces private sector competition?',
      },
      {id: '2_5', text: 'Excessive wealth accumulation undermines democracy.'},
      {
        id: '2_6',
        text: 'Progressive taxation is justified even if they demonstrably slow overall economic growth',
      },
      {
        id: '2_7',
        text: 'A society with limited growth but far less inequality is preferable to one with higher growth but also large income gaps.',
      },
    ],
  },
  {
    id: 'prop_comm',
    title: '3. PROPERTY & COMMONS',
    labelLow: 'Private',
    labelHigh: 'Common',
    data: [
      {
        id: '3_1',
        text: 'Some forms of property should belong to society as a whole.',
      },
      {id: '3_2', text: 'Private ownership should have social obligations.'},
      {
        id: '3_3',
        text: 'Land and natural resources should not be treated purely as commodities.',
      },
      {
        id: '3_4',
        text: 'Property rights should be limited when they conflict with public good.',
      },
      {
        id: '3_5',
        text: 'Collective ownership can be more legitimate than private ownership.',
      },
      {
        id: '3_6',
        text: 'The right to property should be conditional, not absolute.',
      },
      {
        id: '3_7',
        text: 'Intellectual property protections should be significantly weakened or abolished for public benefit',
      },
    ],
  },
  {
    id: 'env_pol',
    title: '4. ENVIRONMENTAL POLICY',
    labelLow: 'Anthropocentric',
    labelHigh: 'Ecocentric',
    data: [
      {
        id: '4_1',
        text: 'Economic growth should be limited when it threatens environmental stability.',
      },
      {
        id: '4_2',
        text: 'Future generations welfare justifies significant restrictions on current consumption.',
      },
      {
        id: '4_3',
        text: 'Rights of nature should be legally recognized even when conflicting with human development.',
      },
      {
        id: '4_4',
        text: 'Carbon emissions should be taxed heavily regardless of economic impact.',
      },
      {
        id: '4_5',
        text: 'Nuclear energy should be expanded despite waste concerns to address climate change.',
      },
      {
        id: '4_6',
        text: 'Individual consumption choices matter less than systemic economic transformation for environmental protection.',
      },
      {
        id: '4_7',
        text: 'Biodiversity preservation justifies restricting agricultural expansion.',
      },
    ],
  },
  {
    id: 'state_auth',
    title: '5. STATE AUTHORITY',
    labelLow: 'Limited',
    labelHigh: 'Strong',
    data: [
      {
        id: '5_1',
        text: 'Government surveillance of private communications is acceptable when preventing terrorism',
      },
      {
        id: '5_2',
        text: 'Centralized authority is sometimes required for effective governance.',
      },
      {
        id: '5_3',
        text: 'Political stability is more important than maintaining press freedoms during crises"',
      },
      {
        id: '5_4',
        text: 'The state should have authority to suspend fair trial rights during national emergencies',
      },
      {
        id: '5_5',
        text: 'Public authority should override private power when necessary.',
      },
      {id: '5_6', text: 'Fragmented authority leads to instability.'},
      {
        id: '5_7',
        text: 'National institutions should be stronger than regional ones.',
      },
    ],
  },
  {
    id: 'dem_struc',
    title: '6. DEMOCRATIC STRUCTURE',
    labelLow: 'Representative',
    labelHigh: 'Direct',
    data: [
      {
        id: '6_1',
        text: 'Citizens should have direct influence over major political decisions.',
      },
      {
        id: '6_2',
        text: 'Citizens should have power to overturn legislative decisions through binding referendums',
      },
      {id: '6_3', text: 'Popular participation improves political outcomes.'},
      {
        id: '6_4',
        text: 'Political power should be accountable to the public at all times.',
      },
      {
        id: '6_5',
        text: 'Sortition (random citizen selection) should replace some or all elected representatives.',
      },
      {id: '6_6', text: 'Ordinary people are capable of governing themselves.'},
      {
        id: '6_7',
        text: 'Democracy should prioritize legitimacy over efficiency.',
      },
    ],
  },
  {
    id: 'civ_lib',
    title: '7. CIVIL LIBERTIES',
    labelLow: 'Order',
    labelHigh: 'Liberty',
    data: [
      {
        id: '7_1',
        text: 'Individual freedoms should be protected even at social cost.',
      },
      {id: '7_2', text: 'The state should not interfere in private life.'},
      {
        id: '7_3',
        text: 'Security does not justify sacrificing civil liberties.',
      },
      {id: '7_4', text: 'Surveillance should be strictly limited.'},
      {
        id: '7_5',
        text: 'Freedom of expression must be protected even when speech causes demonstrable social harm',
      },
      {id: '7_6', text: 'Dissent is essential to a healthy society.'},
      {id: '7_7', text: 'Laws should err on the side of liberty.'},
    ],
  },
  {
    id: 'cult_ord',
    title: '8. CULTURAL ORDER',
    labelLow: 'Traditional',
    labelHigh: 'Egalitarian',
    data: [
      {
        id: '8_1',
        text: 'Social hierarchies are often unjustified and should not determine opportunity.',
      },
      {id: '8_2', text: 'Gender roles should not be socially enforced.'},
      {id: '8_3', text: 'Cultural norms should be open to change.'},
      {id: '8_4', text: 'Tradition should not override individual choice.'},
      {id: '8_5', text: 'Authority based on custom deserves skepticism.'},
      {id: '8_6', text: 'Equality should outweigh cultural preservation.'},
      {id: '8_7', text: 'Cultural diversity strengthens society.'},
    ],
  },
  {
    id: 'nat_id',
    title: '9. NATIONAL IDENTITY',
    labelLow: 'Ethnic',
    labelHigh: 'Civic',
    data: [
      {
        id: '9_1',
        text: 'National identity should be based on civic/shared values, not ancestry.',
      },
      {
        id: '9_2',
        text: 'Immigrants should be free to maintain their original culture and language rather than being required to adopt the dominant national culture.',
      },
      {
        id: '9_3',
        text: 'Dual citizenship enriches national identity and should be encouraged rather than restricted.',
      },
      {id: '9_4', text: 'Cultural purity is a dangerous idea.'},
      {
        id: '9_5',
        text: 'Maintaining a specific ethnic or cultural majority should not be a goal of national immigration policy.',
      },
      {id: '9_6', text: 'Immigration strengthens national identity.'},
      {
        id: '9_7',
        text: 'Citizenship should be automatic for anyone born in the country regardless of parents legal status',
      },
    ],
  },
  {
    id: 'glob_rel',
    title: '10. GLOBAL RELATIONS',
    labelLow: 'Nationalist',
    labelHigh: 'Cosmopolitan',
    data: [
      {
        id: '10_1',
        text: 'My country should accept binding international climate commitments even if they significantly harm our economy',
      },
      {
        id: '10_2',
        text: 'Global institutions are necessary to solve global problems.',
      },
      {
        id: '10_3',
        text: 'National sovereignty should be limited by international law.',
      },
      {
        id: '10_4',
        text: 'Wealthy nations should be required to fund global health initiatives in poor countries',
      },
      {id: '10_5', text: 'Economic globalization benefits humanity overall.'},
      {
        id: '10_6',
        text: 'Global justice matters more than national advantage.',
      },
      {
        id: '10_7',
        text: 'The UN Security Council veto system should be abolished in favor of equal voting among all nations',
      },
    ],
  },
  {
    id: 'prog_chng',
    title: '11. PROGRESS & CHANGE',
    labelLow: 'Conservatism',
    labelHigh: 'Reform',
    data: [
      {
        id: '11_1',
        text: 'Social systems should be fundamentally reformed when unjust.',
      },
      {id: '11_2', text: 'Stability should not block necessary change.'},
      {
        id: '11_3',
        text: 'Progress requires challenging existing institutions.',
      },
      {
        id: '11_4',
        text: 'Revolutionary action is justified when democratic processes fail to address systemic injustice',
      },
      {id: '11_5', text: 'Tradition should not be preserved for its own sake.'},
      {id: '11_6', text: 'Innovation is more important than continuity.'},
      {
        id: '11_7',
        text: 'Artificial intelligence development should proceed at full speed even if it risks displacing human decision-making or other risks that cant be managed',
      },
    ],
  },
  {
    id: 'power_legit',
    title: '12. POWER LEGITIMATION',
    labelLow: 'Elite/Institutional',
    labelHigh: 'Popular/Emergent',
    data: [
      {
        id: '12_1',
        text: 'Popular opinion should guide governance decisions even when it conflicts with expert recommendations.',
      },
      {
        id: '12_2',
        text: 'Central banks should be controlled by elected officials rather than appointed technocrats',
      },
      {
        id: '12_3',
        text: 'Institutions should be responsive to public pressure rather than insulated from it.',
      },
      {
        id: '12_4',
        text: 'Important policy decisions on climate and public health should remain subject to democratic voting rather than being decided solely by scientific consensus.',
      },
      {
        id: '12_5',
        text: 'Mass participation strengthens governance quality rather than undermining it.',
      },
      {
        id: '12_6',
        text: 'An independent democratic agency(such as PARA) should be created to formally measure, and channel public opinion as a legitimate quantitative input for legislative decisions.',
      },
      {
        id: '12_7',
        text: 'Citizen assemblies selected by lottery should have binding veto power over parliamentary legislation',
      },
    ],
  },
]

// O(1) Lookups
export const OPEN_QUESTIONS_BY_ID: Record<string, OpenQuestion> =
  Object.fromEntries(OPEN_QUESTIONS.map(q => [q.id, q]))

export const PROPOSED_QUESTIONS_BY_ID: Record<string, ProposedQuestion> =
  Object.fromEntries(PROPOSED_QUESTIONS.map(q => [q.id, q]))

export const RAQ_AXES_BY_ID: Record<string, RAQAxisSection> =
  Object.fromEntries(RAQ_AXES.map(a => [a.id, a]))
