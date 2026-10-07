import {lexiconDoc, Lexicons} from '@atproto/lexicon'
import {i18n} from '@lingui/core'

import {
  ECONOMIC_ACTIVITY_FUNDRAISER,
  ECONOMIC_ACTIVITY_RAFFLE,
  ECONOMIC_ACTIVITY_SALE,
  PARA_COMMUNITY_ECONOMIC_ACTIVITY_COLLECTION,
  PARA_COMMUNITY_SOCIAL_ACTIVITY_COLLECTION,
  SOCIAL_ACTIVITY_ASSEMBLY,
  SOCIAL_ACTIVITY_CABILDEO,
  SOCIAL_ACTIVITY_PEACEFUL_MARCH,
  SOCIAL_ACTIVITY_SIGNATURE_DRIVE,
} from '#/lib/api/para-lexicons'
import {
  type ActivityCategory,
  computeTermsDigest,
} from '#/lib/community-activities'
import economicSchema from '../../../../lexicons/com/para/community/economicActivity.json'
import socialSchema from '../../../../lexicons/com/para/community/socialActivity.json'
import {
  type ActivityDraft,
  buildActivity,
  combineDateTime,
  creationSteps,
  emptyActivityDraft,
  optionalCount,
  updateActivityDraft,
} from '../creation'

const community =
  'at://did:plc:abcdefghijklmnopqrstuvwx/com.para.community.board/community'
const now = '2026-10-04T18:00:00.000Z'
const lexicons = new Lexicons([
  lexiconDoc.parse(socialSchema),
  lexiconDoc.parse(economicSchema),
])
const translate = i18n._.bind(i18n)

function validDraft(category: ActivityCategory = 'social'): ActivityDraft {
  const draft = emptyActivityDraft(category, 'Comunidad')
  draft.kindSelected = true
  draft.basics = {...draft.basics, title: 'Actividad', startDate: '2026-10-10'}
  draft.social.march = {...draft.social.march, meetingPoint: 'Plaza'}
  draft.social.signature = {
    ...draft.social.signature,
    instrumentTitle: 'Petición',
    targetSignatures: '100',
  }
  draft.economic.sale.items[0] = {
    ...draft.economic.sale.items[0],
    name: 'Libro',
    price: '20.50',
  }
  draft.economic.raffle = {
    ...draft.economic.raffle,
    ticketPrice: '10',
    tickets: '100',
    drawDate: '2026-10-11',
    drawMethod: 'Urna sellada',
    prizes: [{key: 100, description: 'Bicicleta', value: '1000'}],
  }
  draft.economic.fundraiser = {
    ...draft.economic.fundraiser,
    purpose: 'Biblioteca',
  }
  draft.plan.committed = true
  return draft
}

beforeAll(() => i18n.loadAndActivate({locale: 'en', messages: {}}))

it.each([
  ['social', SOCIAL_ACTIVITY_PEACEFUL_MARCH],
  ['social', SOCIAL_ACTIVITY_SIGNATURE_DRIVE],
  ['social', SOCIAL_ACTIVITY_ASSEMBLY],
  ['social', SOCIAL_ACTIVITY_CABILDEO],
  ['economic', ECONOMIC_ACTIVITY_SALE],
  ['economic', ECONOMIC_ACTIVITY_RAFFLE],
  ['economic', ECONOMIC_ACTIVITY_FUNDRAISER],
] as const)(
  'creates a lexicon-valid %s %s record using only selected details',
  (category, kind) => {
    const draft = validDraft(category)
    if (category === 'social') draft.social.kind = kind
    else draft.economic.kind = kind
    const result = buildActivity(draft, community, translate, {
      publishing: true,
      now,
    })
    expect(result.issues).toEqual([])
    expect(result.value?.record.details.$type).toBe(kind)
    const collection =
      category === 'social'
        ? PARA_COMMUNITY_SOCIAL_ACTIVITY_COLLECTION
        : PARA_COMMUNITY_ECONOMIC_ACTIVITY_COLLECTION
    expect(
      lexicons.validate(collection, {
        ...result.value!.record,
        $type: collection,
        createdBy: 'did:plc:abcdefghijklmnopqrstuvwx',
        createdAt: now,
        updatedAt: now,
      }).success,
    ).toBe(true)
  },
)

