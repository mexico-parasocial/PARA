import {
  type CommunityActivityFinancialPlan,
  type CommunityActivityLedgerEntryRecord,
  ECONOMIC_ACTIVITY_RAFFLE,
  ECONOMIC_ACTIVITY_SALE,
  type EconomicActivityRaffle,
  type EconomicActivitySale,
} from '#/lib/api/para-lexicons'
import {
  computeTermsDigest,
  type EconomicTerms,
  formatMinor,
  parseMoneyToMinor,
  parsePercentToBps,
  parseThreadReference,
  parseWikiBody,
  slugifyWikiTitle,
  summarizeLedger,
  validateFinancialPlan,
} from '#/lib/community-activities'

const plan: CommunityActivityFinancialPlan = {
  currency: 'MXN',
  allocationBase: 'net_proceeds',
  expenseBudgetMinor: 50000,
  fundingGoalMinor: 200000,
  allocations: [
    {recipient: 'community', label: 'Fondo comunitario', shareBps: 7000},
    {recipient: 'party', label: 'Partido', shareBps: 3000},
  ],
  committedAt: '2026-09-01T00:00:00.000Z',
}

const raffle: EconomicActivityRaffle = {
  $type: ECONOMIC_ACTIVITY_RAFFLE,
  ticketPriceMinor: 5000,
  ticketsAvailable: 500,
  prizes: [{description: 'Bicicleta'}],
  drawAt: '2026-10-01T18:00:00.000Z',
  drawMethod: 'Urna sellada, transmisión en vivo',
}

const terms: EconomicTerms = {financialPlan: plan, details: raffle}

function entry(
  overrides: Partial<CommunityActivityLedgerEntryRecord>,
): CommunityActivityLedgerEntryRecord {
  return {
    activityUri: 'at://did:plc:org/com.para.community.activity/1',
    communityUri: 'at://did:plc:org/com.para.community.board/1',
    termsDigest: computeTermsDigest(terms),
    entryType: 'income',
    amountMinor: 100,
    currency: 'MXN',
    description: 'x',
    occurredAt: '2026-09-02T00:00:00.000Z',
    createdAt: '2026-09-02T00:00:00.000Z',
    ...overrides,
  }
}

describe('money parsing', () => {
  it('parses amounts into integer minor units', () => {
    expect(parseMoneyToMinor('1,234.5')).toBe(123450)
    expect(parseMoneyToMinor('$20')).toBe(2000)
    expect(parseMoneyToMinor('0.07')).toBe(7)
  })

  it('rejects negative, malformed and sub-cent amounts', () => {
    expect(parseMoneyToMinor('-5')).toBeUndefined()
    expect(parseMoneyToMinor('abc')).toBeUndefined()
    expect(parseMoneyToMinor('1.234')).toBeUndefined()
    expect(parseMoneyToMinor('')).toBeUndefined()
  })

  it('formats minor units', () => {
    expect(formatMinor(123450, 'MXN')).toBe('$1,234.50 MXN')
    expect(formatMinor(-5, 'MXN')).toBe('-$0.05 MXN')
  })

  it('parses percentages into basis points', () => {
    expect(parsePercentToBps('12.5%')).toBe(1250)
    expect(parsePercentToBps('100')).toBe(10000)
    expect(parsePercentToBps('x')).toBeUndefined()
  })
})

describe('validateFinancialPlan', () => {
  it('accepts a plan whose shares sum to 100%', () => {
    expect(validateFinancialPlan(plan)).toEqual([])
  })

  it('flags shares that do not sum to 100%', () => {
    expect(
      validateFinancialPlan({
        currency: 'MXN',
        allocations: [{recipient: 'party', label: 'P', shareBps: 5000}],
      }),
    ).toEqual(['shares_total'])
  })

  it('flags bad currency, blank labels and empty plans', () => {
    expect(
      validateFinancialPlan({
        currency: 'mx',
        allocations: [{recipient: 'party', label: ' ', shareBps: 10000}],
      }),
    ).toEqual(['currency', 'allocation_label'])
    expect(validateFinancialPlan({currency: 'MXN', allocations: []})).toEqual([
      'no_allocations',
    ])
  })
})

describe('computeTermsDigest', () => {
  it('ignores key order and the plan $type', () => {
    const reordered = {
      details: {...raffle},
      financialPlan: {
        $type: 'com.para.community.economicActivity#financialPlan',
        committedAt: plan.committedAt,
        allocations: plan.allocations.map(a => ({
          shareBps: a.shareBps,
          label: a.label,
          recipient: a.recipient,
        })),
        fundingGoalMinor: plan.fundingGoalMinor,
        expenseBudgetMinor: plan.expenseBudgetMinor,
        allocationBase: plan.allocationBase,
        currency: plan.currency,
      },
    } as EconomicTerms
    expect(computeTermsDigest(reordered)).toBe(computeTermsDigest(terms))
  })

  it('changes when the split changes', () => {
    const edited = {
      ...terms,
      financialPlan: {
        ...plan,
        allocations: [
          {...plan.allocations[0], shareBps: 5000},
          {...plan.allocations[1], shareBps: 5000},
        ],
      },
    }
    expect(computeTermsDigest(edited)).not.toBe(computeTermsDigest(terms))
  })

  it('changes when the ticket price changes', () => {
    const repriced = {...terms, details: {...raffle, ticketPriceMinor: 6000}}
    expect(computeTermsDigest(repriced)).not.toBe(computeTermsDigest(terms))
  })

  it('does not change when the winning tickets are published', () => {
    const drawn = {...terms, details: {...raffle, winningTickets: ['0042']}}
    expect(computeTermsDigest(drawn)).toBe(computeTermsDigest(terms))
  })
})

