import {utf8Len} from '@atproto/common-web'
import {type I18n} from '@lingui/core'
import {msg} from '@lingui/core/macro'

import {
  type AssemblyFormat,
  type CommunityActivityAllocationBase,
  type CommunityActivityAllocationRecipient,
  type CommunityActivityFinancialPlan,
  ECONOMIC_ACTIVITY_FUNDRAISER,
  ECONOMIC_ACTIVITY_RAFFLE,
  ECONOMIC_ACTIVITY_SALE,
  type EconomicActivityDetails,
  type EconomicActivitySale,
  type PeacefulMarchPermitStatus,
  type SignatureDriveInstrumentType,
  SOCIAL_ACTIVITY_ASSEMBLY,
  SOCIAL_ACTIVITY_CABILDEO,
  SOCIAL_ACTIVITY_PEACEFUL_MARCH,
  SOCIAL_ACTIVITY_SIGNATURE_DRIVE,
  type SocialActivityDetails,
} from '#/lib/api/para-lexicons'
import {
  type ActivityCategory,
  type EconomicActivityKind,
  parseMoneyToMinor,
  parsePercentToBps,
  type SocialActivityKind,
} from '#/lib/community-activities'
import {type CreateCommunityActivityInput} from '#/state/queries/community-activities'

export type Translate = I18n['_']
export type CreationStep = 'type' | 'basics' | 'details' | 'money' | 'review'
export type FieldIssue = {field: string; message: string; step: CreationStep}
export type Built<T> = {value?: T; problems: string[]; issues: FieldIssue[]}

export type SocialDraft = {
  kind: SocialActivityKind
  march: {
    meetingPoint: string
    route: string
    destination: string
    permitStatus: PeacefulMarchPermitStatus
    permitReference: string
    expectedAttendance: string
    safetyContact: string
    accessibilityNotes: string
  }
  signature: {
    instrumentType: SignatureDriveInstrumentType
    instrumentTitle: string
    instrumentUrl: string
    targetSignatures: string
    deadline: string
    collectionPoints: string
    signerRequirements: string
  }
  assembly: {
    format: AssemblyFormat
    meetingUrl: string
    agenda: string
    quorumRequired: string
  }
  cabildeo: {
    format: AssemblyFormat
    meetingUrl: string
    recordingUrl: string
    participants: string
    arguments: string
    outcome: string
  }
}

export const EMPTY_SOCIAL_DRAFT: SocialDraft = {
  kind: SOCIAL_ACTIVITY_PEACEFUL_MARCH,
  march: {
    meetingPoint: '',
    route: '',
    destination: '',
    permitStatus: 'requested',
    permitReference: '',
    expectedAttendance: '',
    safetyContact: '',
    accessibilityNotes: '',
  },
  signature: {
    instrumentType: 'bill',
    instrumentTitle: '',
    instrumentUrl: '',
    targetSignatures: '',
    deadline: '',
    collectionPoints: '',
    signerRequirements: '',
  },
  assembly: {
    format: 'in_person',
    meetingUrl: '',
    agenda: '',
    quorumRequired: '',
  },
  cabildeo: {
    format: 'in_person',
    meetingUrl: '',
    recordingUrl: '',
    participants: '',
    arguments: '',
    outcome: '',
  },
}

type Row<T> = T & {key: number}

export type EconomicDraft = {
  kind: EconomicActivityKind
  sale: {
    channel: EconomicActivitySale['channel']
    items: Array<Row<{name: string; price: string; quantity: string}>>
  }
  raffle: {
    ticketPrice: string
    tickets: string
    prizes: Array<Row<{description: string; value: string}>>
    drawDate: string
    drawTime: string
    drawMethod: string
    permitReference: string
  }
  fundraiser: {
    purpose: string
    beneficiary: string
    suggestedDonation: string
    donationChannels: string
  }
}

let nextKey = 1
export const newKey = () => nextKey++

