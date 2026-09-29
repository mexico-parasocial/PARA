/**
 * Security audit tests for acuerdo system — pre-launch hardening
 * These cover the 6 vectors identified in the pre-ship review.
 */
import {renderHook, act, waitFor} from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  AcuerdoProvider,
  isLockActive,
  useAcuerdos,
} from '#/state/shell/acuerdos'

/*
 * The provider only reads the viewer's DID (the tests act as did:plc:test,
 * the author and admin they create). The real session module pulls in
 * UI and native modules (Reanimated) that do not load under jest.
 */
jest.mock('#/state/session', () => ({
  useSession: () => ({currentAccount: {did: 'did:plc:test'}}),
}))

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}))

function wrapper({children}: {children: React.ReactNode}) {
  return <AcuerdoProvider>{children}</AcuerdoProvider>
}

describe('Acuerdo Security — Vector 1: Cooldown enforcement', () => {
  it('prevents joining while cooldown is active', async () => {
    const {result} = renderHook(() => useAcuerdos(), {wrapper})

    // One act per step: result.current only reflects state after a render.
    let acuerdoUri = ''
    await act(async () => {
      const acuerdo = await result.current.createAcuerdo({
        title: 'Test',
        description: 'D',
        author: 'did:plc:test',
        scope: {type: 'policy', subjects: ['did:plc:subj']},
        visibility: 'public',
        admins: ['did:plc:test'],
        minLockQuorum: 5,
        phase: 'forming',
      })
      acuerdoUri = acuerdo.uri
    })
    await act(async () => {
      await result.current.joinAcuerdo(acuerdoUri, 'follow-acuerdo')
    })
    await act(async () => {
      await result.current.requestExit(result.current.myLocks[0].id)
    })

    await expect(
      act(async () => {
        await result.current.joinAcuerdo(acuerdoUri, 'follow-acuerdo')
      }),
    ).rejects.toThrow(/Cooldown activo/)
  })
})

