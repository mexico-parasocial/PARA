import {type LabelCandidate, placeMapLabels} from '../mapLabels'

const viewport = {width: 800, height: 600}

const node = (
  id: string,
  x: number,
  y: number,
  over: Partial<LabelCandidate> = {},
): LabelCandidate => ({id, x, y, r: 8, text: id, priority: 0, ...over})

describe('placeMapLabels', () => {
  it('labels nodes that have room', () => {
    const placed = placeMapLabels(
      [node('a', 100, 100), node('b', 400, 100), node('c', 100, 400)],
      {viewport},
    )
    expect([...placed.keys()].sort()).toEqual(['a', 'b', 'c'])
  })

  it('gives the preferred spot to the higher-priority label', () => {
    const placed = placeMapLabels(
      [
        node('quiet', 100, 100, {text: 'A long label here', priority: 1}),
        node('busy', 120, 102, {text: 'Another long label', priority: 5}),
      ],
      {viewport},
    )
    expect(placed.get('busy')?.side).toBe('below')
    expect(placed.get('quiet')?.side).not.toBe('below')
  })

  it('drops a label that has nowhere to go', () => {
    // Four neighbours box `quiet` in; `busy` takes the one free side.
    const placed = placeMapLabels(
      [
        node('quiet', 300, 300, {text: 'Boxed in', priority: 0}),
        node('n', 300, 276, {text: ''}),
        node('s', 300, 324, {text: ''}),
        node('e', 330, 300, {text: ''}),
        node('w', 270, 300, {text: ''}),
      ],
      {viewport},
    )
    expect(placed.has('quiet')).toBe(false)
  })

  it('places a forced label first, in the preferred spot', () => {
    const placed = placeMapLabels(
      [
        node('busy', 120, 102, {text: 'Another long label', priority: 99}),
        node('selected', 100, 100, {text: 'A long label', force: true}),
      ],
      {viewport},
    )
    expect(placed.get('selected')?.side).toBe('below')
    expect(placed.get('busy')?.side).not.toBe('below')
  })

  it('never puts a label across another node', () => {
    // b sits right where a's label would go below.
    const placed = placeMapLabels(
      [node('a', 100, 100, {priority: 2}), node('b', 100, 124, {priority: 1})],
      {viewport},
    )
    expect(placed.get('a')?.side).not.toBe('below')
  })

  it('places more labels as the nodes spread apart', () => {
    const cluster = (spread: number) =>
      Array.from({length: 9}, (_, i) =>
        node(
          `n${i}`,
          300 + (i % 3) * spread,
          300 + Math.floor(i / 3) * spread,
          {
            text: `Item number ${i}`,
          },
        ),
      )
    const tight = placeMapLabels(cluster(30), {viewport}).size
    const loose = placeMapLabels(cluster(120), {viewport}).size
    expect(tight).toBeLessThan(loose)
    expect(loose).toBe(9)
  })

  it('skips labels outside the viewport', () => {
    const placed = placeMapLabels([node('far', 2000, 2000)], {viewport})
    expect(placed.size).toBe(0)
  })

  it('caps the label width', () => {
    const placed = placeMapLabels(
      [node('a', 400, 300, {text: 'x'.repeat(200)})],
      {viewport, maxWidth: 150},
    )
    expect(placed.get('a')?.width).toBe(150)
  })
})

describe('placeMapLabels sides', () => {
  it('moves a label beside its node when below is taken', () => {
    const placed = placeMapLabels(
      [node('a', 100, 100, {priority: 2}), node('b', 100, 124, {priority: 1})],
      {viewport},
    )
    expect(placed.get('a')?.side).not.toBe('below')
    expect(placed.has('b')).toBe(true)
  })

  it('keeps a forced label even when every side is blocked', () => {
    const crowd = [
      node('x', 100, 100, {force: true, text: 'Selected'}),
      node('n1', 100, 124),
      node('n2', 100, 76),
      node('n3', 130, 100),
      node('n4', 70, 100),
    ]
    expect(placeMapLabels(crowd, {viewport}).get('x')?.side).toBe('below')
  })
})

describe('placeMapLabels boundaries', () => {
  it('does not place a label that would be cut off by the edge', () => {
    // Every side of a node in the corner runs off screen.
    const placed = placeMapLabels(
      [node('corner', 2, 2, {text: 'A label far too long for the corner'})],
      {viewport: {width: 40, height: 40}},
    )
    expect(placed.size).toBe(0)
  })

  it('keeps labels off other text on the map', () => {
    const title = {left: 0, top: 104, right: 800, bottom: 140}
    const placed = placeMapLabels([node('a', 400, 90)], {
      viewport,
      obstacles: [title],
    })
    expect(placed.get('a')?.side).not.toBe('below')
  })
})
