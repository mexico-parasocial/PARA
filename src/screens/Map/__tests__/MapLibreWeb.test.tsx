/**
 * Regression tests for the MapLibre web adapter, run against a fake
 * `maplibre-gl` that keeps the real library's behaviors that have bitten us:
 *
 * - `queryRenderedFeatures` returns nothing at all if any requested layer is
 *   missing from the style.
 * - `setStyle` discards every custom source and layer, then fires `style.load`.
 * - `addLayer(layer, beforeId)` inserts below `beforeId`.
 */
import {createRef, type ReactElement} from 'react'
import {act, render} from '@testing-library/react-native'

import {forgetCamera} from '../mapLibreCamera'
import {MapLibreWeb, type MapLibreWebRef} from '../MapLibreWeb'

type Handler = (event: unknown) => void
type FakeLayer = {id: string; type: string; source?: string}

type FakeMapInstance = {
  options: {center: [number, number]; zoom: number}
  layers: FakeLayer[]
  sources: Map<string, unknown>
  queries: Array<{geometry: unknown; layers: string[]}>
  flyTo: jest.Mock
  fitBounds: jest.Mock
  setStyle: jest.Mock
  emit: (event: string, payload?: unknown) => void
  layerIds: () => string[]
  getLayer: (id: string) => FakeLayer | undefined
  getSource: (id: string) => unknown
}

jest.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

jest.mock('maplibre-gl', () => {
  const instances: FakeMapInstance[] = []

  class FakeMap {
    options: {center: [number, number]; zoom: number}
    layers: FakeLayer[] = []
    sources = new Map<string, unknown>()
    queries: Array<{geometry: unknown; layers: string[]}> = []
    handlers: Record<string, Handler[]> = {}
    hits: Record<string, unknown[]> = {}
    flyTo = jest.fn()
    fitBounds = jest.fn()
    resize = jest.fn()
    remove = jest.fn()
    zoom: number
    center: {lng: number; lat: number}

    constructor(opts: {
      center: [number, number]
      zoom: number
      style: {layers: FakeLayer[]}
    }) {
      this.options = {center: opts.center, zoom: opts.zoom}
      this.zoom = opts.zoom
      this.center = {lng: opts.center[0], lat: opts.center[1]}
      this.layers = [...opts.style.layers]
      instances.push(this)
      // The real map loads its first style asynchronously.
      void Promise.resolve().then(() => this.emit('style.load'))
    }

    setStyle = jest.fn((style: {layers: FakeLayer[]}) => {
      this.layers = [...style.layers]
      this.sources.clear()
      void Promise.resolve().then(() => this.emit('style.load'))
    })

    addControl() {}
    on(event: string, ...rest: unknown[]) {
      // map.on(event, handler) or map.on(event, layerId, handler)
      const handler = rest[rest.length - 1] as Handler
      ;(this.handlers[event] ||= []).push(handler)
    }
    off() {}
    emit(event: string, payload?: unknown) {
      for (const handler of this.handlers[event] || []) handler(payload)
    }
    getCenter() {
      return this.center
    }
    getZoom() {
      return this.zoom
    }
    getCanvas() {
      return {style: {}}
    }
    getLayer(id: string) {
      return this.layers.find(l => l.id === id)
    }
    getSource(id: string) {
      return this.sources.get(id)
    }
    addSource(id: string, source: unknown) {
      this.sources.set(id, source)
    }
    removeSource(id: string) {
      this.sources.delete(id)
    }
    addLayer(layer: FakeLayer, beforeId?: string) {
      const at = beforeId
        ? this.layers.findIndex(l => l.id === beforeId)
        : this.layers.length
      this.layers.splice(at < 0 ? this.layers.length : at, 0, layer)
    }
    removeLayer(id: string) {
      this.layers = this.layers.filter(l => l.id !== id)
    }
    setPaintProperty() {}
    layerIds() {
      return this.layers.map(l => l.id)
    }
    queryRenderedFeatures(geometry: unknown, opts: {layers: string[]}) {
      this.queries.push({geometry, layers: opts.layers})
      if (opts.layers.some(id => !this.getLayer(id))) return []
      // Top-most first, like the real renderer.
      return [...this.layers]
        .reverse()
        .filter(l => opts.layers.includes(l.id) && this.hits[l.id])
        .flatMap(l =>
          this.hits[l.id].map(properties => ({
            layer: {id: l.id},
            properties,
            geometry: {type: 'Point', coordinates: [0, 0]},
          })),
        )
    }
  }

  class LngLatBounds {
    extend() {
      return this
    }
  }
  class AttributionControl {}

  return {
    __esModule: true,
    __instances: instances,
    default: {Map: FakeMap, LngLatBounds, AttributionControl},
  }
})

