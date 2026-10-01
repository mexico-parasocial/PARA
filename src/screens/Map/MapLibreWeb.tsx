import 'maplibre-gl/dist/maplibre-gl.css'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import {StyleSheet, View} from 'react-native'
import maplibregl from 'maplibre-gl'

import {type MapViewMode} from '#/lib/hooks/useMapProvider'

const DARK_MAP_BG = '#1a1a1a'
const LIGHT_MAP_BG = '#f5f4ef'

function isDark(themeName: string): boolean {
  return themeName === 'dark' || themeName === 'dim'
}

type TileSource = {tiles: string; attribution: string}

/**
 * Basemap imagery for the opt-in views. The standard view deliberately has
 * none: the state, district and city layers are drawn from our own GeoJSON, so
 * it renders on a plain background with no third-party tile requests (and no
 * tile API key). Add a provider here when street-level context is wanted.
 */
function getTileSource(viewMode: MapViewMode): TileSource | null {
  switch (viewMode) {
    case 'standard':
      return null
    case 'satellite':
    case 'hybrid':
      return {
        tiles:
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>',
      }
    case 'terrain':
      return {
        tiles: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution:
          '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA), &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
  }
}

function buildStyle(
  viewMode: MapViewMode,
  themeName: string,
): maplibregl.StyleSpecification {
  const tileSource = getTileSource(viewMode)
  return {
    version: 8,
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    sources: tileSource
      ? {
          'raster-tiles': {
            type: 'raster',
            tiles: [tileSource.tiles],
            tileSize: 256,
            attribution: tileSource.attribution,
          },
        }
      : {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': isDark(themeName) ? DARK_MAP_BG : LIGHT_MAP_BG,
        },
      },
      ...(tileSource
        ? [
            {
              id: 'raster-layer',
              type: 'raster' as const,
              source: 'raster-tiles',
            },
          ]
        : []),
    ],
  }
}

/**
 * Heatmap color ramp for civic activity density.
 * Low-intensity = transparent blue; high-intensity = warm yellow/red.
 */
function getHeatmapColor(
  themeName: string,
): maplibregl.ExpressionSpecification {
  const dark = isDark(themeName)
  return [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0,
    'rgba(0,0,0,0)',
    0.2,
    dark ? 'rgba(30,144,255,0.4)' : 'rgba(0,100,255,0.3)',
    0.4,
    dark ? 'rgba(0,191,255,0.5)' : 'rgba(0,150,255,0.4)',
    0.6,
    dark ? 'rgba(0,255,127,0.6)' : 'rgba(50,200,100,0.5)',
    0.8,
    dark ? 'rgba(255,215,0,0.7)' : 'rgba(255,180,0,0.6)',
    1,
    dark ? 'rgba(255,69,0,0.8)' : 'rgba(255,80,0,0.7)',
  ] as maplibregl.ExpressionSpecification
}

