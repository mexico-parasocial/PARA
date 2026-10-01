import {RAQ_AXES, RAQ_AXES_BY_ID} from '#/lib/mock-data'
import {type ProposedQuestionView} from '#/state/queries/useProposedQuestions'
import {type AxisResult, calculateRAQResults} from './logic/scoring'

export function axisTitle(id: string) {
  return RAQ_AXES_BY_ID[id]?.title.replace(/^\d+\.\s*/, '') ?? id
}

// A targeted proposal is not an official axis definition or an electoral vote.
export function proposedAxes(proposals: ProposedQuestionView[]) {
  const axes = new Map<string, Set<string>>()
  for (const proposal of proposals) {
    const id = proposal.targetAxis
    if (!id || RAQ_AXES_BY_ID[id]) continue
    const questions = axes.get(id) ?? new Set<string>()
    questions.add(proposal.id)
    axes.set(id, questions)
  }
  return Array.from(axes, ([id, questions]) => ({
    id,
    name: id,
    proposalCount: questions.size,
  }))
}

export function assessmentAnswers(answers: Record<string, number> = {}) {
  return RAQ_AXES.flatMap(axis => axis.data).flatMap(question => {
    const value = answers[question.id]
    return Number.isInteger(value) && value >= -3 && value <= 3
      ? [{questionId: question.id, value}]
      : []
  })
}

export function normalizeRaqResults(value: unknown): AxisResult[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(entry => {
    if (!entry || typeof entry !== 'object') return []
    const r = entry as Record<string, unknown>
    const id = r.id ?? r.axisId
    const title = r.title ?? r.axisTitle
    if (
      typeof id !== 'string' ||
      typeof title !== 'string' ||
      typeof r.score !== 'number' ||
      !Number.isFinite(r.score)
    )
      return []
    return [
      {
        id,
        title,
        score: Math.max(0, Math.min(100, r.score)),
        label: typeof r.label === 'string' ? r.label : '',
        labelLow: typeof r.labelLow === 'string' ? r.labelLow : '',
        labelHigh: typeof r.labelHigh === 'string' ? r.labelHigh : '',
        rawScore:
          typeof r.rawScore === 'number' && Number.isFinite(r.rawScore)
            ? r.rawScore
            : 0,
      },
    ]
  })
}

// Only attach answers to a saved result if they still reproduce that result.
export function matchingAssessmentAnswers(
  answers: Record<string, number>,
  results: AxisResult[],
) {
  const snapshot = assessmentAnswers(answers)
  const calculated = calculateRAQResults(
    Object.fromEntries(snapshot.map(a => [a.questionId, a.value])),
    RAQ_AXES,
  )
  return results.length === calculated.length &&
    calculated.every(result =>
      results.some(
        saved =>
          saved.id === result.id &&
          saved.score === result.score &&
          saved.rawScore === result.rawScore,
      ),
    )
    ? snapshot
    : undefined
}