describe('Acuerdo Security — Vector 1b: Revocable at any moment', () => {
  async function joined(result: {current: ReturnType<typeof useAcuerdos>}) {
    let uri = ''
    await act(async () => {
      const acuerdo = await result.current.createAcuerdo({
        title: 'Mandato',
        description: 'D',
        author: 'did:plc:test',
        scope: {type: 'policy', subjects: ['did:plc:subj']},
        visibility: 'public',
        admins: ['did:plc:test'],
        minLockQuorum: 5,
        phase: 'forming',
      })
      uri = acuerdo.uri
    })
    await act(async () => {
      await result.current.joinAcuerdo(uri, 'follow-acuerdo')
    })
    return uri
  }

  it('releases the vote the moment the member leaves', async () => {
    const {result} = renderHook(() => useAcuerdos(), {wrapper})
    const uri = await joined(result)
    expect(result.current.getAcuerdoByUri(uri)?.lockedCount).toBe(1)
    expect(result.current.isSubjectLocked('did:plc:subj')).toBe(true)

    await act(async () => {
      await result.current.requestExit(result.current.myLocks[0].id)
    })

    const acuerdo = result.current.getAcuerdoByUri(uri)
    expect(acuerdo?.lockedCount).toBe(0)
    expect(acuerdo?.isLockedByViewer).toBe(false)
    expect(result.current.isSubjectLocked('did:plc:subj')).toBe(false)
    expect(isLockActive(result.current.myLocks[0])).toBe(false)
  })

  it('does not count a second exit', async () => {
    const {result} = renderHook(() => useAcuerdos(), {wrapper})
    const uri = await joined(result)
    const lockId = result.current.myLocks[0].id
    await act(async () => {
      await result.current.requestExit(lockId)
    })
    await act(async () => {
      await result.current.requestExit(lockId)
    })
    expect(result.current.getAcuerdoByUri(uri)?.lockedCount).toBe(0)
  })

  it('refuses joining twice, which would count the vote twice', async () => {
    const {result} = renderHook(() => useAcuerdos(), {wrapper})
    const uri = await joined(result)
    await expect(
      act(async () => {
        await result.current.joinAcuerdo(uri, 'follow-acuerdo')
      }),
    ).rejects.toThrow(/Ya estás en este acuerdo/)
    expect(result.current.getAcuerdoByUri(uri)?.lockedCount).toBe(1)
  })

  it('gives a lock a 90-day term, and renewing restarts it', async () => {
    const {result} = renderHook(() => useAcuerdos(), {wrapper})
    await joined(result)
    const lock = result.current.myLocks[0]
    const term = Date.parse(lock.expiresAt!) - Date.parse(lock.lockedAt)
    expect(term).toBe(90 * 24 * 60 * 60 * 1000)

    await act(async () => {
      await result.current.renewLock(lock.id)
    })
    const renewed = result.current.myLocks[0]
    expect(renewed.renewedAt).toBeDefined()
    expect(Date.parse(renewed.expiresAt!)).toBeGreaterThanOrEqual(
      Date.parse(lock.expiresAt!),
    )
  })

  it('stops counting a lock that lapsed, without a cooldown', async () => {
    jest.useFakeTimers()
    try {
      const {result} = renderHook(() => useAcuerdos(), {wrapper})
      const uri = await joined(result)
      expect(result.current.getAcuerdoByUri(uri)?.lockedCount).toBe(1)

      jest.setSystemTime(Date.now() + 91 * 24 * 60 * 60 * 1000)
      await act(async () => {
        jest.advanceTimersByTime(30_000)
      })

      expect(result.current.getAcuerdoByUri(uri)?.lockedCount).toBe(0)
      expect(result.current.myLocks[0].releasedAt).toBeDefined()
      expect(result.current.isInCooldown(uri)).toBe(false)
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('Acuerdo Security — Vector 2: Cancellation cascading', () => {
  it('cancels parent and all child acuerdos', async () => {
    const {result} = renderHook(() => useAcuerdos(), {wrapper})

    // One act per step: result.current only reflects state after a render.
    let parentUri = ''
    let childUri = ''
    await act(async () => {
      const parent = await result.current.createAcuerdo({
        title: 'Parent',
        description: 'P',
        author: 'did:plc:test',
        scope: {type: 'multi', subjects: []},
        visibility: 'public',
        admins: ['did:plc:test'],
        minLockQuorum: 3,
        phase: 'forming',
      })

      const child = await result.current.createAcuerdo({
        title: 'Child',
        description: 'C',
        author: 'did:plc:test',
        scope: {type: 'multi', subjects: []},
        visibility: 'public',
        admins: ['did:plc:test'],
        minLockQuorum: 3,
        phase: 'forming',
        parentAcuerdo: parent.uri,
      })
      parentUri = parent.uri
      childUri = child.uri
    })
    await act(async () => {
      await result.current.joinAcuerdo(parentUri, 'follow-acuerdo')
    })
    await act(async () => {
      await result.current.joinAcuerdo(childUri, 'follow-acuerdo')
    })

    // By URI: new acuerdos are listed first, so acuerdos[0] is the child.
    await act(async () => {
      await result.current.cancelAcuerdo(parentUri, 'test')
    })

    expect(result.current.getAcuerdoByUri(parentUri)?.phase).toBe('cancelled')
    expect(result.current.getAcuerdoByUri(childUri)?.phase).toBe('cancelled')
    expect(result.current.myLocks).toHaveLength(0)
  })
})

describe('Acuerdo Security — Vector 3: Recursive delegation depth bomb', () => {
  /** Builds a parent chain of `length` acuerdos; uris[0] is the root. */
  async function buildChain(
    result: {current: ReturnType<typeof useAcuerdos>},
    length: number,
  ) {
    const uris: string[] = []
    await act(async () => {
      for (let i = 0; i < length; i++) {
        const a = await result.current.createAcuerdo({
          title: `A${i}`,
          description: 'D',
          author: 'did:plc:test',
          scope: {type: 'policy', subjects: []},
          visibility: 'public',
          admins: ['did:plc:test'],
          minLockQuorum: 1,
          phase: 'forming',
          parentAcuerdo: i > 0 ? uris[i - 1] : undefined,
        })
        uris.push(a.uri)
      }
    })
    return uris
  }

  // docs/horizontal-governance-spec.md: max delegation depth 1 hop.
  it('resolves one hop to the parent', async () => {
    const {result} = renderHook(() => useAcuerdos(), {wrapper})
    const uris = await buildChain(result, 2)

    const resolved = result.current.resolveEffectiveVote(uris[1])
    expect(resolved.error).toBeUndefined()
    expect(resolved.effectiveDid).toBe('did:plc:test')
    expect(resolved.chain.map(c => c.acuerdoUri)).toEqual([uris[1], uris[0]])
  })

  it('halts at the second hop', async () => {
    const {result} = renderHook(() => useAcuerdos(), {wrapper})
    const uris = await buildChain(result, 3)

    const deepest = result.current.resolveEffectiveVote(uris[2])
    expect(deepest.error).toEqual({type: 'max-depth-exceeded', maxDepth: 1})
    expect(deepest.effectiveDid).toBeNull()
  })

  it('halts a long chain (depth bomb)', async () => {
    const {result} = renderHook(() => useAcuerdos(), {wrapper})
    const uris = await buildChain(result, 6)

    const deepest = result.current.resolveEffectiveVote(uris[5])
    expect(deepest.error?.type).toBe('max-depth-exceeded')
    expect(deepest.effectiveDid).toBeNull()
  })

  it('detects circular references', async () => {
    const {result} = renderHook(() => useAcuerdos(), {wrapper})

    let a1Uri = ''
    let a2Uri = ''

    await act(async () => {
      const a1 = await result.current.createAcuerdo({
        title: 'A1',
        description: 'D',
        author: 'did:plc:test',
        scope: {type: 'policy', subjects: []},
        visibility: 'public',
        admins: ['did:plc:test'],
        minLockQuorum: 1,
        phase: 'forming',
      })
      a1Uri = a1.uri

      const a2 = await result.current.createAcuerdo({
        title: 'A2',
        description: 'D',
        author: 'did:plc:test',
        scope: {type: 'policy', subjects: []},
        visibility: 'public',
        admins: ['did:plc:test'],
        minLockQuorum: 1,
        phase: 'forming',
        parentAcuerdo: a1Uri,
      })
      a2Uri = a2.uri
    })

    // Force a circular reference by mutating parentAcuerdo of a1 to point to a2
    // In real code this would be via UI, here we simulate the edge case
    const circular = result.current.resolveEffectiveVote(
      a2Uri,
      0,
      new Set([a2Uri, a1Uri]),
    )
    expect(circular.error?.type).toBe('circular-reference')
  })
})

describe('Acuerdo Security — Vector 4: Private watermarking', () => {
  it('generates unique watermarks per viewer', async () => {
    const {result} = renderHook(() => useAcuerdos(), {wrapper})

    let acuerdoUri = ''
    await act(async () => {
      const a = await result.current.createAcuerdo({
        title: 'Private',
        description: 'D',
        author: 'did:plc:test',
        scope: {type: 'policy', subjects: []},
        visibility: 'private',
        admins: ['did:plc:test'],
        minLockQuorum: 1,
        phase: 'forming',
      })
      acuerdoUri = a.uri
    })

    const w1 = result.current.generateWatermark(acuerdoUri)
    const w2 = result.current.generateWatermark(acuerdoUri)

    expect(w1.deviceFingerprint).toBeDefined()
    expect(w1.timestamp).toBeDefined()
    expect(w2.timestamp).not.toBe(w1.timestamp)
    expect(w2.deviceFingerprint).not.toBe(w1.deviceFingerprint)
  })
})

describe('Acuerdo Security — Vector 6: Quorum enforcement', () => {
  it('auto-advances phase forming → active when quorum met', async () => {
    jest.useFakeTimers()
    const {result} = renderHook(() => useAcuerdos(), {wrapper})

    let acuerdoUri = ''
    await act(async () => {
      const a = await result.current.createAcuerdo({
        title: 'Q',
        description: 'D',
        author: 'did:plc:test',
        scope: {type: 'policy', subjects: []},
        visibility: 'public',
        admins: ['did:plc:test'],
        minLockQuorum: 2,
        phase: 'forming',
      })
      acuerdoUri = a.uri
    })

    await act(async () => {
      await result.current.joinAcuerdo(acuerdoUri, 'follow-acuerdo')
      await result.current.joinAcuerdo(acuerdoUri, 'follow-acuerdo')
    })

    // Trigger interval check
    act(() => {
      jest.advanceTimersByTime(35000)
    })

    await waitFor(() =>
      expect(result.current.getAcuerdoByUri(acuerdoUri)?.phase).toBe('active'),
    )

    jest.useRealTimers()
  })

  it('reports quorum shortfall accurately', async () => {
    const {result} = renderHook(() => useAcuerdos(), {wrapper})

    let acuerdoUri = ''
    await act(async () => {
      const a = await result.current.createAcuerdo({
        title: 'Q',
        description: 'D',
        author: 'did:plc:test',
        scope: {type: 'policy', subjects: []},
        visibility: 'public',
        admins: ['did:plc:test'],
        minLockQuorum: 5,
        phase: 'forming',
      })
      acuerdoUri = a.uri
    })

    const q = result.current.checkQuorum(acuerdoUri)
    expect(q.quorumMet).toBe(false)
    expect(q.shortfall).toBe(5)

    await act(async () => {
      await result.current.joinAcuerdo(acuerdoUri, 'follow-acuerdo')
    })

    const q2 = result.current.checkQuorum(acuerdoUri)
    expect(q2.shortfall).toBe(4)
    expect(q2.lockedCount).toBe(1)
  })
})