const fakes = (
  jest.requireMock('maplibre-gl') as {__instances: FakeMapInstance[]}
).__instances

const initialRegion = {
  latitude: 23.6,
  longitude: -102.5,
  latitudeDelta: 30,
  longitudeDelta: 40,
}

const square = [
  {latitude: 0, longitude: 0},
  {latitude: 0, longitude: 1},
  {latitude: 1, longitude: 1},
  {latitude: 1, longitude: 0},
]

// The map mounts into a DOM node; the test renderer has none unless mocked.
function renderMap(ui: ReactElement) {
  return render(ui, {createNodeMock: () => ({})})
}

function lastMap() {
  return fakes[fakes.length - 1]
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

function click(map: FakeMapInstance, hits: Record<string, unknown[]> = {}) {
  ;(map as unknown as {hits: Record<string, unknown[]>}).hits = hits
  act(() => map.emit('click', {point: {x: 100, y: 100}}))
}

beforeAll(() => {
  ;(globalThis as {ResizeObserver?: unknown}).ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

beforeEach(() => {
  fakes.length = 0
  forgetCamera()
})

describe('MapLibreWeb', () => {
  it('adds overlay layers once the style loads, in stacking order', async () => {
    renderMap(
      <MapLibreWeb
        initialRegion={initialRegion}
        viewMode="standard"
        polygons={[{key: 'Jalisco', coordinates: square}]}
        cityMarkers={[
          {
            name: 'Guadalajara',
            stateName: 'Jalisco',
            coordinate: square[0],
            color: '#f00',
          },
        ]}
      />,
    )
    await flush()

    const ids = lastMap().layerIds()
    expect(ids.indexOf('polygon-fill')).toBeGreaterThan(
      ids.indexOf('background'),
    )
    expect(ids.indexOf('city-marker-circle')).toBeGreaterThan(
      ids.indexOf('polygon-fill'),
    )
  })

  it('keeps markers above polygons after the polygons are replaced', async () => {
    const markers = [
      {
        name: 'Guadalajara',
        stateName: 'Jalisco',
        coordinate: square[0],
        color: '#f00',
      },
    ]
    const {rerender} = renderMap(
      <MapLibreWeb
        initialRegion={initialRegion}
        viewMode="standard"
        polygons={[{key: 'a', coordinates: square}]}
        cityMarkers={markers}
      />,
    )
    await flush()

    rerender(
      <MapLibreWeb
        initialRegion={initialRegion}
        viewMode="standard"
        polygons={[{key: 'b', coordinates: square}]}
        cityMarkers={markers}
      />,
    )
    await flush()

    const ids = lastMap().layerIds()
    expect(ids.indexOf('city-marker-circle')).toBeGreaterThan(
      ids.indexOf('polygon-fill'),
    )
  })

  it('still routes a click when some overlay layers do not exist', async () => {
    const onPress = jest.fn()
    renderMap(
      <MapLibreWeb
        initialRegion={initialRegion}
        viewMode="standard"
        polygons={[{key: 'Jalisco', coordinates: square, onPress}]}
      />,
    )
    await flush()

    // No cities, districts or civic points exist: only polygon layers.
    click(lastMap(), {'polygon-fill': [{key: 'Jalisco'}]})

    expect(onPress).toHaveBeenCalledTimes(1)
    const queried = lastMap().queries.at(-1)!.layers
    expect(queried).toContain('polygon-fill')
    expect(queried).not.toContain('city-marker-circle')
  })

  it('prefers the marker over the polygon underneath it', async () => {
    const polygonPress = jest.fn()
    const cityPress = jest.fn()
    renderMap(
      <MapLibreWeb
        initialRegion={initialRegion}
        viewMode="standard"
        polygons={[
          {key: 'Jalisco', coordinates: square, onPress: polygonPress},
        ]}
        cityMarkers={[
          {
            name: 'Guadalajara',
            stateName: 'Jalisco',
            coordinate: square[0],
            color: '#f00',
            onPress: cityPress,
          },
        ]}
      />,
    )
    await flush()

    click(lastMap(), {
      'polygon-fill': [{key: 'Jalisco'}],
      'city-marker-circle': [{name: 'Guadalajara'}],
    })

    expect(cityPress).toHaveBeenCalledTimes(1)
    expect(polygonPress).not.toHaveBeenCalled()
  })

  it('selects a district by its boundary', async () => {
    const onPress = jest.fn()
    renderMap(
      <MapLibreWeb
        initialRegion={initialRegion}
        viewMode="standard"
        districtPolygons={[
          {
            districtKey: 'JAL-01',
            boundary: square,
            fillColor: '#00f',
            strokeColor: '#00f',
            strokeWidth: 1,
            onPress,
          },
        ]}
      />,
    )
    await flush()

    click(lastMap(), {'district-fill': [{districtKey: 'JAL-01'}]})
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('calls the latest handlers, not the ones from first render', async () => {
    const first = jest.fn()
    const second = jest.fn()
    const {rerender} = renderMap(
      <MapLibreWeb
        initialRegion={initialRegion}
        viewMode="standard"
        onPress={first}
      />,
    )
    await flush()

    rerender(
      <MapLibreWeb
        initialRegion={initialRegion}
        viewMode="standard"
        onPress={second}
      />,
    )
    click(lastMap())

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('restores the overlays after the basemap changes', async () => {
    const {rerender} = renderMap(
      <MapLibreWeb
        initialRegion={initialRegion}
        viewMode="standard"
        polygons={[{key: 'Jalisco', coordinates: square}]}
      />,
    )
    await flush()
    expect(lastMap().getLayer('polygon-fill')).toBeTruthy()

    rerender(
      <MapLibreWeb
        initialRegion={initialRegion}
        viewMode="satellite"
        polygons={[{key: 'Jalisco', coordinates: square}]}
      />,
    )
    // setStyle wipes custom layers until style.load fires again.
    expect(lastMap().setStyle).toHaveBeenCalledTimes(1)
    expect(lastMap().getLayer('polygon-fill')).toBeFalsy()
    await flush()

    expect(lastMap().getLayer('polygon-fill')).toBeTruthy()
    expect(lastMap().getLayer('raster-layer')).toBeTruthy()
  })

  it('labels a multi-part state once, on its largest piece, by name', async () => {
    const island = [
      {latitude: 10, longitude: 10},
      {latitude: 10, longitude: 10.1},
      {latitude: 10.1, longitude: 10.1},
      {latitude: 10.1, longitude: 10},
    ]
    renderMap(
      <MapLibreWeb
        initialRegion={initialRegion}
        viewMode="standard"
        polygons={[
          {key: 'Sinaloa-4-0', label: 'Sinaloa', coordinates: island},
          {key: 'Sinaloa-4-1', label: 'Sinaloa', coordinates: square},
          {key: 'Sonora-5-0', label: 'Sonora', coordinates: island},
        ]}
      />,
    )
    await flush()

    const source = lastMap().getSource('state-labels') as {
      data: {
        features: Array<{properties: {name: string; label: string}}>
      }
    }
    const labels = source.data.features.map(f => f.properties)
    expect(labels).toHaveLength(2)
    // The display text is the name, never the polygon key.
    expect(labels.map(l => l.label).sort()).toEqual(['Sinaloa', 'Sonora'])
    // Sinaloa is drawn on the larger piece; its key stays the click lookup.
    expect(labels.find(l => l.label === 'Sinaloa')?.name).toBe('Sinaloa-4-1')
  })

  it('does not reload the style on the first render', async () => {
    renderMap(<MapLibreWeb initialRegion={initialRegion} viewMode="standard" />)
    await flush()
    expect(lastMap().setStyle).not.toHaveBeenCalled()
  })

  it('queries a box around the click so small targets are easy to hit', async () => {
    renderMap(
      <MapLibreWeb
        initialRegion={initialRegion}
        viewMode="standard"
        polygons={[{key: 'Jalisco', coordinates: square}]}
      />,
    )
    await flush()

    click(lastMap())
    const geometry = lastMap().queries.at(-1)!.geometry as [
      [number, number],
      [number, number],
    ]
    expect(geometry[0]).toEqual([94, 94])
    expect(geometry[1]).toEqual([106, 106])
  })

  describe('camera', () => {
    it('frames a target outside the area a side panel covers', async () => {
      const ref = createRef<MapLibreWebRef>()
      renderMap(
        <MapLibreWeb
          ref={ref}
          initialRegion={initialRegion}
          viewMode="standard"
        />,
      )
      await flush()

      const padding = {top: 0, right: 0, bottom: 0, left: 400}
      ref.current!.animateCamera({
        center: {latitude: 20, longitude: -100},
        zoom: 6.5,
        padding,
      })

      expect(lastMap().flyTo).toHaveBeenCalledWith(
        expect.objectContaining({zoom: 6.5, padding}),
      )
    })

    it('keeps the current framing when no padding is given', async () => {
      const ref = createRef<MapLibreWebRef>()
      renderMap(
        <MapLibreWeb
          ref={ref}
          initialRegion={initialRegion}
          viewMode="standard"
        />,
      )
      await flush()

      ref.current!.animateCamera({zoom: 8})
      expect(lastMap().flyTo.mock.calls[0][0]).not.toHaveProperty('padding')
    })

    it('resets padding when returning to a region', async () => {
      const ref = createRef<MapLibreWebRef>()
      renderMap(
        <MapLibreWeb
          ref={ref}
          initialRegion={initialRegion}
          viewMode="standard"
        />,
      )
      await flush()

      ref.current!.animateToRegion(initialRegion, 800)
      expect(lastMap().flyTo).toHaveBeenCalledWith(
        expect.objectContaining({
          padding: {top: 0, right: 0, bottom: 0, left: 0},
        }),
      )
    })

    it('fits bounds with at least the base margin plus the panel', async () => {
      const ref = createRef<MapLibreWebRef>()
      renderMap(
        <MapLibreWeb
          ref={ref}
          initialRegion={initialRegion}
          viewMode="standard"
        />,
      )
      await flush()

      ref.current!.fitToCoordinates(square, {
        padding: {top: 0, right: 0, bottom: 300, left: 0},
      })
      expect(lastMap().fitBounds.mock.calls[0][1].padding).toEqual({
        top: 48,
        right: 48,
        bottom: 300,
        left: 48,
      })
    })

    it('reopens where the previous map stopped', async () => {
      const first = renderMap(
        <MapLibreWeb initialRegion={initialRegion} viewMode="standard" />,
      )
      await flush()

      const map = lastMap()
      ;(map as unknown as {zoom: number}).zoom = 7.25
      ;(map as unknown as {center: object}).center = {lng: -99.1, lat: 19.4}
      act(() => map.emit('moveend'))
      first.unmount()

      renderMap(
        <MapLibreWeb initialRegion={initialRegion} viewMode="standard" />,
      )
      await flush()

      expect(lastMap().options.center).toEqual([-99.1, 19.4])
      expect(lastMap().options.zoom).toBe(7.25)
    })
  })
})
