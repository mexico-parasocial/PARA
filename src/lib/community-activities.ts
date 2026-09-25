import {type MessageDescriptor} from '@lingui/core'
import {msg} from '@lingui/core/macro'
import {sha256} from 'js-sha256'

import {
  type AssemblyFormat,
  type CommunityActivityAllocationRecipient,
  type CommunityActivityFinancialPlan,
  type CommunityActivityLedgerEntryRecord,
  type CommunityActivityLedgerEntryType,
  type CommunityActivityStatus,
  ECONOMIC_ACTIVITY_FUNDRAISER,
  ECONOMIC_ACTIVITY_RAFFLE,
  ECONOMIC_ACTIVITY_SALE,
  type EconomicActivityDetails,
  type EconomicActivityRecord,
  type EconomicActivitySale,
  type PeacefulMarchPermitStatus,
  type SignatureDriveInstrumentType,
  SOCIAL_ACTIVITY_ASSEMBLY,
  SOCIAL_ACTIVITY_PEACEFUL_MARCH,
  SOCIAL_ACTIVITY_SIGNATURE_DRIVE,
} from '#/lib/api/para-lexicons'

export const BPS_TOTAL = 10000

/*
 * Social activities organize people and never touch money; economic ones move
 * money and cannot be published without a committed business model. They are
 * separate record types so neither can be mistaken for the other: a march
 * cannot quietly start collecting, and a raffle cannot skip its ledger.
 */
export type ActivityCategory = 'social' | 'economic'

export type SocialActivityKind =
  | typeof SOCIAL_ACTIVITY_PEACEFUL_MARCH
  | typeof SOCIAL_ACTIVITY_SIGNATURE_DRIVE
  | typeof SOCIAL_ACTIVITY_ASSEMBLY

export type EconomicActivityKind = EconomicActivityDetails['$type']

type KindMeta<T extends string> = {
  value: T
  label: MessageDescriptor
  emoji: string
}

export const SOCIAL_ACTIVITY_KINDS: KindMeta<SocialActivityKind>[] = [
  {
    value: SOCIAL_ACTIVITY_PEACEFUL_MARCH,
    label: msg`Peaceful march`,
    emoji: '🕊️',
  },
  {
    value: SOCIAL_ACTIVITY_SIGNATURE_DRIVE,
    label: msg`Signature drive`,
    emoji: '✍️',
  },
  {value: SOCIAL_ACTIVITY_ASSEMBLY, label: msg`Assembly`, emoji: '🏛️'},
]

export const ECONOMIC_ACTIVITY_KINDS: KindMeta<EconomicActivityKind>[] = [
  {value: ECONOMIC_ACTIVITY_SALE, label: msg`Sale`, emoji: '🛍️'},
  {value: ECONOMIC_ACTIVITY_RAFFLE, label: msg`Raffle`, emoji: '🎟️'},
  {value: ECONOMIC_ACTIVITY_FUNDRAISER, label: msg`Fundraiser`, emoji: '🤝'},
]

const UNKNOWN_KIND: KindMeta<string> = {
  value: '',
  label: msg`Activity`,
  emoji: '📌',
}

/** Metadata for a `details.$type`; unknown kinds from newer clients degrade. */
export function getActivityKindMeta(
  kind: string | undefined,
): KindMeta<string> {
  return (
    [...SOCIAL_ACTIVITY_KINDS, ...ECONOMIC_ACTIVITY_KINDS].find(
      item => item.value === kind,
    ) ?? UNKNOWN_KIND
  )
}

export const PERMIT_STATUSES: Array<{
  value: PeacefulMarchPermitStatus
  label: MessageDescriptor
}> = [
  {value: 'not_required', label: msg`Not required`},
  {value: 'requested', label: msg`Requested`},
  {value: 'granted', label: msg`Granted`},
  {value: 'denied', label: msg`Denied`},
]

export const INSTRUMENT_TYPES: Array<{
  value: SignatureDriveInstrumentType
  label: MessageDescriptor
}> = [
  {value: 'bill', label: msg`Bill`},
  {value: 'law', label: msg`Law`},
  {value: 'citizen_initiative', label: msg`Citizen initiative`},
  {value: 'referendum', label: msg`Referendum`},
  {value: 'petition', label: msg`Petition`},
]

export const ASSEMBLY_FORMATS: Array<{
  value: AssemblyFormat
  label: MessageDescriptor
}> = [
  {value: 'in_person', label: msg`In person`},
  {value: 'online', label: msg`Online`},
  {value: 'hybrid', label: msg`Hybrid`},
]

