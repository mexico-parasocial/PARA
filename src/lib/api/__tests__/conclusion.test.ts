import {type CabildeoServiceAgent} from '../cabildeo'
import {
  EMPTY_CONCLUSION,
  fetchConclusion,
  publishConclusion,
} from '../conclusion'

jest.mock('#/lexicons', () => ({
  com: {
    para: {civic: {getConclusion: 'get'}},
    atproto: {repo: {createRecord: 'create'}},
  },
}))

const CABILDEO = 'at://did:plc:a/com.para.civic.cabildeo/1'
const BOARD = 'at://did:plc:a/com.para.community.board/b'

const appview = jest.fn()
const pds = jest.fn()
const agent = {
  appviewClient: {call: appview},
  pdsClient: {call: pds},
  session: {did: 'did:plc:steward'},
} as unknown as CabildeoServiceAgent
beforeEach(() => {
  appview.mockReset()
  pds.mockReset()
})

describe('fetchConclusion', () => {
  it('returns the conclusion, its history and the board to name', async () => {
    appview.mockResolvedValue({
      conclusion: {uri: 'c2'},
      earlier: [{uri: 'c1'}],
      communityUri: BOARD,
    })
    expect(await fetchConclusion(agent, CABILDEO)).toEqual({
      conclusion: {uri: 'c2'},
      earlier: [{uri: 'c1'}],
      communityUri: BOARD,
    })
    expect(appview).toHaveBeenCalledWith('get', {cabildeo: CABILDEO})
  })

  it('reads a missing conclusion as empty but keeps the board', async () => {
    appview.mockResolvedValue({earlier: [], communityUri: BOARD})
    expect(await fetchConclusion(agent, CABILDEO)).toEqual({
      conclusion: null,
      earlier: [],
      communityUri: BOARD,
    })
  })

  it('reads an AppView without the method as empty', async () => {
    appview.mockRejectedValue({status: 501, error: 'MethodNotImplemented'})
    expect(await fetchConclusion(agent, CABILDEO)).toBe(EMPTY_CONCLUSION)
  })

  it('does not hide a real failure', async () => {
    appview.mockRejectedValue(new Error('network down'))
    await expect(fetchConclusion(agent, CABILDEO)).rejects.toThrow(
      'network down',
    )
  })
})

describe('publishConclusion', () => {
  it('writes a trimmed record to the steward repo naming the board', async () => {
    pds.mockResolvedValue({uri: 'u'})
    await publishConclusion(agent, {
      cabildeo: CABILDEO,
      communityUri: BOARD,
      text: '  Hay acuerdo.  ',
      cited: ['at://did:plc:d/com.para.civic.position/1'],
    })
    const [method, args] = pds.mock.calls[0]
    expect(method).toBe('create')
    expect(args.repo).toBe('did:plc:steward')
    expect(args.collection).toBe('com.para.civic.conclusion')
    expect(args.record).toMatchObject({
      cabildeo: CABILDEO,
      communityUri: BOARD,
      text: 'Hay acuerdo.',
      cited: ['at://did:plc:d/com.para.civic.position/1'],
    })
    expect(typeof args.record.createdAt).toBe('string')
  })

  it('leaves out an empty citation list', async () => {
    pds.mockResolvedValue({})
    await publishConclusion(agent, {
      cabildeo: CABILDEO,
      communityUri: BOARD,
      text: 'x',
      cited: [],
    })
    expect(pds.mock.calls[0][1].record).not.toHaveProperty('cited')
  })

  it('refuses when logged out', async () => {
    const out = {
      ...agent,
      session: undefined,
    } as unknown as CabildeoServiceAgent
    await expect(
      publishConclusion(out, {
        cabildeo: CABILDEO,
        communityUri: BOARD,
        text: 'x',
        cited: [],
      }),
    ).rejects.toThrow('Not logged in')
  })
})