export function emptyEconomicDraft(): EconomicDraft {
  return {
    kind: ECONOMIC_ACTIVITY_SALE,
    sale: {
      channel: 'in_person',
      items: [{key: newKey(), name: '', price: '', quantity: ''}],
    },
    raffle: {
      ticketPrice: '',
      tickets: '',
      prizes: [{key: newKey(), description: '', value: ''}],
      drawDate: '',
      drawTime: '18:00',
      drawMethod: '',
      permitReference: '',
    },
    fundraiser: {
      purpose: '',
      beneficiary: '',
      suggestedDonation: '',
      donationChannels: '',
    },
  }
}

export type PlanDraft = {
  currency: string
  allocationBase: CommunityActivityAllocationBase
  fundingGoal: string
  expenseBudget: string
  allocations: Array<{
    key: number
    recipient: CommunityActivityAllocationRecipient
    label: string
    percent: string
  }>
  committed: boolean
}

export function emptyPlanDraft(communityName: string): PlanDraft {
  return {
    currency: 'MXN',
    allocationBase: 'net_proceeds',
    fundingGoal: '',
    expenseBudget: '',
    allocations: [
      {
        key: newKey(),
        recipient: 'community',
        label: communityName,
        percent: '100',
      },
    ],
    committed: false,
  }
}

export type BasicsDraft = {
  title: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  location: string
}
export type ActivityDraft = {
  category: ActivityCategory
  kindSelected: boolean
  basics: BasicsDraft
  social: SocialDraft
  economic: EconomicDraft
  plan: PlanDraft
}

export function emptyActivityDraft(
  category: ActivityCategory,
  communityName: string,
): ActivityDraft {
  return {
    category,
    kindSelected: false,
    basics: {
      title: '',
      description: '',
      startDate: '',
      startTime: '10:00',
      endDate: '',
      endTime: '23:59',
      location: '',
    },
    social: {
      ...EMPTY_SOCIAL_DRAFT,
      march: {...EMPTY_SOCIAL_DRAFT.march},
      signature: {...EMPTY_SOCIAL_DRAFT.signature},
      assembly: {...EMPTY_SOCIAL_DRAFT.assembly},
      cabildeo: {...EMPTY_SOCIAL_DRAFT.cabildeo},
    },
    economic: emptyEconomicDraft(),
    plan: emptyPlanDraft(communityName),
  }
}

/** A local calendar date and wall-clock time. Reject rollover and DST gaps. */
export function combineDateTime(date: string, time: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  )
    return undefined
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const value = new Date(`${date}T${time}:00`)
  if (
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== day ||
    value.getHours() !== hour ||
    value.getMinutes() !== minute
  )
    return undefined
  return value.toISOString()
}
export function splitLines(input: string) {
  return input
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}
export function optionalCount(input: string) {
  if (!input.trim()) return undefined
  const value = Number(input.trim())
  return /^\d+$/.test(input.trim()) && Number.isSafeInteger(value) ? value : NaN
}
export function optionalMoney(input: string) {
  return input.trim() ? (parseMoneyToMinor(input) ?? NaN) : undefined
}
const text = (value: string) => value.trim() || undefined

class Validation {
  issues: FieldIssue[] = []
  constructor(
    private _: Translate,
    private step: CreationStep,
  ) {}
  add(field: string, message: string) {
    this.issues.push({field, message, step: this.step})
  }
  string(field: string, value: string, limit: number, required?: string) {
    if (required && !value.trim()) this.add(field, required)
    if (utf8Len(value.trim()) > limit)
      this.add(field, this._(msg`This text is too long. Shorten it.`))
  }
  count(field: string, value: string, required = false) {
    const parsed = optionalCount(value)
    if (Number.isNaN(parsed) || (required && (!parsed || parsed < 1)))
      this.add(
        field,
        required
          ? this._(msg`Enter a whole number above zero.`)
          : this._(msg`Enter a whole number of zero or more.`),
      )
    return parsed
  }
  money(field: string, value: string, required = false) {
    const parsed = optionalMoney(value)
    if (Number.isNaN(parsed) || (required && parsed === undefined))
      this.add(
        field,
        this._(msg`Enter an amount of zero or more with up to 2 decimals.`),
      )
    return parsed
  }
  url(field: string, value: string, required = false) {
    if (!value.trim() && !required) return
    try {
      const url = new URL(value.trim())
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname)
        throw new Error('url')
    } catch {
      this.add(field, this._(msg`Enter a complete http or https link.`))
    }
  }
  lines(field: string, value: string, maxItems: number, itemLimit: number) {
    const lines = splitLines(value)
    if (lines.length > maxItems)
      this.add(field, this._(msg`Use no more than ${maxItems} entries.`))
    for (const line of lines) this.string(field, line, itemLimit)
    return lines
  }
  date(field: string, date: string, time: string, required = false) {
    if (!date && !required) return undefined
    const result = combineDateTime(date, time)
    if (!result) this.add(field, this._(msg`Choose a valid date and time.`))
    return result
  }
  result<T>(value: T): Built<T> {
    return {
      value: this.issues.length ? undefined : value,
      issues: this.issues,
      problems: this.issues.map(i => i.message),
    }
  }
}