export const SALE_CHANNELS: Array<{
  value: EconomicActivitySale['channel']
  label: MessageDescriptor
}> = [
  {value: 'in_person', label: msg`In person`},
  {value: 'online', label: msg`Online`},
  {value: 'mixed', label: msg`Both`},
]

export const ACTIVITY_STATUSES: Array<{
  value: CommunityActivityStatus
  label: MessageDescriptor
}> = [
  {value: 'planned', label: msg`Planned`},
  {value: 'active', label: msg`In progress`},
  {value: 'completed', label: msg`Completed`},
  {value: 'cancelled', label: msg`Cancelled`},
]

export const ALLOCATION_RECIPIENTS: Array<{
  value: CommunityActivityAllocationRecipient
  label: MessageDescriptor
}> = [
  {value: 'community', label: msg`Community fund`},
  {value: 'party', label: msg`Party`},
  {value: 'cause', label: msg`Cause / third party`},
  {value: 'organizers', label: msg`Organizers`},
  {value: 'reinvestment', label: msg`Reinvestment`},
]

export const LEDGER_ENTRY_TYPES: Array<{
  value: CommunityActivityLedgerEntryType
  label: MessageDescriptor
}> = [
  {value: 'income', label: msg`Income`},
  {value: 'expense', label: msg`Expense`},
  {value: 'donation', label: msg`Donation delivered`},
]

export const EXPENSE_CATEGORIES = [
  'materials',
  'permits',
  'transport',
  'venue',
  'prizes',
  'fees',
  'other',
] as const

export const INCOME_CATEGORIES = ['sales', 'tickets', 'other'] as const

// ─── Money ──────────────────────────────────────────────────────────────────

/**
 * Parses user input like "1,234.5" into integer minor units (123450). Records
 * never carry floats, so every amount crosses this boundary exactly once.
 * Returns undefined for anything that is not a non-negative amount with at
 * most two decimals.
 */
