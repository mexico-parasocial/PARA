import {DiscourseAPI} from './discourse'

jest.mock('#/lexicons', () => ({
  com: {
    para: {
      discourse: {
        getTopology: 'com.para.discourse.getTopology',
        getTopics: 'com.para.discourse.getTopics',
      },
    },
  },
}))

function createApi(response: unknown) {
  const call = jest.fn().mockResolvedValue(response)
  const api = new DiscourseAPI({
    appviewClient: {call},
  } as unknown as ConstructorParameters<typeof DiscourseAPI>[0])
  return {api, call}
}

const emptyTopology = {
  ideologicalCentroid: {x: 0, y: 0},
  ideologicalSpread: 0,
  crossCompassEngagement: 0,
  positionDensity: {
    $type: 'com.para.discourse.getTopology#positionDensity',
  },
  argumentBalance: {claims: 0, evidence: 0, questions: 0, rebuttals: 0},
  proposalVelocity: {proposed: 0, deliberating: 0, voting: 0, resolved: 0},
}

describe('DiscourseAPI', () => {
  it('makes the empty backend topology safe for all charts', async () => {
    const {api} = createApi({topology: emptyTopology})
    const topology = await api.getTopology({timeframe: '7d'})

    expect(topology).toEqual({
      ...emptyTopology,
      positionDensity: {},
      contestedAxes: [],
      bridgeOpportunities: [],
    })
    expect(topology?.contestedAxes.map(axis => axis.axisId)).toEqual([])
    expect(topology?.bridgeOpportunities.length).toBe(0)
  })

  it('maps compass density keys and preserves populated analysis', async () => {
    const contestedAxes = [{axisId: 'economy', discourseScore: 60}]
    const bridgeOpportunities = [{description: 'Shared topic'}]
    const {api} = createApi({
      topology: {
        ...emptyTopology,
        positionDensity: {
          ...emptyTopology.positionDensity,
          authLeft: 30,
          authCenter: 0,
          authRight: 10,
          centerLeft: 20,
          center: 40,
          centerRight: 50,
          libLeft: 60,
          libCenter: 70,
          libRight: 80,
        },
        contestedAxes,
        bridgeOpportunities,
      },
    })
    const topology = await api.getTopology({timeframe: '24h'})

    expect(topology?.positionDensity).toEqual({
      'auth-left': 30,
      'auth-center': 0,
      'auth-right': 10,
      'center-left': 20,
      center: 40,
      'center-right': 50,
      'lib-left': 60,
      'lib-center': 70,
      'lib-right': 80,
    })
    expect(topology?.contestedAxes).toEqual(contestedAxes)
    expect(topology?.bridgeOpportunities).toEqual(bridgeOpportunities)
  })

  it('returns null when there is no topology', async () => {
    const {api} = createApi({})
    expect(await api.getTopology({timeframe: '7d'})).toBeNull()
  })

  it('returns topics using their current lexicon fields', async () => {
    const topics = [{label: 'Water', weight: 30, growthRate: 2}]
    const {api, call} = createApi({topics})

    expect(
      await api.getTopics({
        community: 'at://did:plc:test/com.para.community/1',
        timeframe: '7d',
      }),
    ).toEqual(topics)
    expect(call).toHaveBeenCalledWith('com.para.discourse.getTopics', {
      community: 'at://did:plc:test/com.para.community/1',
    })
  })
})