type MapRegion = {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

type Coordinate = {
  latitude: number
  longitude: number
}

export type MapLibreWebRef = {
  animateToRegion: (region: MapRegion, duration?: number) => void
  animateCamera: (camera: {
    center?: Coordinate
    zoom?: number
    altitude?: number
  }) => void
  fitToCoordinates: (
    coordinates: Coordinate[],
    options?: {edgePadding?: unknown; animated?: boolean},
  ) => void
  getCamera: () => Promise<{zoom?: number; altitude?: number}>
}

type CivicPoint = {
  latitude: number
  longitude: number
  weight?: number
  uri?: string
  title?: string
}

type CityMarker = {
  name: string
  stateName: string
  coordinate: Coordinate
  color: string
  selected?: boolean
  onPress?: () => void
}

type DistrictPolygon = {
  districtKey: string
  boundary: Coordinate[]
  fillColor: string
  strokeColor: string
  strokeWidth: number
  onPress?: () => void
}

type DistrictCentroid = {
  districtKey: string
  coordinate: Coordinate
  color: string
  onPress?: () => void
}

type Props = {
  initialRegion: MapRegion
  viewMode: MapViewMode
  themeName?: string
  onRegionChangeComplete?: (region: MapRegion) => void
  onPress?: () => void
  onCivicPointPress?: (uri: string) => void
  polygons?: Array<{
    key: string
    coordinates: Coordinate[]
    fillColor?: string
    strokeColor?: string
    strokeWidth?: number
    onPress?: () => void
  }>
  civicPoints?: CivicPoint[]
  cityMarkers?: CityMarker[]
  districtPolygons?: DistrictPolygon[]
  districtCentroids?: DistrictCentroid[]
}

function deltaToZoom(latDelta: number): number {
  return Math.max(1, Math.min(20, Math.log2(360 / latDelta)))
}

function computeCentroid(coordinates: Coordinate[]): [number, number] | null {
  if (coordinates.length === 0) return null
  let sumLat = 0
  let sumLng = 0
  for (const c of coordinates) {
    sumLat += c.latitude
    sumLng += c.longitude
  }
  return [sumLng / coordinates.length, sumLat / coordinates.length]
}

function zoomToDelta(zoom: number): number {
  return 360 / Math.pow(2, zoom)
}

/**
 * Stacking order, bottom to top. Overlays are re-added whenever their data or
 * the basemap changes, so each layer is inserted below the first existing
 * layer that belongs above it. Without this a re-added polygon layer lands on
 * top of the markers and swallows their clicks.
 */
const LAYER_ORDER = [
  'polygon-fill',
  'polygon-stroke',
  'state-label',
  'district-fill',
  'district-stroke',
  'civic-heatmap',
  'civic-cluster-circle',
  'civic-cluster-count',
  'civic-unclustered-point',
  'district-centroid-circle',
  'city-marker-circle',
  'city-marker-label',
]

// queryRenderedFeatures returns hits top-most first, so LAYER_ORDER alone
// decides which layer wins a click.
const CLICKABLE_LAYERS = [
  'polygon-fill',
  'state-label',
  'district-fill',
  'civic-cluster-circle',
  'civic-unclustered-point',
  'district-centroid-circle',
  'city-marker-circle',
  'city-marker-label',
]

const POINTER_LAYERS = CLICKABLE_LAYERS

function addLayerInOrder(
  map: maplibregl.Map,
  layer: maplibregl.LayerSpecification,
) {
  const above = LAYER_ORDER.slice(LAYER_ORDER.indexOf(layer.id) + 1)
  const beforeId = above.find(id => map.getLayer(id))
  map.addLayer(layer, beforeId)
}

function addPolygonsToMap(
  map: maplibregl.Map,
  polys: NonNullable<Props['polygons']>,
  themeName: string,
) {
  // Clean up old source/layers
  if (map.getLayer('polygon-fill')) {
    map.removeLayer('polygon-fill')
  }
  if (map.getLayer('polygon-stroke')) {
    map.removeLayer('polygon-stroke')
  }
  if (map.getLayer('state-label')) {
    map.removeLayer('state-label')
  }
  if (map.getSource('state-polygons')) {
    map.removeSource('state-polygons')
  }
  if (map.getSource('state-labels')) {
    map.removeSource('state-labels')
  }

  if (polys.length === 0) return

  const polygonFeatures: GeoJSON.Feature[] = []
  const labelFeatures: GeoJSON.Feature[] = []

  for (const poly of polys) {
    const coordinates = poly.coordinates.map(c => [c.longitude, c.latitude])
    if (coordinates.length > 0) {
      coordinates.push(coordinates[0]) // Close the ring
    }

    polygonFeatures.push({
      type: 'Feature',
      properties: {
        key: poly.key,
        fillColor: poly.fillColor || 'rgba(0,100,255,0.2)',
        strokeColor: poly.strokeColor || 'rgba(0,100,255,0.8)',
        strokeWidth: poly.strokeWidth || 1,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates],
      },
    })

    const centroid = computeCentroid(poly.coordinates)
    if (centroid) {
      labelFeatures.push({
        type: 'Feature',
        properties: {
          name: poly.key,
        },
        geometry: {
          type: 'Point',
          coordinates: centroid,
        },
      })
    }
  }

  map.addSource('state-polygons', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: polygonFeatures,
    },
  })

  map.addSource('state-labels', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: labelFeatures,
    },
  })

  addLayerInOrder(map, {
    id: 'polygon-fill',
    type: 'fill',
    source: 'state-polygons',
    paint: {
      'fill-color': ['get', 'fillColor'],
      'fill-opacity': 0.56,
    },
  })

  addLayerInOrder(map, {
    id: 'polygon-stroke',
    type: 'line',
    source: 'state-polygons',
    paint: {
      'line-color': ['get', 'strokeColor'],
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        4,
        ['get', 'strokeWidth'],
        8,
        ['*', ['get', 'strokeWidth'], 1.5],
      ],
      'line-opacity': 0.88,
    },
  })

  addLayerInOrder(map, {
    id: 'state-label',
    type: 'symbol',
    source: 'state-labels',
    minzoom: 4.5,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 13,
      'text-anchor': 'center',
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-padding': 4,
    },
    paint: {
      'text-color': isDark(themeName) ? '#e5e5e5' : '#374151',
      'text-halo-color': isDark(themeName)
        ? 'rgba(0,0,0,0.6)'
        : 'rgba(255,255,255,0.8)',
      'text-halo-width': 1.5,
    },
  })
}

