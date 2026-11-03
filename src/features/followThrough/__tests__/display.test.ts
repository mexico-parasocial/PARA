import {
  dueState,
  knownStatus,
  newestFirst,
  shownProgress,
  statusTone,
  summaryFacts,
} from '../display'

const NOW = Date.parse('2026-11-02T12:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

describe('shownProgress', () => {
  it('never invents a value', () => {
    expect(shownProgress(undefined)).toBeNull()
    expect(shownProgress(Number.NaN)).toBeNull()
  })

  it('keeps a declared value inside 0 to 100', () => {
    expect(shownProgress(0)).toBe(0)
    expect(shownProgress(42.4)).toBe(42)
    expect(shownProgress(180)).toBe(100)
    expect(shownProgress(-5)).toBe(0)
  })
})

describe('knownStatus', () => {
  it('passes the five statuses and refuses anything else', () => {
    for (const s of [
      'planned',
      'in_progress',
      'completed',
      'blocked',
      'abandoned',
    ]) {
      expect(knownStatus(s)).toBe(s)
    }
    expect(knownStatus('paused')).toBeNull()
  })
})

describe('statusTone', () => {
  it('lets overdue outrank the written status', () => {
    expect(statusTone('in_progress', true)).toBe('bad')
    expect(statusTone('in_progress', false)).toBe('active')
    expect(statusTone('completed', false)).toBe('good')
    expect(statusTone('blocked', false)).toBe('warn')
    expect(statusTone('paused', false)).toBe('neutral')
  })
})

describe('dueState', () => {
  it('has nothing to say without a due date', () => {
    expect(dueState({overdue: false}, NOW)).toEqual({kind: 'none'})
  })

  it('prefers the rescheduled date to the committed one', () => {
    const at = new Date(NOW + 3 * DAY).toISOString()
    expect(
      dueState(
        {
          dueAt: new Date(NOW - 9 * DAY).toISOString(),
          currentDueAt: at,
          overdue: false,
        },
        NOW,
      ),
    ).toEqual({kind: 'upcoming', days: 3, at})
  })

  it('follows the AppView on overdue, so a finished item is never late', () => {
    const at = new Date(NOW - 2 * DAY).toISOString()
    expect(dueState({currentDueAt: at, overdue: true}, NOW)).toEqual({
      kind: 'overdue',
      days: 2,
      at,
    })
    expect(dueState({currentDueAt: at, overdue: false}, NOW).kind).toBe(
      'upcoming',
    )
  })

  it('ignores a date it cannot read', () => {
    expect(dueState({currentDueAt: 'later', overdue: false}, NOW)).toEqual({
      kind: 'none',
    })
  })
})

describe('summaryFacts', () => {
  const base = {
    cabildeo: 'at://did:plc:a/com.para.civic.cabildeo/1',
    total: 4,
    completed: 1,
    overdue: 1,
    abandoned: 0,
  } as const

  it('shows no percentage when the AppView sent none', () => {
    expect(summaryFacts({...base}).progress).toBeNull()
  })

  it('carries counts through unchanged', () => {
    expect(summaryFacts({...base, progress: 55})).toMatchObject({
      total: 4,
      completed: 1,
      overdue: 1,
      progress: 55,
    })
  })
})

describe('newestFirst', () => {
  it('reverses the AppView order without touching the input', () => {
    const input = [
      {occurredAt: '2026-10-01T00:00:00.000Z', id: 'a'},
      {occurredAt: '2026-10-09T00:00:00.000Z', id: 'b'},
    ]
    expect(newestFirst(input).map(u => u.id)).toEqual(['b', 'a'])
    expect(input.map(u => u.id)).toEqual(['a', 'b'])
    expect(newestFirst(undefined)).toEqual([])
  })
})