describe('summarizeLedger', () => {
  it('splits net proceeds by the committed shares', () => {
    const summary = summarizeLedger(terms, [
      entry({entryType: 'income', amountMinor: 100000}),
      entry({entryType: 'expense', amountMinor: 20001}),
      entry({
        entryType: 'donation',
        amountMinor: 30000,
        recipient: 'community',
      }),
    ])
    expect(summary.netProceedsMinor).toBe(79999)
    expect(summary.distributableMinor).toBe(79999)
    // 70% of 79999 = 55999.3 → 55999 plus the remainder cent → 56000
    expect(summary.settlements.map(s => s.committedMinor)).toEqual([
      56000, 23999,
    ])
    expect(summary.settlements[0].deliveredMinor).toBe(30000)
    expect(summary.settlements[0].outstandingMinor).toBe(26000)
    expect(summary.fundingGoalProgressBps).toBe(5000)
    expect(summary.budgetOverrunMinor).toBe(0)
    expect(summary.staleEntryCount).toBe(0)
  })

  it('applies shares to gross income when the plan says so', () => {
    const summary = summarizeLedger(
      {...terms, financialPlan: {...plan, allocationBase: 'gross_income'}},
      [
        entry({entryType: 'income', amountMinor: 1000}),
        entry({entryType: 'expense', amountMinor: 400}),
      ],
    )
    expect(summary.distributableMinor).toBe(1000)
    expect(summary.settlements.map(s => s.committedMinor)).toEqual([700, 300])
  })

  it('commits nothing when expenses exceed income', () => {
    const summary = summarizeLedger(terms, [
      entry({entryType: 'income', amountMinor: 100}),
      entry({entryType: 'expense', amountMinor: 60000}),
    ])
    expect(summary.settlements.every(s => s.committedMinor === 0)).toBe(true)
    expect(summary.budgetOverrunMinor).toBe(10000)
  })

  it('flags entries booked under other terms', () => {
    const summary = summarizeLedger(terms, [
      entry({termsDigest: 'deadbeef'}),
      entry({}),
    ])
    expect(summary.staleEntryCount).toBe(1)
  })

  it('excludes foreign-currency entries and tracks unplanned recipients', () => {
    const summary = summarizeLedger(terms, [
      entry({entryType: 'income', amountMinor: 500, currency: 'USD'}),
      entry({entryType: 'donation', amountMinor: 50, recipient: 'organizers'}),
    ])
    expect(summary.incomeMinor).toBe(0)
    expect(summary.foreignCurrencyEntryCount).toBe(1)
    expect(summary.unplannedDeliveredMinor).toBe(50)
    expect(summary.deliveredMinor).toBe(50)
  })

  it('counts raffle tickets sold and flags entries off the ticket price', () => {
    const summary = summarizeLedger(terms, [
      entry({entryType: 'income', amountMinor: 50000, quantity: 10}),
      entry({entryType: 'income', amountMinor: 40000, quantity: 10}),
    ])
    expect(summary.unitsSold).toBe(20)
    expect(summary.unitsAvailable).toBe(500)
    expect(summary.mispricedEntryCount).toBe(1)
  })

  it('prices sale income by item and totals stock only when all is stated', () => {
    const sale: EconomicActivitySale = {
      $type: ECONOMIC_ACTIVITY_SALE,
      channel: 'in_person',
      items: [
        {name: 'Tamal', unitPriceMinor: 2500, quantityAvailable: 100},
        {name: 'Café', unitPriceMinor: 1500, quantityAvailable: 50},
      ],
    }
    const summary = summarizeLedger({financialPlan: plan, details: sale}, [
      entry({amountMinor: 7500, quantity: 3, itemName: 'Tamal'}),
      entry({amountMinor: 3000, quantity: 2, itemName: 'Café'}),
    ])
    expect(summary.unitsSold).toBe(5)
    expect(summary.unitsAvailable).toBe(150)
    expect(summary.mispricedEntryCount).toBe(0)

    const open = summarizeLedger(
      {
        financialPlan: plan,
        details: {...sale, items: [{name: 'Libro', unitPriceMinor: 100}]},
      },
      [],
    )
    expect(open.unitsAvailable).toBeUndefined()
  })
})

describe('wiki body parsing', () => {
  it('slugifies titles', () => {
    expect(slugifyWikiTitle('  Reglas de Participación! ')).toBe(
      'reglas-de-participacion',
    )
  })

  it('splits text, wiki links and urls', () => {
    expect(
      parseWikiBody('See [[Reglas Básicas|the rules]] and https://ine.mx/x.'),
    ).toEqual([
      {type: 'text', text: 'See '},
      {type: 'wiki', slug: 'reglas-basicas', label: 'the rules'},
      {type: 'text', text: ' and '},
      {type: 'url', url: 'https://ine.mx/x'},
      {type: 'text', text: '.'},
    ])
    expect(parseWikiBody('[[FAQ]]')).toEqual([
      {type: 'wiki', slug: 'faq', label: 'FAQ'},
    ])
  })
})

describe('parseThreadReference', () => {
  it('keeps at:// URIs and converts pasted post links', () => {
    expect(parseThreadReference('at://did:plc:a/com.para.post/3k')).toBe(
      'at://did:plc:a/com.para.post/3k',
    )
    expect(
      parseThreadReference('https://para.social/profile/ana.test/post/3k2'),
    ).toBe('at://ana.test/app.bsky.feed.post/3k2')
    expect(
      parseThreadReference(
        '/profile/did:plc:a/post/3k?collection=com.para.post',
      ),
    ).toBe('at://did:plc:a/com.para.post/3k')
  })

  it('rejects anything else', () => {
    expect(parseThreadReference('https://example.com/x')).toBeUndefined()
    expect(parseThreadReference('')).toBeUndefined()
  })
})
