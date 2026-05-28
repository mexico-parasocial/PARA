import {type TopPolicy, type Voter} from './types'

export const TOP_POLICIES: TopPolicy[] = [
  {
    id: '1',
    title: 'Renewable Energy Initiative',
    votes: 156,
    percentage: 85,
    avgScore: 2.1,
  },
  {
    id: '2',
    title: 'Community Garden Expansion',
    votes: 132,
    percentage: 72,
    avgScore: 1.8,
  },
  {
    id: '3',
    title: 'Public Transport Funding',
    votes: 110,
    percentage: 60,
    avgScore: 0.9,
  },
  {
    id: '4',
    title: 'Local Art Grants',
    votes: 95,
    percentage: 52,
    avgScore: 1.2,
  },
]

export const VOTERS: Voter[] = [
  {
    did: 'did:plc:123',
    handle: 'xavier.bsky.social',
    displayName: 'Xavier Exul',
    avatar: undefined,
    totalVotes: 6,
    avgScore: 1.5,
    votes: [
      {policyId: 'p1', policyTitle: 'Renewable Energy Initiative', vote: 3},
      {policyId: 'p2', policyTitle: 'Community Garden Expansion', vote: 2},
      {policyId: 'p3', policyTitle: 'Public Transport Funding', vote: 1},
      {policyId: 'p4', policyTitle: 'Local Art Grants', vote: 2},
      {policyId: 'p5', policyTitle: 'Public Safety Budget', vote: -1},
      {policyId: 'p6', policyTitle: 'Education Modernization', vote: 2},
    ],
  },
  {
    did: 'did:plc:456',
    handle: 'jared.bsky.social',
    displayName: 'Jared Matthews',
    avatar: undefined,
    totalVotes: 4,
    avgScore: -0.5,
    votes: [
      {policyId: 'p1', policyTitle: 'Renewable Energy Initiative', vote: -2},
      {policyId: 'p2', policyTitle: 'Community Garden Expansion', vote: 1},
      {policyId: 'p3', policyTitle: 'Public Transport Funding', vote: -1},
      {policyId: 'p5', policyTitle: 'Public Safety Budget', vote: 0},
    ],
  },
  {
    did: 'did:plc:789',
    handle: 'alice.test',
    displayName: 'Alice Smith',
    avatar: undefined,
    totalVotes: 5,
    avgScore: 2.2,
    votes: [
      {policyId: 'p1', policyTitle: 'Renewable Energy Initiative', vote: 3},
      {policyId: 'p2', policyTitle: 'Community Garden Expansion', vote: 3},
      {policyId: 'p3', policyTitle: 'Public Transport Funding', vote: 2},
      {policyId: 'p4', policyTitle: 'Local Art Grants', vote: 1},
      {policyId: 'p6', policyTitle: 'Education Modernization', vote: 2},
    ],
  },
  {
    did: 'did:plc:101',
    handle: 'bob.test',
    displayName: 'Bob Wilson',
    avatar: undefined,
    totalVotes: 3,
    avgScore: -1.0,
    votes: [
      {policyId: 'p1', policyTitle: 'Renewable Energy Initiative', vote: -3},
      {policyId: 'p3', policyTitle: 'Public Transport Funding', vote: 0},
      {policyId: 'p5', policyTitle: 'Public Safety Budget', vote: 0},
    ],
  },
  {
    did: 'did:plc:102',
    handle: 'charlie.test',
    displayName: 'Charlie Brown',
    avatar: undefined,
    totalVotes: 6,
    avgScore: 0.0,
    votes: [
      {policyId: 'p1', policyTitle: 'Renewable Energy Initiative', vote: 1},
      {policyId: 'p2', policyTitle: 'Community Garden Expansion', vote: -1},
      {policyId: 'p3', policyTitle: 'Public Transport Funding', vote: 2},
      {policyId: 'p4', policyTitle: 'Local Art Grants', vote: -2},
      {policyId: 'p5', policyTitle: 'Public Safety Budget', vote: 1},
      {policyId: 'p6', policyTitle: 'Education Modernization', vote: -1},
    ],
  },
]

export const VOTERS_BY_DID: Record<string, Voter> = Object.fromEntries(
  VOTERS.map(v => [v.did, v]),
)