export function parseMoneyToMinor(input: string): number | undefined {
  const cleaned = input.trim().replace(/[,\s$]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return undefined
  const [whole, fraction = ''] = cleaned.split('.')
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(minor) ? minor : undefined
}

export function formatMinor(amountMinor: number, currency: string) {
  const sign = amountMinor < 0 ? '-' : ''
  const abs = Math.abs(amountMinor)
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const fraction = (abs % 100).toString().padStart(2, '0')
  return `${sign}$${whole}.${fraction} ${currency}`
}

export function formatBps(bps: number) {
  const pct = bps / 100
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`
}

/** Accepts "12.5" or "12.5%" and returns basis points (1250). */
export function parsePercentToBps(input: string): number | undefined {
  const cleaned = input.trim().replace('%', '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return undefined
  const [whole, fraction = ''] = cleaned.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

// ─── Plan commitment ────────────────────────────────────────────────────────

export type FinancialPlanIssue =
  | 'currency'
  | 'no_allocations'
  | 'allocation_label'
  | 'allocation_share'
  | 'shares_total'

export function validateFinancialPlan(
  plan: Pick<CommunityActivityFinancialPlan, 'currency' | 'allocations'>,
): FinancialPlanIssue[] {
  const issues: FinancialPlanIssue[] = []
  if (!/^[A-Z]{3}$/.test(plan.currency)) issues.push('currency')
  if (plan.allocations.length === 0) issues.push('no_allocations')
  if (plan.allocations.some(a => !a.label.trim())) {
    issues.push('allocation_label')
  }
  if (
    plan.allocations.some(a => !Number.isInteger(a.shareBps) || a.shareBps <= 0)
  ) {
    issues.push('allocation_share')
  }
  const total = plan.allocations.reduce((sum, a) => sum + a.shareBps, 0)
  if (plan.allocations.length > 0 && total !== BPS_TOTAL) {
    issues.push('shares_total')
  }
  return issues
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        const v = (value as Record<string, unknown>)[key]
        if (v !== undefined) acc[key] = canonicalize(v)
        return acc
      }, {})
  }
  return value
}

export type EconomicTerms = Pick<
  EconomicActivityRecord,
  'financialPlan' | 'details'
>

/*
 * Everything that is part of the deal with buyers and recipients: the split,
 * the budget, and the prices and quantities on offer. The raffle's winning
 * tickets are the one field of `details` that is filled in afterwards, so
 * they are left out.
 */
function committedTerms({financialPlan, details}: EconomicTerms) {
  const {$type: _planType, ...plan} = financialPlan as typeof financialPlan & {
    $type?: string
  }
  if (details.$type === ECONOMIC_ACTIVITY_RAFFLE) {
    const {winningTickets: _drawn, ...terms} = details
    return {plan, details: terms}
  }
  return {plan, details}
}

/**
 * The fingerprint of an economic activity's committed terms. Ledger entries
 * store it, so if an organizer rewrites the split or reprices tickets after
 * money has moved, every entry booked under the old terms stops matching and
 * the activity page says so. Key order does not affect it; array order does,
 * since it is presentation the organizer chose.
 */
export function computeTermsDigest(terms: EconomicTerms) {
  // `create()` is js-sha256's pure-JS path on every platform, so the digest
  // never depends on whether Node's crypto happens to be present.
  return sha256
    .create()
    .update(JSON.stringify(canonicalize(committedTerms(terms))))
    .hex()
}

// ─── Ledger summary ─────────────────────────────────────────────────────────

export type AllocationSettlement = {
  recipient: string
  label: string
  shareBps: number
  /** What the committed plan says this recipient is owed so far. */
  committedMinor: number
  /** Donation entries actually delivered to this recipient. */
  deliveredMinor: number
  outstandingMinor: number
}

export type LedgerSummary = {
  currency: string
  incomeMinor: number
  expenseMinor: number
  deliveredMinor: number
  netProceedsMinor: number
  /** The amount the allocation shares apply to (net or gross). */
  distributableMinor: number
  settlements: AllocationSettlement[]
  /** Donations whose recipient is not part of the plan. */
  unplannedDeliveredMinor: number
  budgetOverrunMinor: number
  fundingGoalProgressBps?: number
  /** Entries booked under a different version of the plan. */
  staleEntryCount: number
  /** Entries in a different currency; excluded from every total. */
  foreignCurrencyEntryCount: number
  /** Units or tickets reported sold by income entries. */
  unitsSold: number
  /** What the terms offer for sale, when every offer states a quantity. */
  unitsAvailable?: number
  /** Income entries whose amount is not quantity × the committed price. */
  mispricedEntryCount: number
  entryCount: number
}

/**
 * Remainders from integer division go to the first allocation so that the
 * committed amounts always add up exactly to the distributable total.
 */
function splitByShares(total: number, shares: number[]) {
  if (total <= 0) return shares.map(() => 0)
  const parts = shares.map(bps => Math.floor((total * bps) / BPS_TOTAL))
  const remainder = total - parts.reduce((sum, part) => sum + part, 0)
  if (parts.length > 0) parts[0] += remainder
  return parts
}

/** The committed price of what an income entry says it sold, if any. */
export function committedUnitPrice(
  details: EconomicActivityDetails,
  itemName?: string,
): number | undefined {
  if (details.$type === ECONOMIC_ACTIVITY_RAFFLE)
    return details.ticketPriceMinor
  if (details.$type === ECONOMIC_ACTIVITY_SALE) {
    return details.items.find(item => item.name === itemName)?.unitPriceMinor
  }
  return undefined
}

function unitsOnOffer(details: EconomicActivityDetails) {
  if (details.$type === ECONOMIC_ACTIVITY_RAFFLE)
    return details.ticketsAvailable
  if (details.$type === ECONOMIC_ACTIVITY_SALE) {
    const quantities = details.items.map(item => item.quantityAvailable)
    return quantities.every(q => q !== undefined)
      ? quantities.reduce<number>((sum, q) => sum + (q ?? 0), 0)
      : undefined
  }
  return undefined
}

export function summarizeLedger(
  terms: EconomicTerms,
  entries: CommunityActivityLedgerEntryRecord[],
): LedgerSummary {
  const {financialPlan: plan, details} = terms
  const digest = computeTermsDigest(terms)
  let incomeMinor = 0
  let expenseMinor = 0
  let staleEntryCount = 0
  let foreignCurrencyEntryCount = 0
  let unitsSold = 0
  let mispricedEntryCount = 0
  const deliveredByRecipient = new Map<string, number>()

  for (const entry of entries) {
    if (entry.termsDigest !== digest) staleEntryCount += 1
    if (entry.currency !== plan.currency) {
      foreignCurrencyEntryCount += 1
      continue
    }
    if (entry.entryType === 'income') {
      incomeMinor += entry.amountMinor
      if (entry.quantity) {
        unitsSold += entry.quantity
        const price = committedUnitPrice(details, entry.itemName)
        if (
          price !== undefined &&
          entry.amountMinor !== entry.quantity * price
        ) {
          mispricedEntryCount += 1
        }
      }
    } else if (entry.entryType === 'expense') expenseMinor += entry.amountMinor
    else if (entry.entryType === 'donation') {
      const key = entry.recipient ?? ''
      deliveredByRecipient.set(
        key,
        (deliveredByRecipient.get(key) ?? 0) + entry.amountMinor,
      )
    }
  }

  const netProceedsMinor = incomeMinor - expenseMinor
  const distributableMinor =
    plan.allocationBase === 'gross_income' ? incomeMinor : netProceedsMinor
  const committed = splitByShares(
    distributableMinor,
    plan.allocations.map(a => a.shareBps),
  )

  const plannedRecipients = new Set<string>()
  const settlements = plan.allocations.map((allocation, index) => {
    // A plan may name the same recipient twice (e.g. two causes); delivered
    // funds are attributed only to the first allocation for that recipient.
    const firstForRecipient = !plannedRecipients.has(allocation.recipient)
    plannedRecipients.add(allocation.recipient)
    const deliveredMinor = firstForRecipient
      ? (deliveredByRecipient.get(allocation.recipient) ?? 0)
      : 0
    return {
      recipient: allocation.recipient,
      label: allocation.label,
      shareBps: allocation.shareBps,
      committedMinor: committed[index],
      deliveredMinor,
      outstandingMinor: Math.max(0, committed[index] - deliveredMinor),
    }
  })

  let unplannedDeliveredMinor = 0
  let deliveredMinor = 0
  for (const [recipient, amount] of deliveredByRecipient) {
    deliveredMinor += amount
    if (!plannedRecipients.has(recipient)) unplannedDeliveredMinor += amount
  }

  return {
    currency: plan.currency,
    incomeMinor,
    expenseMinor,
    deliveredMinor,
    netProceedsMinor,
    distributableMinor,
    settlements,
    unplannedDeliveredMinor,
    budgetOverrunMinor:
      plan.expenseBudgetMinor !== undefined
        ? Math.max(0, expenseMinor - plan.expenseBudgetMinor)
        : 0,
    fundingGoalProgressBps: plan.fundingGoalMinor
      ? Math.min(
          BPS_TOTAL,
          Math.floor((incomeMinor * BPS_TOTAL) / plan.fundingGoalMinor),
        )
      : undefined,
    staleEntryCount,
    foreignCurrencyEntryCount,
    unitsSold,
    unitsAvailable: unitsOnOffer(details),
    mispricedEntryCount,
    entryCount: entries.length,
  }
}

// ─── Wiki links ─────────────────────────────────────────────────────────────

export function slugifyWikiTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export type WikiBodySegment =
  | {type: 'text'; text: string}
  | {type: 'wiki'; slug: string; label: string}
  | {type: 'url'; url: string}

const WIKI_TOKEN_RE =
  /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|(https?:\/\/[^\s)]*[^\s).,;:!?'\"])/g

/**
 * Splits a wiki body into plain text, `[[slug]]` / `[[slug|label]]` links to
 * other pages of the same community, and bare http(s) URLs.
 */
export function parseWikiBody(body: string): WikiBodySegment[] {
  const segments: WikiBodySegment[] = []
  let last = 0
  for (const match of body.matchAll(WIKI_TOKEN_RE)) {
    const index = match.index ?? 0
    if (index > last) {
      segments.push({type: 'text', text: body.slice(last, index)})
    }
    if (match[3]) {
      segments.push({type: 'url', url: match[3]})
    } else {
      const target = match[1].trim()
      segments.push({
        type: 'wiki',
        slug: slugifyWikiTitle(target),
        label: (match[2] ?? target).trim(),
      })
    }
    last = index + match[0].length
  }
  if (last < body.length) {
    segments.push({type: 'text', text: body.slice(last)})
  }
  return segments
}

/**
 * Accepts either an at:// post URI or a pasted post link
 * (`…/profile/{name}/post/{rkey}[?collection=…]`) and returns an at:// URI,
 * so organizers can pin a megathread by copying its share link.
 */
export function parseThreadReference(input: string): string | undefined {
  const value = input.trim()
  if (!value) return undefined
  if (/^at:\/\/[^/]+\/[^/]+\/[^/]+$/.test(value)) return value
  const match = value.match(
    /\/profile\/([^/?#]+)\/post\/([^/?#]+)(?:\?(?:[^#]*&)?collection=([^&#]+))?/,
  )
  if (!match) return undefined
  const collection = match[3]
    ? decodeURIComponent(match[3])
    : 'app.bsky.feed.post'
  return `at://${decodeURIComponent(match[1])}/${collection}/${match[2]}`
}