export function buildSocialDetails(
  draft: SocialDraft,
  _: Translate,
): Built<SocialActivityDetails> {
  const v = new Validation(_, 'details')
  switch (draft.kind) {
    case SOCIAL_ACTIVITY_PEACEFUL_MARCH: {
      const m = draft.march
      v.string(
        'march.meetingPoint',
        m.meetingPoint,
        300,
        _(msg`Say where people meet.`),
      )
      v.string('march.route', m.route, 2000)
      v.string('march.destination', m.destination, 300)
      if (m.permitStatus !== 'not_required')
        v.string('march.permitReference', m.permitReference, 300)
      v.string('march.safetyContact', m.safetyContact, 300)
      v.string('march.accessibilityNotes', m.accessibilityNotes, 1000)
      return v.result({
        $type: draft.kind,
        meetingPoint: m.meetingPoint.trim(),
        route: text(m.route),
        destination: text(m.destination),
        permitStatus: m.permitStatus,
        permitReference:
          m.permitStatus === 'not_required'
            ? undefined
            : text(m.permitReference),
        expectedAttendance: v.count(
          'march.expectedAttendance',
          m.expectedAttendance,
        ),
        safetyContact: text(m.safetyContact),
        accessibilityNotes: text(m.accessibilityNotes),
      })
    }
    case SOCIAL_ACTIVITY_SIGNATURE_DRIVE: {
      const s = draft.signature
      v.string(
        'signature.instrumentTitle',
        s.instrumentTitle,
        300,
        _(msg`Name the bill, law or initiative.`),
      )
      v.url('signature.instrumentUrl', s.instrumentUrl)
      v.string('signature.signerRequirements', s.signerRequirements, 1000)
      return v.result({
        $type: draft.kind,
        instrumentType: s.instrumentType,
        instrumentTitle: s.instrumentTitle.trim(),
        instrumentUrl: text(s.instrumentUrl),
        targetSignatures:
          v.count('signature.targetSignatures', s.targetSignatures, true) ?? 0,
        signaturesCollected: 0,
        deadline: v.date('signature.deadline', s.deadline, '23:59'),
        collectionPoints: v.lines(
          'signature.collectionPoints',
          s.collectionPoints,
          50,
          300,
        ),
        signerRequirements: text(s.signerRequirements),
      })
    }
    case SOCIAL_ACTIVITY_CABILDEO: {
      const c = draft.cabildeo
      if (c.format !== 'in_person')
        v.url('cabildeo.meetingUrl', c.meetingUrl, true)
      v.url('cabildeo.recordingUrl', c.recordingUrl)
      v.string('cabildeo.outcome', c.outcome, 2000)
      return v.result({
        $type: draft.kind,
        format: c.format,
        meetingUrl: c.format === 'in_person' ? undefined : text(c.meetingUrl),
        recordingUrl: text(c.recordingUrl),
        participants: v.lines(
          'cabildeo.participants',
          c.participants,
          100,
          200,
        ),
        arguments: v.lines('cabildeo.arguments', c.arguments, 50, 500),
        outcome: text(c.outcome),
      })
    }
    case SOCIAL_ACTIVITY_ASSEMBLY: {
      const as = draft.assembly
      if (as.format !== 'in_person')
        v.url('assembly.meetingUrl', as.meetingUrl, true)
      return v.result({
        $type: draft.kind,
        format: as.format,
        meetingUrl: as.format === 'in_person' ? undefined : text(as.meetingUrl),
        agenda: v.lines('assembly.agenda', as.agenda, 30, 300),
        quorumRequired: v.count('assembly.quorumRequired', as.quorumRequired),
      })
    }
  }
}