function addDistrictPolygonsToMap(
  map: maplibregl.Map,
  districts: NonNullable<Props['districtPolygons']>,
) {
  for (const layerId of ['district-fill', 'district-stroke']) {
    if (map.getLayer(layerId)) map.removeLayer(layerId)
  }
  if (map.getSource('district-polygons')) map.removeSource('district-polygons')

  if (districts.length === 0) return

  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = districts.map(d => {
    const ring = d.boundary.map(c => [c.longitude, c.latitude])
    const first = ring[0]
    const last = ring[ring.length - 1]
    if (first && (first[0] !== last[0] || first[1] !== last[1])) {
      ring.push(first)
    }
    return {
      type: 'Feature',
      properties: {
        districtKey: d.districtKey,
        fillColor: d.fillColor,
        strokeColor: d.strokeColor,
        strokeWidth: d.strokeWidth,
      },
      geometry: {type: 'Polygon', coordinates: [ring]},
    }
  })

  map.addSource('district-polygons', {
    type: 'geojson',
    data: {type: 'FeatureCollection', features},
  })

  addLayerInOrder(map, {
    id: 'district-fill',
    type: 'fill',
    source: 'district-polygons',
    paint: {'fill-color': ['get', 'fillColor']},
  })

  addLayerInOrder(map, {
    id: 'district-stroke',
    type: 'line',
    source: 'district-polygons',
    paint: {
      'line-color': ['get', 'strokeColor'],
      'line-width': ['get', 'strokeWidth'],
    },
  })
}

function addCivicPointsToMap(
  map: maplibregl.Map,
  points: NonNullable<Props['civicPoints']>,
  currentTheme: string,
) {
  // Clean up old source/layers
  const layers = [
    'civic-cluster-count',
    'civic-heatmap',
    'civic-cluster-circle',
    'civic-unclustered-point',
  ]
  for (const layerId of layers) {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId)
    }
  }
  if (map.getSource('civic-points')) {
    map.removeSource('civic-points')
  }

  if (points.length === 0) return

  const features: GeoJSON.Feature<GeoJSON.Point>[] = points.map(p => ({
    type: 'Feature',
    properties: {
      weight: p.weight ?? 1,
      uri: p.uri,
      title: p.title,
    },
    geometry: {
      type: 'Point',
      coordinates: [p.longitude, p.latitude],
    },
  }))

  map.addSource('civic-points', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features,
    },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
    clusterProperties: {
      // Sum of weights for heatmap intensity
      totalWeight: ['+', ['get', 'weight']],
    },
  })

  // 1. Heatmap layer — shows density of civic activity
  addLayerInOrder(map, {
    id: 'civic-heatmap',
    type: 'heatmap',
    source: 'civic-points',
    maxzoom: 15,
    paint: {
      // Weight each point by its activity weight
      'heatmap-weight': [
        'interpolate',
        ['linear'],
        ['get', 'weight'],
        0,
        0,
        10,
        1,
      ],
      // Intensity ramps up as zoom increases
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
      // Color ramp based on theme
      'heatmap-color': getHeatmapColor(currentTheme),
      // Radius shrinks as we zoom in
      'heatmap-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0,
        40,
        9,
        60,
        15,
        15,
      ],
      // Fade out at high zoom so individual points/clusters show
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.9, 15, 0.4],
    },
  })

  // 2. Cluster circle layer
  addLayerInOrder(map, {
    id: 'civic-cluster-circle',
    type: 'circle',
    source: 'civic-points',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': isDark(currentTheme)
        ? 'rgba(59,130,246,0.85)'
        : 'rgba(37,99,235,0.8)',
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20,
        10,
        25,
        50,
        32,
        100,
        40,
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': isDark(currentTheme)
        ? 'rgba(147,197,253,0.9)'
        : 'rgba(219,234,254,0.9)',
    },
  })

  addLayerInOrder(map, {
    id: 'civic-cluster-count',
    type: 'symbol',
    source: 'civic-points',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Noto Sans Bold'],
      'text-size': 12,
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': '#ffffff',
    },
  })

  // 3. Unclustered individual points
  addLayerInOrder(map, {
    id: 'civic-unclustered-point',
    type: 'circle',
    source: 'civic-points',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': 8,
      'circle-color': isDark(currentTheme)
        ? 'rgba(96,165,250,0.9)'
        : 'rgba(59,130,246,0.85)',
      'circle-stroke-width': 2,
      'circle-stroke-color': isDark(currentTheme)
        ? 'rgba(255,255,255,0.8)'
        : 'rgba(255,255,255,0.9)',
    },
  })
}

