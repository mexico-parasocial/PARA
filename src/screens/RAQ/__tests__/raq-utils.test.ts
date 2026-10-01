import {RAQ_AXES} from '#/lib/mock-data'
import {type ProposedQuestionView} from '#/state/queries/useProposedQuestions'
import {
  calculateIdeology,
  calculateRAQResults,
  IDEOLOGIES,
} from '../logic/scoring'
import {
  assessmentAnswers,
  matchingAssessmentAnswers,
  normalizeRaqResults,
  proposedAxes,
} from '../raq-utils'

it('counts neutral answers but excludes stale IDs and invalid magnitudes', () => {
  const [a, b, c] = RAQ_AXES[0].data
  expect(
    assessmentAnswers({[a.id]: 0, [b.id]: 3, [c.id]: 4, obsolete: -2}),
  ).toEqual([
    {questionId: a.id, value: 0},
    {questionId: b.id, value: 3},
  ])
})

it('discovers unofficial proposal targets without treating reactions as axis votes', () => {
  const proposals = [
    {id: 'one', targetAxis: 'new-axis'},
    {id: 'one', targetAxis: 'new-axis'},
    {id: 'two', targetAxis: 'new-axis'},
    {id: 'three', targetAxis: RAQ_AXES[0].id},
    {id: 'four'},
  ] as ProposedQuestionView[]
  expect(proposedAxes(proposals)).toEqual([
    {id: 'new-axis', name: 'new-axis', proposalCount: 2},
  ])
})

it('normalizes both persisted result formats and rejects malformed values', () => {
  expect(
    normalizeRaqResults([
      {axisId: 'old', axisTitle: 'Old', score: 55, label: 'Middle'},
      {id: 'new', title: 'New', score: 101},
      {id: 'broken', score: NaN},
    ]),
  ).toEqual([
    {
      id: 'old',
      title: 'Old',
      score: 55,
      label: 'Middle',
      labelLow: '',
      labelHigh: '',
      rawScore: 0,
    },
    {
      id: 'new',
      title: 'New',
      score: 100,
      label: '',
      labelLow: '',
      labelHigh: '',
      rawScore: 0,
    },
  ])
})

it('does not publish a changed answer set alongside an older result', () => {
  const questionId = RAQ_AXES[0].data[0].id
  const answers = {[questionId]: 2}
  const results = calculateRAQResults(answers, RAQ_AXES)
  expect(matchingAssessmentAnswers(answers, results)).toEqual([
    {questionId, value: 2},
  ])
  expect(matchingAssessmentAnswers({[questionId]: -2}, results)).toBeUndefined()
  expect(matchingAssessmentAnswers(answers, results.slice(1))).toBeUndefined()
})

it('derives ideology similarity from the full vector rather than fixed percentages', () => {
  const perfect = calculateIdeology(IDEOLOGIES[0].vector)
  expect(perfect.primary.name).toBe(IDEOLOGIES[0].name)
  expect(perfect.primary.matchPercent).toBe(100)
  expect(perfect.secondary.matchPercent).toBeLessThan(100)
  const mixed = calculateIdeology(Array(12).fill(50))
  expect(mixed.primary.matchPercent).toBeLessThan(100)
})