export function buildEconomicDetails(
  draft: EconomicDraft,
  _: Translate,
): Built<EconomicActivityDetails> {
  const v = new Validation(_, 'details')
  switch (draft.kind) {
    case ECONOMIC_ACTIVITY_SALE: {
      if (draft.sale.items.length < 1 || draft.sale.items.length > 50)
        v.add('sale.items', _(msg`List between 1 and 50 items.`))
      const names = new Set<string>()
      const items = draft.sale.items.map(row => {
        const field = `sale.items.${row.key}`
        v.string(
          `${field}.name`,
          row.name,
          120,
          _(msg`Every item needs a name.`),
        )
        if (names.has(row.name.trim()))
          v.add(`${field}.name`, _(msg`Item names must be unique.`))
        names.add(row.name.trim())
        return {
          name: row.name.trim(),
          unitPriceMinor: v.money(`${field}.price`, row.price, true) ?? 0,
          quantityAvailable: v.count(`${field}.quantity`, row.quantity),
        }
      })
      return v.result({$type: draft.kind, channel: draft.sale.channel, items})
    }
    case ECONOMIC_ACTIVITY_RAFFLE: {
      const r = draft.raffle
      if (r.prizes.length < 1 || r.prizes.length > 20)
        v.add('raffle.prizes', _(msg`List between 1 and 20 prizes.`))
      const prizes = r.prizes.map(row => {
        const field = `raffle.prizes.${row.key}`
        v.string(
          `${field}.description`,
          row.description,
          300,
          _(msg`Describe the prize.`),
        )
        return {
          description: row.description.trim(),
          estimatedValueMinor: v.money(`${field}.value`, row.value),
        }
      })
      v.string(
        'raffle.drawMethod',
        r.drawMethod,
        1000,
        _(msg`Explain how the winner is drawn.`),
      )
      v.string('raffle.permitReference', r.permitReference, 300)
      return v.result({
        $type: draft.kind,
        ticketPriceMinor:
          v.money('raffle.ticketPrice', r.ticketPrice, true) ?? 0,
        ticketsAvailable: v.count('raffle.tickets', r.tickets, true) ?? 0,
        prizes,
        drawAt: v.date('raffle.drawDate', r.drawDate, r.drawTime, true) ?? '',
        drawMethod: r.drawMethod.trim(),
        permitReference: text(r.permitReference),
      })
    }
    case ECONOMIC_ACTIVITY_FUNDRAISER: {
      const f = draft.fundraiser
      v.string(
        'fundraiser.purpose',
        f.purpose,
        1000,
        _(msg`Say what the money is for.`),
      )
      v.string('fundraiser.beneficiary', f.beneficiary, 300)
      return v.result({
        $type: draft.kind,
        purpose: f.purpose.trim(),
        beneficiary: text(f.beneficiary),
        suggestedDonationMinor: v.money(
          'fundraiser.suggestedDonation',
          f.suggestedDonation,
        ),
        donationChannels: v.lines(
          'fundraiser.donationChannels',
          f.donationChannels,
          10,
          300,
        ),
      })
    }
  }
}

export function buildFinancialPlan(
  draft: PlanDraft,
  _: Translate,
  committedAt = '',
): Built<CommunityActivityFinancialPlan> {
  const v = new Validation(_, 'money')
  const currency = draft.currency.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency))
    v.issues.push({
      field: 'plan.currency',
      message: _(msg`Use a 3-letter currency code, e.g. MXN.`),
      step: 'basics',
    })
  const fundingGoalMinor = v.money('plan.fundingGoal', draft.fundingGoal)
  const expenseBudgetMinor = v.money('plan.expenseBudget', draft.expenseBudget)
  if (draft.allocations.length < 1 || draft.allocations.length > 10)
    v.add('plan.allocations', _(msg`List between 1 and 10 destinations.`))
  const allocations = draft.allocations.map(row => {
    const field = `plan.allocations.${row.key}`
    v.string(
      `${field}.label`,
      row.label,
      120,
      _(msg`Every destination needs a name.`),
    )
    const shareBps = parsePercentToBps(row.percent)
    if (!Number.isSafeInteger(shareBps) || !shareBps || shareBps > 10000)
      v.add(
        `${field}.percent`,
        _(msg`Enter a percentage above zero and no more than 100%.`),
      )
    return {
      recipient: row.recipient,
      label: row.label.trim(),
      shareBps: shareBps ?? 0,
    }
  })
  if (allocations.reduce((sum, row) => sum + row.shareBps, 0) !== 10000)
    v.add('plan.allocations', _(msg`Destinations must add up to exactly 100%.`))
  return v.result({
    currency,
    allocationBase: draft.allocationBase,
    fundingGoalMinor,
    expenseBudgetMinor,
    allocations,
    committedAt,
  })
}

