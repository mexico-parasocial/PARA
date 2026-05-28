import {type ProfileRAQ, type ProfileVote} from './types'

export const PROFILE_VOTES: ProfileVote[] = [
  {id: '1', title: 'Community Guidelines Update', vote: 'Yes', date: '2h ago'},
  {id: '2', title: 'New Feature: RAQ', vote: 'Yes', date: '1d ago'},
  {id: '3', title: 'Reduce Fees', vote: 'No', date: '3d ago'},
]

export const PROFILE_RAQ_HISTORY: ProfileRAQ[] = [
  {id: '1', question: 'Economic Policy', answer: 'Centrist', score: '50%'},
  {id: '2', question: 'Social Liberty', answer: 'Libertarian', score: '80%'},
  {
    id: '3',
    question: 'Environmental Regulation',
    answer: 'Pro-Reg',
    score: 'High',
  },
]
