import {isPolicyCard} from '../cardVoting'

describe('community card voting identity', () => {
  it('recognizes seeded policy posts stored as article cards', () => {
    expect(
      isPolicyCard({
        card_type: 'article',
        metadata: JSON.stringify({
          postType: 'policy',
          flairId: 'demo-agua-topic-empresa',
        }),
      }),
    ).toBe(true)
    expect(isPolicyCard({card_type: 'policy'})).toBe(true)
  })

  it('does not treat a topic about a policy as the policy itself', () => {
    expect(
      isPolicyCard({
        card_type: 'topic',
        metadata: JSON.stringify({
          flairId: 'policy_empresa_publica_agua',
          policyCategory: '||#EmpresaPublicaDeAgua',
        }),
      }),
    ).toBe(false)
    expect(
      isPolicyCard({
        card_type: 'social',
        metadata: JSON.stringify({postType: 'matter'}),
      }),
    ).toBe(false)
    expect(isPolicyCard({card_type: 'research'})).toBe(false)
  })

  it('keeps legacy and malformed metadata on regular voting controls', () => {
    for (const metadata of ['not-json', 'null', '[]', '"policy"']) {
      expect(isPolicyCard({card_type: 'article', metadata})).toBe(false)
    }
  })
})
