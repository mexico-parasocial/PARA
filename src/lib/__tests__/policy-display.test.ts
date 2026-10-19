import {describe, expect, it} from '@jest/globals'

import {
  formatSignal,
  getMatterTag,
  getOutcomeMeta,
  getQuorumProgress,
  getSignalColor,
  getSignalCounts,
  humanizeFlairTag,
  parseSignalAverage,
  splitPolicyText,
} from '../policy-display'

describe('policy display helpers', () => {
  it('fills missing signal buckets with zero, in -3..+3 order', () => {
    const counts = getSignalCounts({
      breakdown: [
        {signal: 3, count: 4},
        {signal: -3, count: 1},
        {signal: 0, count: 2},
      ],
    })
    expect(counts).toEqual([1, 0, 0, 2, 0, 0, 4])
  })

  it('caps quorum progress at 1 and tolerates a zero target', () => {
    expect(getQuorumProgress({voteCount: 5, quorumTarget: 10})).toBe(0.5)
    expect(getQuorumProgress({voteCount: 30, quorumTarget: 10})).toBe(1)
    expect(getQuorumProgress({voteCount: 3, quorumTarget: 0})).toBe(0)
  })

  it('parses the published average and rejects unreadable values', () => {
    expect(parseSignalAverage('1.5')).toBe(1.5)
    expect(parseSignalAverage('-2.25')).toBe(-2.25)
    expect(parseSignalAverage('')).toBe(0)
    expect(parseSignalAverage('NaN')).toBe(0)
    expect(parseSignalAverage('9')).toBe(3)
  })

  it('formats signals with an explicit sign for support', () => {
    expect(formatSignal(2)).toBe('+2')
    expect(formatSignal(0)).toBe('0')
    expect(formatSignal(-3)).toBe('-3')
  })

  it('falls back to the no-quorum outcome for unknown values', () => {
    expect(getOutcomeMeta('passed').label).toBe('Con apoyo')
    expect(getOutcomeMeta('something_new')).toEqual(
      getOutcomeMeta('insufficient_quorum'),
    )
  })

  it('clamps the signal colour to the -3..+3 range', () => {
    expect(getSignalColor(9)).toBe(getSignalColor(3))
    expect(getSignalColor(-9)).toBe(getSignalColor(-3))
  })

  it('takes the first line as the title', () => {
    expect(splitPolicyText('Agua para todos\nGarantizar el acceso.')).toEqual({
      title: 'Agua para todos',
      body: 'Garantizar el acceso.',
    })
  })

  it('splits a long single paragraph at its first sentence', () => {
    const text =
      'Crear un fondo estatal para el transporte público de la región norte. Se financiaría con un impuesto a la gasolina premium.'
    expect(splitPolicyText(text)).toEqual({
      title:
        'Crear un fondo estatal para el transporte público de la región norte.',
      body: 'Se financiaría con un impuesto a la gasolina premium.',
    })
  })

  it('keeps a short single line whole', () => {
    expect(splitPolicyText('  Ciclovías seguras  ')).toEqual({
      title: 'Ciclovías seguras',
      body: '',
    })
  })

  it("finds the matter among a policy's flairs", () => {
    expect(getMatterTag(['||#Policy', '|#NiUnaMenos'])).toBe('|#NiUnaMenos')
    expect(getMatterTag(['||#Policy', '||#Cultura'])).toBeUndefined()
    expect(getMatterTag(undefined)).toBeUndefined()
  })

  it('turns a flair tag into a readable label', () => {
    expect(humanizeFlairTag('|#NiUnaMenos')).toBe('Ni Una Menos')
    expect(humanizeFlairTag('||#PresupuestoParticipativo')).toBe(
      'Presupuesto Participativo',
    )
  })
})