it('requires an explicit type selection and excludes the money step from civic creation', () => {
  const draft = validDraft()
  draft.kindSelected = false
  expect(buildActivity(draft, community, translate).issues).toContainEqual(
    expect.objectContaining({field: 'kind', step: 'type'}),
  )
  expect(creationSteps('social')).toEqual([
    'type',
    'basics',
    'details',
    'review',
  ])
  expect(creationSteps('economic')).toEqual([
    'type',
    'basics',
    'details',
    'money',
    'review',
  ])
})

it.each(['2026-02-30', '2026-13-01', 'nonsense'])(
  'rejects invalid calendar date %s',
  date => expect(combineDateTime(date, '10:00')).toBeUndefined(),
)
it.each(['25:00', '10:60', '9:00', 'abc', ''])(
  'rejects invalid time %s without substituting midnight',
  time => expect(combineDateTime('2026-10-10', time)).toBeUndefined(),
)
it('preserves local wall-clock time', () => {
  const date = new Date(combineDateTime('2026-10-10', '10:15')!)
  expect([
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ]).toEqual([2026, 9, 10, 10, 15])
})
it.each(['-1', '1.5', '9007199254740992', '1e3', 'NaN'])(
  'rejects invalid count %s',
  value => expect(optionalCount(value)).toBeNaN(),
)

it('rejects supplied invalid ends, reversed dates and multibyte text beyond schema limits', () => {
  const draft = validDraft()
  draft.basics.endDate = 'bad'
  expect(buildActivity(draft, community, translate).issues).toContainEqual(
    expect.objectContaining({field: 'basics.endDate'}),
  )
  draft.basics.endDate = '2026-10-09'
  expect(buildActivity(draft, community, translate).issues).toContainEqual(
    expect.objectContaining({field: 'basics.endDate'}),
  )
  draft.basics.title = 'ñ'.repeat(151)
  expect(buildActivity(draft, community, translate).issues).toContainEqual(
    expect.objectContaining({field: 'basics.title'}),
  )
})

it.each([SOCIAL_ACTIVITY_ASSEMBLY, SOCIAL_ACTIVITY_CABILDEO] as const)(
  'requires a valid meeting URL only for online/hybrid %s',
  kind => {
    const draft = validDraft()
    draft.social.kind = kind
    const details =
      kind === SOCIAL_ACTIVITY_ASSEMBLY
        ? draft.social.assembly
        : draft.social.cabildeo
    details.format = 'hybrid'
    details.meetingUrl = 'javascript:alert(1)'
    expect(buildActivity(draft, community, translate).issues).toContainEqual(
      expect.objectContaining({
        field:
          kind === SOCIAL_ACTIVITY_ASSEMBLY
            ? 'assembly.meetingUrl'
            : 'cabildeo.meetingUrl',
      }),
    )
    details.format = 'in_person'
    expect(buildActivity(draft, community, translate).issues).toEqual([])
    expect(
      buildActivity(draft, community, translate).value?.record.details,
    ).not.toHaveProperty('meetingUrl', 'javascript:alert(1)')
  },
)

it('allows cabildeo scheduling with empty meeting documentation', () => {
  const draft = validDraft()
  draft.social.kind = SOCIAL_ACTIVITY_CABILDEO
  expect(buildActivity(draft, community, translate).issues).toEqual([])
})
it('preserves hidden march permit text without validating or publishing it', () => {
  const draft = validDraft()
  draft.social.march.permitStatus = 'requested'
  draft.social.march.permitReference = 'x'.repeat(301)
  expect(buildActivity(draft, community, translate).issues).toContainEqual(
    expect.objectContaining({field: 'march.permitReference'}),
  )
  draft.social.march.permitStatus = 'not_required'
  const result = buildActivity(draft, community, translate)
  expect(result.issues).toEqual([])
  expect(result.value?.record.details).not.toHaveProperty(
    'permitReference',
    draft.social.march.permitReference,
  )
})
it('validates optional URLs and per-entry array limits', () => {
  const draft = validDraft()
  draft.social.kind = SOCIAL_ACTIVITY_SIGNATURE_DRIVE
  draft.social.signature.instrumentUrl = 'broken'
  draft.social.signature.collectionPoints = Array(51).fill('Plaza').join('\n')
  expect(
    buildActivity(draft, community, translate).issues.map(i => i.field),
  ).toEqual(
    expect.arrayContaining([
      'signature.instrumentUrl',
      'signature.collectionPoints',
    ]),
  )
})