function addCityMarkersToMap(
  map: maplibregl.Map,
  markers: NonNullable<Props['cityMarkers']>,
  themeName: string,
) {
  const layers = ['city-marker-circle', 'city-marker-label']
  for (const layerId of layers) {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId)
    }
  }
  if (map.getSource('city-markers')) {
    map.removeSource('city-markers')
  }

  if (markers.length === 0) return

  const features: GeoJSON.Feature<GeoJSON.Point>[] = markers.map(m => ({
    type: 'Feature',
    properties: {
      name: m.name,
      stateName: m.stateName,
      color: m.color,
    },
    geometry: {
      type: 'Point',
      coordinates: [m.coordinate.longitude, m.coordinate.latitude],
    },
  }))

  map.addSource('city-markers', {
    type: 'geojson',
    data: {type: 'FeatureCollection', features},
  })

  addLayerInOrder(map, {
    id: 'city-marker-circle',
    type: 'circle',
    source: 'city-markers',
    paint: {
      'circle-radius': ['case', ['get', 'selected'], 8, 6],
      'circle-color': ['get', 'color'],
      'circle-stroke-width': 2,
      'circle-stroke-color': isDark(themeName)
        ? 'rgba(255,255,255,0.8)'
        : 'rgba(255,255,255,0.9)',
    },
  })

  addLayerInOrder(map, {
    id: 'city-marker-label',
    type: 'symbol',
    source: 'city-markers',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'text-anchor': 'top',
      'text-offset': [0, 0.8],
      'text-allow-overlap': false,
      'text-ignore-placement': false,
    },
    paint: {
      'text-color': isDark(themeName) ? '#e5e5e5' : '#374151',
      'text-halo-color': isDark(themeName)
        ? 'rgba(0,0,0,0.6)'
        : 'rgba(255,255,255,0.8)',
      'text-halo-width': 1.5,
    },
  })
}

function addDistrictCentroidsToMap(
  map: maplibregl.Map,
  centroids: NonNullable<Props['districtCentroids']>,
  themeName: string,
) {
  if (map.getLayer('district-centroid-circle')) {
    map.removeLayer('district-centroid-circle')
  }
  if (map.getSource('district-centroids')) {
    map.removeSource('district-centroids')
  }

  if (centroids.length === 0) return

  const features: GeoJSON.Feature<GeoJSON.Point>[] = centroids.map(c => ({
    type: 'Feature',
    properties: {
      districtKey: c.districtKey,
      color: c.color,
    },
    geometry: {
      type: 'Point',
      coordinates: [c.coordinate.longitude, c.coordinate.latitude],
    },
  }))

  map.addSource('district-centroids', {
    type: 'geojson',
    data: {type: 'FeatureCollection', features},
  })

  addLayerInOrder(map, {
    id: 'district-centroid-circle',
    type: 'circle',
    source: 'district-centroids',
    paint: {
      'circle-radius': 5,
      'circle-color': ['get', 'color'],
      'circle-stroke-width': 1.5,
      'circle-stroke-color': isDark(themeName)
        ? 'rgba(255,255,255,0.8)'
        : 'rgba(255,255,255,0.9)',
    },
  })
}