export function creationSteps(category: ActivityCategory): CreationStep[] {
  return category === 'economic'
    ? ['type', 'basics', 'details', 'money', 'review']
    : ['type', 'basics', 'details', 'review']
}

/** Changes to any economic offer or plan require a fresh review commitment. */
export function updateActivityDraft(
  draft: ActivityDraft,
  patch: Partial<ActivityDraft>,
): ActivityDraft {
  const next = {...draft, ...patch}
  const {committed: _old, ...oldPlan} = draft.plan
  const {committed: _next, ...nextPlan} = next.plan
  if (
    draft.category === 'economic' &&
    (JSON.stringify(draft.economic) !== JSON.stringify(next.economic) ||
      JSON.stringify(oldPlan) !== JSON.stringify(nextPlan))
  ) {
    next.plan = {...next.plan, committed: false}
  }
  return next
}

export function buildActivity(
  draft: ActivityDraft,
  communityUri: string,
  _: Translate,
  options: {publishing?: boolean; now?: string} = {},
): Built<CreateCommunityActivityInput> {
  const b = draft.basics
  const v = new Validation(_, 'basics')
  if (!draft.kindSelected)
    v.issues.push({
      field: 'kind',
      step: 'type',
      message: _(msg`Choose an activity type.`),
    })
  v.string('basics.title', b.title, 300, _(msg`Add a title.`))
  v.string('basics.description', b.description, 5000)
  v.string('basics.location', b.location, 300)
  const startsAt = v.date('basics.startDate', b.startDate, b.startTime, true)
  const endsAt = v.date('basics.endDate', b.endDate, b.endTime)
  if (startsAt && endsAt && endsAt < startsAt)
    v.add('basics.endDate', _(msg`The end must be after the start.`))
  const base = {
    communityUri,
    title: b.title.trim(),
    description: text(b.description),
    location: text(b.location),
    startsAt: startsAt ?? '',
    endsAt,
    status: 'planned' as const,
  }
  if (draft.category === 'social') {
    const details = buildSocialDetails(draft.social, _)
    v.issues.push(...details.issues)
    return {
      value:
        !v.issues.length && details.value
          ? {category: 'social', record: {...base, details: details.value}}
          : undefined,
      issues: v.issues,
      problems: v.issues.map(i => i.message),
    }
  }
  const details = buildEconomicDetails(draft.economic, _)
  const plan = buildFinancialPlan(
    draft.plan,
    _,
    options.publishing ? (options.now ?? new Date().toISOString()) : '',
  )
  const fundraiser = draft.economic.kind === ECONOMIC_ACTIVITY_FUNDRAISER
  v.issues.push(
    ...details.issues,
    ...plan.issues.map(issue =>
      issue.field === 'plan.fundingGoal' && fundraiser
        ? {...issue, step: 'details' as const}
        : issue,
    ),
  )
  if (options.publishing && !draft.plan.committed)
    v.issues.push({
      field: 'plan.committed',
      step: 'review',
      message: _(msg`Confirm that you commit to this business model.`),
    })
  return {
    value:
      !v.issues.length && details.value && plan.value
        ? {
            category: 'economic',
            record: {
              ...base,
              details: details.value,
              financialPlan: plan.value,
            },
          }
        : undefined,
    issues: v.issues,
    problems: v.issues.map(i => i.message),
  }
}