it('addresses repeated row errors by stable key and never discards incomplete rows', () => {
  const draft = validDraft('economic')
  draft.economic.sale.items.push({
    key: 123,
    name: 'Libro',
    price: '1.234',
    quantity: '-1',
  })
  const issues = buildActivity(draft, community, translate).issues
  expect(issues.map(i => i.field)).toEqual(
    expect.arrayContaining([
      'sale.items.123.name',
      'sale.items.123.price',
      'sale.items.123.quantity',
    ]),
  )
  draft.economic.sale.items[1] = {key: 123, name: '', price: '', quantity: '10'}
  expect(
    buildActivity(draft, community, translate).issues.map(i => i.field),
  ).toContain('sale.items.123.name')
})
it('validates prize descriptions even when only a value was entered', () => {
  const draft = validDraft('economic')
  draft.economic.kind = ECONOMIC_ACTIVITY_RAFFLE
  draft.economic.raffle.prizes.push({key: 124, description: '', value: '20'})
  expect(
    buildActivity(draft, community, translate).issues.map(i => i.field),
  ).toContain('raffle.prizes.124.description')
})
it('requires exact allocations, valid money, and commitment only on publishing', () => {
  const draft = validDraft('economic')
  draft.plan.committed = false
  const preview = buildActivity(draft, community, translate)
  expect(preview.issues).toEqual([])
  expect(
    buildActivity(draft, community, translate, {publishing: true}).issues.map(
      i => i.field,
    ),
  ).toContain('plan.committed')
  draft.plan.allocations[0].percent = '99.99'
  draft.plan.expenseBudget = '-1'
  draft.plan.currency = 'XX'
  expect(
    buildActivity(draft, community, translate).issues.map(i => i.field),
  ).toEqual(
    expect.arrayContaining([
      'plan.allocations',
      'plan.expenseBudget',
      'plan.currency',
    ]),
  )
})
it('assigns the commitment timestamp at submission and keeps reviewed terms identical', () => {
  const draft = validDraft('economic')
  const preview = buildActivity(draft, community, translate).value!
  const submission = buildActivity(draft, community, translate, {
    publishing: true,
    now,
  }).value!
  if (preview.category !== 'economic' || submission.category !== 'economic')
    throw new Error('Expected economic records')
  expect(preview.record.financialPlan.committedAt).toBe('')
  expect(submission.record.financialPlan.committedAt).toBe(now)
  expect(submission.record).toEqual({
    ...preview.record,
    financialPlan: {...preview.record.financialPlan, committedAt: now},
  })
  expect(computeTermsDigest(submission.record)).toBeTruthy()
})
it('preserves per-type drafts while invalidating consent when committed terms change', () => {
  const draft = validDraft('economic')
  const next = updateActivityDraft(draft, {
    economic: {...draft.economic, kind: ECONOMIC_ACTIVITY_RAFFLE},
  })
  expect(next.plan.committed).toBe(false)
  expect(next.economic.sale.items).toEqual(draft.economic.sale.items)
  const planChange = updateActivityDraft(draft, {
    plan: {...draft.plan, currency: 'USD'},
  })
  expect(planChange.plan.committed).toBe(false)
  const basicsChange = updateActivityDraft(draft, {
    basics: {...draft.basics, title: 'Other'},
  })
  expect(basicsChange.plan.committed).toBe(true)
})
it('stores the fundraiser goal only in the plan and addresses its error in details', () => {
  const draft = validDraft('economic')
  draft.economic.kind = ECONOMIC_ACTIVITY_FUNDRAISER
  draft.plan.fundingGoal = '500'
  expect(
    buildActivity(draft, community, translate).value?.record,
  ).toMatchObject({financialPlan: {fundingGoalMinor: 50000}})
  draft.plan.fundingGoal = 'bad'
  expect(buildActivity(draft, community, translate).issues).toContainEqual(
    expect.objectContaining({field: 'plan.fundingGoal', step: 'details'}),
  )
})