export const MapLibreWeb = forwardRef<MapLibreWebRef, Props>(
  function MapLibreWeb(
    {
      initialRegion,
      viewMode,
      themeName = 'light',
      onRegionChangeComplete,
      onPress,
      onCivicPointPress,
      polygons,
      civicPoints,
      cityMarkers,
      districtPolygons,
      districtCentroids,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    // Not map.isStyleLoaded(): that is false whenever any source is still
    // fetching tiles, which would drop data updates.
    const styleReadyRef = useRef(false)

    // The map is created once, so its handlers read everything that changes
    // between renders (props and callbacks) through this ref.
    const latest = useRef({
      polygons: polygons || [],
      civicPoints: civicPoints || [],
      cityMarkers: cityMarkers || [],
      districtPolygons: districtPolygons || [],
      districtCentroids: districtCentroids || [],
      themeName,
      onRegionChangeComplete,
      onPress,
      onCivicPointPress,
    })
    latest.current = {
      polygons: polygons || [],
      civicPoints: civicPoints || [],
      cityMarkers: cityMarkers || [],
      districtPolygons: districtPolygons || [],
      districtCentroids: districtCentroids || [],
      themeName,
      onRegionChangeComplete,
      onPress,
      onCivicPointPress,
    }

    const syncOverlays = useCallback((map: maplibregl.Map) => {
      const cur = latest.current
      addPolygonsToMap(map, cur.polygons, cur.themeName)
      addDistrictPolygonsToMap(map, cur.districtPolygons)
      addCivicPointsToMap(map, cur.civicPoints, cur.themeName)
      addDistrictCentroidsToMap(map, cur.districtCentroids, cur.themeName)
      addCityMarkersToMap(map, cur.cityMarkers, cur.themeName)
    }, [])

    // Initialize map
    useEffect(() => {
      if (!containerRef.current || mapRef.current) return

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: buildStyle(viewMode, themeName),
        center: [initialRegion.longitude, initialRegion.latitude],
        zoom: deltaToZoom(initialRegion.latitudeDelta),
        attributionControl: false,
      })

      map.addControl(
        new maplibregl.AttributionControl({compact: true}),
        'bottom-right',
      )

      // Fires for the first style and again after every setStyle(), which
      // wipes all custom sources and layers.
      map.on('style.load', () => {
        styleReadyRef.current = true
        syncOverlays(map)
      })

      map.on('moveend', () => {
        const center = map.getCenter()
        const zoom = map.getZoom()
        const delta = zoomToDelta(zoom)
        latest.current.onRegionChangeComplete?.({
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: delta,
          longitudeDelta: delta * 1.5,
        })
      })

      map.on('click', e => {
        // queryRenderedFeatures returns nothing at all if any requested layer
        // is missing from the style, so only ask for the ones that exist.
        const layers = CLICKABLE_LAYERS.filter(id => map.getLayer(id))
        const features = layers.length
          ? map.queryRenderedFeatures(e.point, {layers})
          : []
        const cur = latest.current

        if (features.length > 0) {
          const feature = features[0]
          const layerId = feature.layer?.id
          const key = feature.properties?.key
          const name = feature.properties?.name
          const districtKey = feature.properties?.districtKey
          const clusterId = feature.properties?.cluster_id

          if (
            (layerId === 'polygon-fill' || layerId === 'state-label') &&
            (key || name)
          ) {
            const lookupKey = key || name
            cur.polygons.find(p => p.key === lookupKey)?.onPress?.()
            return
          }

          if (layerId === 'district-fill' && districtKey) {
            cur.districtPolygons
              .find(d => d.districtKey === districtKey)
              ?.onPress?.()
            return
          }

          if (layerId === 'civic-cluster-circle' && clusterId != null) {
            const source = map.getSource('civic-points') as
              maplibregl.GeoJSONSource | undefined
            source
              ?.getClusterExpansionZoom(clusterId)
              .then(zoom => {
                map.easeTo({
                  center: (feature.geometry as GeoJSON.Point).coordinates as [
                    number,
                    number,
                  ],
                  zoom: zoom + 1,
                  duration: 500,
                })
              })
              .catch(() => {
                // Ignore cluster expansion errors
              })
            return
          }

          if (layerId === 'civic-unclustered-point') {
            const uri = feature.properties?.uri
            if (uri) cur.onCivicPointPress?.(uri)
            return
          }

          if (
            (layerId === 'city-marker-circle' ||
              layerId === 'city-marker-label') &&
            name
          ) {
            cur.cityMarkers.find(c => c.name === name)?.onPress?.()
            return
          }

          if (layerId === 'district-centroid-circle' && districtKey) {
            cur.districtCentroids
              .find(d => d.districtKey === districtKey)
              ?.onPress?.()
            return
          }
        }

        cur.onPress?.()
      })

      // Hover affordances. Layer-scoped listeners survive setStyle().
      const setPolygonHover = (hovered: boolean) => {
        if (map.getLayer('polygon-fill')) {
          map.setPaintProperty(
            'polygon-fill',
            'fill-opacity',
            hovered ? 0.72 : 0.56,
          )
        }
      }
      for (const layerId of POINTER_LAYERS) {
        const isPolygon =
          layerId === 'polygon-fill' || layerId === 'state-label'
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer'
          if (isPolygon) setPolygonHover(true)
        })
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = ''
          if (isPolygon) setPolygonHover(false)
        })
      }

      mapRef.current = map

      const resizeObserver = new ResizeObserver(() => {
        map.resize()
      })
      resizeObserver.observe(containerRef.current)
      window.setTimeout(() => map.resize(), 0)

      return () => {
        resizeObserver.disconnect()
        map.remove()
        mapRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Swap the basemap when viewMode or theme changes. `style.load` re-adds
    // the overlays. The initial style is already set at construction.
    const appliedStyleRef = useRef(`${viewMode}:${themeName}`)
    useEffect(() => {
      const map = mapRef.current
      const styleKey = `${viewMode}:${themeName}`
      if (!map || appliedStyleRef.current === styleKey) return
      appliedStyleRef.current = styleKey
      styleReadyRef.current = false
      map.setStyle(buildStyle(viewMode, themeName))
    }, [viewMode, themeName])

    // Re-sync overlays when their data changes. Before the first style has
    // loaded (or mid-swap) `style.load` does it instead.
    useEffect(() => {
      const map = mapRef.current
      if (!map || !styleReadyRef.current) return
      syncOverlays(map)
    }, [
      polygons,
      civicPoints,
      cityMarkers,
      districtPolygons,
      districtCentroids,
      syncOverlays,
    ])

    useImperativeHandle(ref, () => ({
      animateToRegion(region: MapRegion, duration = 500) {
        mapRef.current?.flyTo({
          center: [region.longitude, region.latitude],
          zoom: deltaToZoom(region.latitudeDelta),
          duration,
        })
      },
      animateCamera(camera) {
        const opts: maplibregl.FlyToOptions = {duration: 500}
        if (camera.center) {
          opts.center = [camera.center.longitude, camera.center.latitude]
        }
        if (camera.zoom != null) {
          opts.zoom = camera.zoom
        }
        mapRef.current?.flyTo(opts)
      },
      fitToCoordinates(coordinates, options) {
        if (coordinates.length === 0) return
        const bounds = new maplibregl.LngLatBounds()
        for (const c of coordinates) {
          bounds.extend([c.longitude, c.latitude])
        }
        mapRef.current?.fitBounds(bounds, {
          padding: 48,
          animate: options?.animated !== false,
          duration: 500,
        })
      },
      async getCamera() {
        const zoom = mapRef.current?.getZoom()
        return {zoom: zoom ?? undefined}
      },
    }))

    return (
      <View style={StyleSheet.absoluteFill}>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            backgroundColor: isDark(themeName) ? DARK_MAP_BG : LIGHT_MAP_BG,
          }}
        />
      </View>
    )
  },
)
