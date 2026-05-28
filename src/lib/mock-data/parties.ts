import {type Party, type Topic} from './types'

export const PARTIES: Party[] = [
  {id: 'PRI', name: 'PRI', color: '#CE1126', logo: 'P'},
  {id: 'PAN', name: 'PAN', color: '#005595', logo: 'PA'},
  {id: 'MORENA', name: 'MORENA', color: '#B01021', logo: 'M'},
  {id: 'MC', name: 'MC', color: '#FF8200', logo: 'MC'},
  {id: 'PRD', name: 'PRD', color: '#FFCD00', logo: 'PR'},
  {id: 'MIGALA', name: 'Migala', color: '#6B21A8', logo: 'MI'},
  {id: 'DERECHA', name: 'Derecha Aut.', color: '#474652', logo: 'DA'},
]

export const TOPICS: Topic[] = [
  {id: 't1', type: 'Policy', category: 'Tax', title: 'Corporate Tax Holiday'},
  {id: 't2', type: 'Policy', category: 'Tax', title: 'VAT Reduction'},
  {id: 't3', type: 'Matter', category: 'Economy', title: 'Inflation Control'},
  {
    id: 't4',
    type: 'Policy',
    category: 'Economy',
    title: 'Clean Energy Subsidies',
  },
  {
    id: 't5',
    type: 'Matter',
    category: 'Welfare',
    title: 'Universal Basic Income',
  },
  {
    id: 't6',
    type: 'Policy',
    category: 'Law & Order',
    title: 'Body Cam Mandate',
  },
  {
    id: 't7',
    type: 'Matter',
    category: 'Public Services',
    title: 'Hospital Wait Times',
  },
]

export const PARTIES_BY_ID: Record<string, Party> = Object.fromEntries(
  PARTIES.map(p => [p.id, p]),
)

export const TOPICS_BY_ID: Record<string, Topic> = Object.fromEntries(
  TOPICS.map(t => [t.id, t]),
)
