export type ProposedQuestion = {
  id: string
  text: string
  targetCommunity?: string
  upvotes: number
  downvotes: number
  isMainstream: boolean
}

export const MOCK_PROPOSED_QUESTIONS: ProposedQuestion[] = [
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
    isMainstream: true, // Example of one that might be close to mainstream
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
