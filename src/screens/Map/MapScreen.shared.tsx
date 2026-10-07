import {
  type ComponentType,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type CabildeoView} from '#/lib/cabildeo-client'
import {
  getDistrictById,
  getDistrictsByState,
} from '#/lib/constants/electoralDistrictsData'
import {
  buildSearchIndex,
  computeCentroid,
  filterSearchIndex,
  getSearchResultKey,
  type SearchResult,
} from '#/lib/constants/mapHelpers'
import {normalizeMexicoStateName} from '#/lib/constants/mexico'
import {getCitiesWithCoordinatesForState} from '#/lib/constants/mexicoCityCoordinates'
import {type CityData, MEXICO_CITY_DATA} from '#/lib/constants/mexicoCityData'
import {IS_WEB} from '#/platform/detection'

// Lazy-load GeoJSON on web to reduce initial bundle size.
// Native uses static require since Metro doesn't support dynamic JSON import.
const MexicoGeoJSONNative = !IS_WEB
  ? require('#/lib/constants/mexicoGeoJSON.json')
  : null
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {POST_FLAIRS} from '#/lib/tags'
import {
  addMapSearchHistoryItem,
  clearMapSearchHistory,
  getMapSearchHistory,
} from '#/state/map'
import {useCabildeosQuery} from '#/state/queries/cabildeo'
import {
  atoms as a,
  useBreakpoints,
  useLayoutBreakpoints,
  useTheme,
  web,
} from '#/alf'
import {Button, ButtonIcon} from '#/components/Button'
import {Filter_Stroke2_Corner0_Rounded as FilterIcon} from '#/components/icons/Filter'
import {Menu_Stroke2_Corner0_Rounded as MenuIcon} from '#/components/icons/Menu'
import {Header, Screen} from '#/components/Layout'
import {BUTTON_VISUAL_ALIGNMENT_OFFSET} from '#/components/Layout/const'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {
  BigCitiesDataOverlay,
  DistrictsDataOverlay,
  type MapLayer,
  MapLayersPanel,
  MapSearchControls,
  SelectedStateOverlay,
} from './MapComponents'
import {MapDiscourseLensContent} from './MapDiscourseLensContent'
import {
  MapSidebarLayers,
  MapSidebarSearch,
  MapSidebarZoneFilters,
} from './MapSidebarContent'

export type Props = NativeStackScreenProps<CommonNavigatorParams, 'Map'>

export const INITIAL_REGION = {
  latitude: 23.6345,
  longitude: -102.5528,
  latitudeDelta: 25,
  longitudeDelta: 25,
}

type Coordinate = {
  latitude: number
  longitude: number
}

export type PolygonData = {
  key: string
  coordinates: Coordinate[]
  fillColor?: string
  strokeColor?: string
  strokeWidth?: number
  zIndex?: number
  onPress?: () => void
}

export type CivicPoint = {
  latitude: number
  longitude: number
  weight?: number
  uri?: string
  title?: string
}

export type MapViewProps = {
  ref?: Ref<MapViewRef>
  style?: unknown
  initialRegion?: MapRegion
  provider?: string | null
  polygonsData?: PolygonData[]
  civicPointsData?: CivicPoint[]
  cityMarkersData?: Array<{
    name: string
    stateName: string
    coordinate: Coordinate
    color: string
    selected?: boolean
    onPress?: () => void
  }>
  districtPolygonsData?: Array<{
    districtKey: string
    boundary: Coordinate[]
    fillColor: string
    strokeColor: string
    strokeWidth: number
    onPress?: () => void
  }>
  districtCentroidsData?: Array<{
    districtKey: string
    coordinate: Coordinate
    color: string
    onPress?: () => void
  }>
  onRegionChangeComplete?: (region: MapRegion) => void
  onPress?: () => void
  onCivicPointPress?: (uri: string) => void
  children?: ReactNode
}

export type MarkerProps = {
  coordinate: Coordinate
  title?: string
  description?: string
  anchor?: {x: number; y: number}
  tappable?: boolean
  tracksViewChanges?: boolean
  zIndex?: number
  onPress?: () => void
  children?: ReactNode
}

export type MarkerClustererProps = {
  region: MapRegion
  children?: ReactNode
}

export type PolygonProps = {
  coordinates: Coordinate[]
  fillColor?: string
  strokeColor?: string
  strokeWidth?: number
  tappable?: boolean
  zIndex?: number
  onPress?: () => void
}

export type MapViewRef = {
  fitToCoordinates?: (
    coordinates: Coordinate[],
    options?: {edgePadding?: unknown; animated?: boolean},
  ) => void
  animateToRegion?: (region: MapRegion, duration?: number) => void
  animateCamera?: (camera: {
    center?: Coordinate
    zoom?: number
    altitude?: number
  }) => void
  getCamera?: () => Promise<{zoom?: number; altitude?: number}>
}

type GeoFeature = {
  geometry?: {
    type?: string
    coordinates?: unknown[]
  }
  properties: {
    state_name?: string
    name?: string
  }
}

type MapScreenImplProps = Props & {
  MapViewComponent?: ComponentType<MapViewProps>
  PolygonComponent?: ComponentType<PolygonProps>
  MarkerComponent?: ComponentType<MarkerProps>
  MarkerClustererComponent?: ComponentType<MarkerClustererProps>
  unavailableMessage?: string
  DesktopLayout?: ComponentType<{
    sidebar: ReactNode
    map: ReactNode
    drawerOpen?: boolean
    onDrawerOpenChange?: (open: boolean) => void
  }>
  /**
   * Narrow-layout sidebar drawer, owned by the platform screen so the toggle
   * can live in the top bar next to the back button.
   */
  drawerOpen?: boolean
  onDrawerOpenChange?: (open: boolean) => void
}

type MapRegion = typeof INITIAL_REGION

type PreparedStateFeature = {
  name: string
  normalizedName: string
  centroid: Coordinate
  coordinates: Coordinate[]
  polygons: Array<{
    key: string
    coordinates: Coordinate[]
  }>
}

type CityMarkerDatum = CityData & {
  stateName: string
  coordinate: Coordinate
}

function featureName(feature: GeoFeature) {
  return feature.properties.state_name || feature.properties.name || 'Unknown'
}

function getFeatureCoordinates(feature: GeoFeature): Coordinate[][] {
  const geometry = feature.geometry
  if (!geometry?.coordinates) return []

  if (geometry.type === 'Polygon') {
    const coordinates = geometry.coordinates as number[][][]
    return [
      (coordinates[0] || []).map((c: number[]) => ({
        longitude: c[0],
        latitude: c[1],
      })),
    ]
  }

  if (geometry.type === 'MultiPolygon') {
    const coordinates = geometry.coordinates as number[][][][]
    return coordinates.map((polygonCoords: number[][][]) =>
      (polygonCoords[0] || []).map((c: number[]) => ({
        longitude: c[0],
        latitude: c[1],
      })),
    )
  }

  return []
}

function getCitiesForState(stateName: string) {
  const match = Object.entries(MEXICO_CITY_DATA).find(
    ([candidate]) =>
      normalizeMexicoStateName(candidate) ===
      normalizeMexicoStateName(stateName),
  )
  return match?.[1] || []
}

function getDiscourseFlairId(label: string): string | null {
  const flair = Object.values(POST_FLAIRS).find(f => f.label === label)
  return flair?.id ?? null
}

function getPartyColor(party: string) {
  switch (party) {
    case 'Morena':
      return '#8B1538'
    case 'PAN':
      return '#003087'
    case 'PRI':
      return '#00923F'
    case 'MC':
      return '#FF6B00'
    case 'PVEM':
      return '#228B22'
    case 'PT':
      return '#FF0000'
    case 'PRD':
      return '#FFD700'
    default:
      return '#666666'
  }
}

function isMapLayer(value: unknown): value is MapLayer {
  return (
    value === 'states' ||
    value === 'districts' ||
    value === 'cities' ||
    value === 'civic'
  )
}

function getRouteLayer(value: unknown): MapLayer {
  return isMapLayer(value) ? value : 'states'
}

function getRouteDistrictId(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function getRouteSelectionKey(
  params:
    | {
        state?: string
        layer?: MapLayer
        districtId?: number | string
        city?: string
      }
    | null
    | undefined,
) {
  if (!params?.state && !params?.city && !params?.districtId) return ''

  const requestedDistrictId = getRouteDistrictId(params.districtId)
  const requestedLayer = params.city
    ? 'cities'
    : requestedDistrictId
      ? 'districts'
      : getRouteLayer(params.layer)

  return [
    params.state || '',
    requestedLayer,
    requestedDistrictId || '',
    params.city || '',
  ].join('|')
}

function getLayerFillColor({
  activeLayer,
  civicHeatOn,
  isSelected,
  selectedDiscourseItem,
  theme,
  civicCount,
  maxCivicCount,
}: {
  activeLayer: MapLayer
  civicHeatOn: boolean
  isSelected: boolean
  selectedDiscourseItem: string
  theme: ReturnType<typeof useTheme>
  civicCount?: number
  maxCivicCount?: number
}) {
  const hasDiscourseFilter =
    selectedDiscourseItem && selectedDiscourseItem !== 'Any'

  if (hasDiscourseFilter && maxCivicCount && maxCivicCount > 0) {
    const density = (civicCount || 0) / maxCivicCount
    const alpha = Math.round(20 + density * 100)
      .toString(16)
      .padStart(2, '0')
    return `#FF5A36${alpha}`
  }

  if (civicHeatOn && maxCivicCount && maxCivicCount > 0) {
    const density = (civicCount || 0) / maxCivicCount
    const alpha = Math.round(20 + density * 100)
      .toString(16)
      .padStart(2, '0')
    return `${theme.palette.primary_500}${alpha}`
  }

  if (isSelected) {
    return `${theme.palette.primary_500}7A`
  }

  if (activeLayer === 'districts') {
    return `${theme.palette.primary_500}24`
  }

  if (activeLayer === 'cities') {
    return `${theme.palette.primary_500}20`
  }

  return `${theme.palette.primary_500}3A`
}

/**
 * Check if any coordinate of a polygon falls within the current map viewport.
 * Used for viewport culling on native to avoid rendering off-screen polygons.
 */
function isPolygonInViewport(
  coordinates: Coordinate[],
  region: MapRegion,
): boolean {
  const minLat = region.latitude - region.latitudeDelta / 2
  const maxLat = region.latitude + region.latitudeDelta / 2
  const minLng = region.longitude - region.longitudeDelta / 2
  const maxLng = region.longitude + region.longitudeDelta / 2

  return coordinates.some(
    c =>
      c.latitude >= minLat &&
      c.latitude <= maxLat &&
      c.longitude >= minLng &&
      c.longitude <= maxLng,
  )
}

function MapUnavailable({message}: {message: string}) {
  const t = useTheme()

  return (
    <View
      style={[
        a.flex_1,
        a.align_center,
        a.justify_center,
        a.px_xl,
        t.atoms.bg_contrast_25,
      ]}>
      <View
        style={[
          a.w_full,
          a.p_lg,
          a.rounded_xl,
          a.border,
          t.atoms.border_contrast_low,
          t.atoms.bg,
          {maxWidth: 520},
        ]}>
        <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
          MAP UNAVAILABLE
        </Text>
        <Text style={[a.text_2xl, a.font_bold, t.atoms.text, a.mt_sm]}>
          <Trans>The native map binary is not available in this build.</Trans>
        </Text>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_md]}>
          {message}
        </Text>
      </View>
    </View>
  )
}

export function MapScreenImpl({
  route,
  navigation,
  MapViewComponent,
  PolygonComponent,
  MarkerComponent,
  MarkerClustererComponent,
  unavailableMessage,
  DesktopLayout,
  drawerOpen,
  onDrawerOpenChange,
}: MapScreenImplProps) {
  const {_: translate} = useLingui()
  const t = useTheme()
  const {gtMobile} = useBreakpoints()
  const {rightNavVisible} = useLayoutBreakpoints()
  const insets = useSafeAreaInsets()
  const mapRef = useRef<MapViewRef | null>(null)
  const lastAppliedRouteSelection = useRef('')
  const {data: cabildeos} = useCabildeosQuery()
  const lastTapRef = useRef<number>(0)

  const [selectedState, setSelectedState] = useState<{name: string} | null>(
    null,
  )
  const [showCities, setShowCities] = useState(false)
  const [showDistricts, setShowDistricts] = useState(false)
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(
    null,
  )
  const [selectedCityName, setSelectedCityName] = useState<string | null>(null)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeLayer, setActiveLayer] = useState<MapLayer>('states')
  // Civic heat is an overlay that stays on across States/Districts/Cities.
  const [civicHeatOn, setCivicHeatOn] = useState(false)
  const [showDiscourseModal, setShowDiscourseModal] = useState(false)
  const [discourseType, setDiscourseType] = useState<'Matter' | 'Policy'>(
    'Matter',
  )
  const [selectedDiscourseItem, setSelectedDiscourseItem] = useState('')

  const filteredCabildeos = useMemo(() => {
    if (!selectedDiscourseItem || selectedDiscourseItem === 'Any') {
      return cabildeos || []
    }
    const flairId = getDiscourseFlairId(selectedDiscourseItem)
    if (!flairId) return cabildeos || []
    return (cabildeos || []).filter(c => c.flairs?.includes(flairId))
  }, [cabildeos, selectedDiscourseItem])
  const [mapRegion, setMapRegion] = useState<MapRegion>(INITIAL_REGION)
  const [recentSearchResults, setRecentSearchResults] = useState<
    SearchResult[]
  >(() => getMapSearchHistory())
  const [mexicoGeoJSON, setMexicoGeoJSON] =
    useState<unknown>(MexicoGeoJSONNative)

  useEffect(() => {
    if (IS_WEB && !mexicoGeoJSON) {
      import('#/lib/constants/mexicoGeoJSON.json').then(m => {
        setMexicoGeoJSON(m.default)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const geoFeatures = useMemo(
    () => (mexicoGeoJSON as {features: GeoFeature[]} | null)?.features || [],
    [mexicoGeoJSON],
  )

  const preparedStateFeatures = useMemo<PreparedStateFeature[]>(
    () =>
      geoFeatures.map((feature, index) => {
        const name = featureName(feature)
        const polygons = getFeatureCoordinates(feature).map(
          (coordinates, polygonIndex) => ({
            key: `${name}-${index}-${polygonIndex}`,
            coordinates,
          }),
        )

        return {
          name,
          normalizedName: normalizeMexicoStateName(name),
          centroid: computeCentroid(feature),
          coordinates: polygons.flatMap(polygon => polygon.coordinates),
          polygons,
        }
      }),
    [geoFeatures],
  )

  const searchIndex = useMemo(
    () => buildSearchIndex(geoFeatures),
    [geoFeatures],
  )
  const searchResults = useMemo(
    () => filterSearchIndex(searchIndex, searchQuery, 10),
    [searchIndex, searchQuery],
  )

  const stateFeaturesByName = useMemo(() => {
    const map = new Map<string, PreparedStateFeature>()

    for (const feature of preparedStateFeatures) {
      map.set(feature.normalizedName, feature)
    }

    return map
  }, [preparedStateFeatures])

  const selectedStateCities = useMemo<CityMarkerDatum[]>(() => {
    if (!selectedState) return []

    return getCitiesWithCoordinatesForState(
      selectedState.name,
      getCitiesForState(selectedState.name),
    ).map(city => ({
      ...city,
      stateName: selectedState.name,
    }))
  }, [selectedState])

  // Browsing a state's city list does not add pins. Only the city the viewer
  // chooses is shown, using the same selection for native and web providers.
  const visibleCityMarkers = useMemo(() => {
    if (activeLayer !== 'cities' || !showCities || !selectedCityName) return []
    return selectedStateCities.filter(city => city.name === selectedCityName)
  }, [activeLayer, selectedCityName, selectedStateCities, showCities])

  const setMapRouteParams = useCallback(
    (params: {
      state?: string
      layer?: MapLayer
      districtId?: number
      city?: string
    }) => {
      lastAppliedRouteSelection.current = getRouteSelectionKey(params)
      navigation.setParams({
        state: params.state,
        layer: params.layer,
        districtId: params.districtId,
        city: params.city,
      })
    },
    [navigation],
  )

  const clearMapSelection = useCallback(
    (options: {resetLayer?: boolean; resetSearch?: boolean} = {}) => {
      setSelectedState(null)
      setShowCities(false)
      setShowDistricts(false)
      setSelectedDistrictId(null)
      setSelectedCityName(null)

      if (options.resetLayer) {
        setActiveLayer('states')
      }

      if (options.resetSearch) {
        setSearchQuery('')
        setSearchExpanded(false)
        clearMapSearchHistory()
        setRecentSearchResults([])
      }

      setMapRouteParams({})
    },
    [setMapRouteParams],
  )

  const rememberSearchResult = useCallback((result: SearchResult) => {
    setRecentSearchResults(current => {
      const key = getSearchResultKey(result)
      const next = [
        result,
        ...current.filter(item => getSearchResultKey(item) !== key),
      ].slice(0, 5)
      return next
    })
    addMapSearchHistoryItem(result)
  }, [])

  const focusCity = useCallback(
    (
      stateName: string,
      cityName: string,
      options: {syncRoute?: boolean} = {},
    ) => {
      const cities = getCitiesWithCoordinatesForState(
        stateName,
        getCitiesForState(stateName),
      )
      const city = cities.find(item => item.name === cityName)
      const preparedState = stateFeaturesByName.get(
        normalizeMexicoStateName(stateName),
      )

      setSelectedState({name: preparedState?.name || stateName})
      setActiveLayer('cities')
      setShowCities(true)
      setShowDistricts(false)
      setSelectedDistrictId(null)
      setSelectedCityName(cityName)

      if (options.syncRoute !== false) {
        setMapRouteParams({
          state: preparedState?.name || stateName,
          layer: 'cities',
          city: cityName,
        })
      }

      if (!city) {
        if (preparedState?.coordinates.length) {
          mapRef.current?.fitToCoordinates?.(preparedState.coordinates, {
            edgePadding: {top: 48, right: 48, bottom: 48, left: 48},
            animated: true,
          })
        }
        return
      }

      const region = {
        latitude: city.coordinate.latitude,
        longitude: city.coordinate.longitude,
        latitudeDelta: 1.2,
        longitudeDelta: 1.2,
      }

      mapRef.current?.animateToRegion?.(region, 500)
      mapRef.current?.animateCamera?.({
        center: city.coordinate,
        zoom: 9.5,
      })
    },
    [setMapRouteParams, stateFeaturesByName],
  )

  const focusState = useCallback(
    (
      stateName: string,
      options: {
        openLayer?: MapLayer
        districtId?: number | null
        syncRoute?: boolean
      } = {},
    ) => {
      const feature = stateFeaturesByName.get(
        normalizeMexicoStateName(stateName),
      )
      const nextLayer = options.openLayer ?? activeLayer

      setSelectedState({name: feature?.name || stateName})
      setShowCities(nextLayer === 'cities')
      setShowDistricts(nextLayer === 'districts')
      setSelectedDistrictId(
        nextLayer === 'districts' ? (options.districtId ?? null) : null,
      )
      setSelectedCityName(null)

      if (options.syncRoute !== false) {
        setMapRouteParams({
          state: feature?.name || stateName,
          layer: nextLayer,
          districtId:
            nextLayer === 'districts'
              ? (options.districtId ?? undefined)
              : undefined,
        })
      }

      if (!feature) return

      if (feature.coordinates.length) {
        mapRef.current?.fitToCoordinates?.(feature.coordinates, {
          edgePadding: {top: 48, right: 48, bottom: 48, left: 48},
          animated: true,
        })
      }

      mapRef.current?.animateCamera?.({
        center: feature.centroid,
        zoom: nextLayer === 'cities' ? 8 : 6.5,
      })
    },
    [activeLayer, setMapRouteParams, stateFeaturesByName],
  )

  useEffect(() => {
    const params = route.params
    const routeSelectionKey = getRouteSelectionKey(params)

    if (!routeSelectionKey) {
      if (lastAppliedRouteSelection.current) {
        lastAppliedRouteSelection.current = ''
        setSelectedState(null)
        setShowCities(false)
        setShowDistricts(false)
        setSelectedDistrictId(null)
        setSelectedCityName(null)
        setActiveLayer('states')
      }
      return
    }
    if (!params) return

    const requestedDistrictId = getRouteDistrictId(params.districtId)
    const routeLayer = getRouteLayer(params.layer)
    // `layer=civic` links predate the heat toggle; they now turn the heat on.
    if (routeLayer === 'civic') setCivicHeatOn(true)
    const requestedLayer = params.city
      ? 'cities'
      : requestedDistrictId
        ? 'districts'
        : routeLayer === 'civic'
          ? 'states'
          : routeLayer

    if (lastAppliedRouteSelection.current === routeSelectionKey) return
    lastAppliedRouteSelection.current = routeSelectionKey

    const district = requestedDistrictId
      ? getDistrictById(requestedDistrictId)
      : undefined
    const requestedState = params.state || district?.stateName

    if (params.city && requestedState) {
      focusCity(requestedState, params.city, {syncRoute: false})
      return
    }

    if (requestedState) {
      focusState(requestedState, {
        openLayer: requestedLayer,
        districtId: requestedDistrictId,
        syncRoute: false,
      })
    }
  }, [focusCity, focusState, route.params])

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (!mapRef.current?.getCamera) return

    mapRef.current
      .getCamera()
      .then((camera: {zoom?: number; altitude?: number}) => {
        if (typeof camera?.zoom === 'number') {
          mapRef.current?.animateCamera?.({
            zoom: direction === 'in' ? camera.zoom + 1 : camera.zoom - 1,
          })
          return
        }

        if (typeof camera?.altitude === 'number') {
          mapRef.current?.animateCamera?.({
            altitude:
              direction === 'in'
                ? camera.altitude * 0.6
                : camera.altitude * 1.6,
          })
        }
      })
      .catch(() => {})
  }, [])

  const handleRecenter = useCallback(() => {
    mapRef.current?.animateToRegion?.(INITIAL_REGION, 800)
    clearMapSelection({resetLayer: true, resetSearch: true})
    setMapRegion(INITIAL_REGION)
  }, [clearMapSelection])

  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      rememberSearchResult(result)

      if (result.type === 'district') {
        setActiveLayer('districts')
        focusState(result.stateName, {
          openLayer: 'districts',
          districtId: result.districtId || null,
        })
      } else if (result.type === 'city') {
        focusCity(result.stateName, result.name)
      } else {
        focusState(result.stateName, {openLayer: activeLayer})
      }

      setSearchExpanded(false)
      setSearchQuery('')
    },
    [activeLayer, focusCity, focusState, rememberSearchResult],
  )

  const handleSelectDistrict = useCallback(
    (districtId: number) => {
      setSelectedDistrictId(districtId)

      if (selectedState) {
        setMapRouteParams({
          state: selectedState.name,
          layer: 'districts',
          districtId,
        })
      }
    },
    [selectedState, setMapRouteParams],
  )

  const handleSelectLayer = useCallback(
    (layer: MapLayer) => {
      setActiveLayer(layer)
      if (selectedState) {
        setShowDistricts(layer === 'districts')
        setShowCities(layer === 'cities')
        setMapRouteParams({
          state: selectedState.name,
          layer,
          districtId:
            layer === 'districts'
              ? (selectedDistrictId ?? undefined)
              : undefined,
          city:
            layer === 'cities' ? (selectedCityName ?? undefined) : undefined,
        })
      } else {
        setShowDistricts(false)
        setShowCities(false)
        setMapRouteParams({})
      }
      if (layer !== 'districts') {
        setSelectedDistrictId(null)
      }
      if (layer !== 'cities') {
        setSelectedCityName(null)
      }
    },
    [selectedCityName, selectedDistrictId, selectedState, setMapRouteParams],
  )

  const {cabildeosPerState, maxCivicCount} = useMemo(() => {
    const counts = new Map<string, number>()
    let max = 0
    for (const c of filteredCabildeos) {
      if (!c.region) continue
      const normalized = normalizeMexicoStateName(c.region)
      const count = (counts.get(normalized) || 0) + 1
      counts.set(normalized, count)
      if (count > max) max = count
    }
    return {cabildeosPerState: counts, maxCivicCount: max}
  }, [filteredCabildeos])

  const polygonsData = useMemo<MapViewProps['polygonsData']>(() => {
    return preparedStateFeatures.flatMap(feature => {
      const isSelected = selectedState?.name === feature.name
      const normalizedName = normalizeMexicoStateName(feature.name)
      const civicCount = cabildeosPerState.get(normalizedName)
      const fillColor = getLayerFillColor({
        activeLayer,
        civicHeatOn,
        isSelected,
        selectedDiscourseItem,
        theme: t,
        civicCount,
        maxCivicCount,
      })
      const strokeColor = isSelected
        ? t.palette.primary_500
        : `${t.palette.primary_500}CC`
      const strokeWidth = isSelected
        ? 1.6
        : activeLayer === 'states'
          ? 0.8
          : 0.6

      return feature.polygons.map(polygon => ({
        key: polygon.key,
        coordinates: polygon.coordinates,
        fillColor,
        strokeColor,
        strokeWidth,
        zIndex: isSelected ? 12 : 1,
        onPress: () => {
          lastTapRef.current = Date.now()
          focusState(feature.name, {openLayer: activeLayer})
        },
      }))
    })
  }, [
    activeLayer,
    civicHeatOn,
    cabildeosPerState,
    focusState,
    maxCivicCount,
    preparedStateFeatures,
    selectedDiscourseItem,
    selectedState?.name,
    t,
  ])

  const renderedPolygons = useMemo(() => {
    if (!PolygonComponent) return null

    return polygonsData?.map(polygon => (
      <PolygonComponent
        key={polygon.key}
        coordinates={polygon.coordinates}
        fillColor={polygon.fillColor}
        strokeColor={polygon.strokeColor}
        strokeWidth={polygon.strokeWidth}
        zIndex={polygon.zIndex}
        tappable={!!polygon.onPress}
        onPress={polygon.onPress}
      />
    ))
  }, [PolygonComponent, polygonsData])

  const renderedDistrictPolygons = useMemo(() => {
    if (!PolygonComponent || activeLayer !== 'districts' || !selectedState) {
      return null
    }

    const districts = getDistrictsByState(selectedState.name)
    return districts
      .filter(d => {
        if (!d.boundary || d.boundary.length < 4) return false
        // On native, only render polygons whose bounding box intersects
        // the current viewport. This cuts GPU load from 300+ polygons
        // down to ~20-40 visible ones.
        if (!IS_WEB && !isPolygonInViewport(d.boundary, mapRegion)) {
          return false
        }
        return true
      })
      .map(d => {
        const isSelected = selectedDistrictId === d.id
        return (
          <PolygonComponent
            key={`district:${d.districtKey}`}
            coordinates={d.boundary!}
            fillColor={`${d.accent}${isSelected ? '60' : '30'}`}
            strokeColor={d.accent}
            strokeWidth={isSelected ? 1.5 : 0.8}
            zIndex={isSelected ? 11 : 2}
            tappable={true}
            onPress={() => {
              lastTapRef.current = Date.now()
              setSelectedDistrictId(d.id)
              if (!showDistricts) {
                setShowDistricts(true)
                setActiveLayer('districts')
              }
              if (d.boundary && d.boundary.length > 0) {
                mapRef.current?.fitToCoordinates?.(d.boundary, {
                  edgePadding: {top: 60, right: 60, bottom: 60, left: 60},
                  animated: true,
                })
              }
            }}
          />
        )
      })
  }, [
    PolygonComponent,
    activeLayer,
    mapRegion,
    selectedDistrictId,
    selectedState,
  ])

  const rawCityMarkers = useMemo(() => {
    if (!MarkerComponent || !showCities || !selectedState) return []

    return visibleCityMarkers.map(city => {
      const partyColor = getPartyColor(city.dominantParty)
      const isSelected = selectedCityName === city.name

      return (
        <MarkerComponent
          key={`${city.stateName}:${city.name}`}
          coordinate={city.coordinate}
          title={city.name}
          description={`${city.population} · ${city.dominantParty}`}
          anchor={{x: 0.5, y: 0.5}}
          tappable
          tracksViewChanges={false}
          zIndex={isSelected ? 20 : 14}
          onPress={() => {
            lastTapRef.current = Date.now()
            setSelectedCityName(city.name)
            focusCity(city.stateName, city.name)
          }}>
          <View style={styles.cityMarkerWrap}>
            <View
              style={[
                styles.cityMarkerDot,
                {
                  backgroundColor: partyColor,
                  transform: [{scale: isSelected ? 1.18 : 1}],
                },
              ]}
            />
            <View
              style={[
                styles.cityMarkerLabel,
                t.atoms.bg,
                a.border,
                t.atoms.border_contrast_low,
              ]}>
              <Text style={[a.text_2xs, a.font_bold, t.atoms.text]}>
                {city.name}
              </Text>
            </View>
          </View>
        </MarkerComponent>
      )
    })
  }, [
    MarkerComponent,
    focusCity,
    selectedCityName,
    selectedState,
    visibleCityMarkers,
    showCities,
    t,
  ])

  const renderedCityMarkers = useMemo(() => {
    if (rawCityMarkers.length === 0) return null

    if (MarkerClustererComponent && rawCityMarkers.length > 8) {
      return (
        <MarkerClustererComponent region={mapRegion}>
          {rawCityMarkers}
        </MarkerClustererComponent>
      )
    }

    return rawCityMarkers
  }, [MarkerClustererComponent, mapRegion, rawCityMarkers])

  /**
   * District centroid markers act as tap proxies. Each district gets a
   * small visible dot at its centroid so users can tap it even when the
   * polygon fill is subtle or partially off-screen.
   */
  const renderedDistrictCentroidMarkers = useMemo(() => {
    if (!MarkerComponent || activeLayer !== 'districts' || !selectedState) {
      return null
    }

    const districts = getDistrictsByState(selectedState.name)
    return districts
      .filter(d => d.centroid)
      .map(d => {
        const isSelected = selectedDistrictId === d.id

        return (
          <MarkerComponent
            key={`centroid:district:${d.districtKey}`}
            coordinate={d.centroid!}
            anchor={{x: 0.5, y: 0.5}}
            tappable
            tracksViewChanges={false}
            zIndex={isSelected ? 14 : 3}
            onPress={() => {
              lastTapRef.current = Date.now()
              setSelectedDistrictId(d.id)
              setMapRouteParams({
                state: selectedState.name,
                layer: 'districts',
                districtId: d.id,
              })
            }}>
            <View
              style={[
                styles.districtCentroidMarker,
                {
                  backgroundColor: `${d.accent}${isSelected ? 'CC' : '80'}`,
                },
                isSelected && styles.districtCentroidMarkerSelected,
              ]}
            />
          </MarkerComponent>
        )
      })
  }, [
    MarkerComponent,
    activeLayer,
    selectedDistrictId,
    selectedState,
    setMapRouteParams,
  ])

  const civicPointCount = useMemo(
    () => filteredCabildeos.filter(c => !!c.geo).length,
    [filteredCabildeos],
  )
  const toggleCivicHeat = useCallback(() => setCivicHeatOn(on => !on), [])

  // Raw civic point data for native MapLibre heatmap + clustering (web only)
  const civicPointsData = useMemo(() => {
    if (!civicHeatOn) return []
    return filteredCabildeos
      .filter(
        (c): c is CabildeoView & {geo: {latE7: number; lngE7: number}} =>
          !!c.geo,
      )
      .map(c => ({
        latitude: c.geo.latE7 / 1e7,
        longitude: c.geo.lngE7 / 1e7,
        weight: 1,
        uri: c.uri,
        title: c.title,
      }))
  }, [civicHeatOn, filteredCabildeos])

  const civicMarkers = useMemo(() => {
    if (!MarkerComponent || !civicHeatOn) return []

    return civicPointsData.map(cabildeo => {
      const cab = filteredCabildeos.find(c => c.uri === cabildeo.uri)
      return (
        <MarkerComponent
          key={`civic:${cabildeo.uri}`}
          coordinate={{
            latitude: cabildeo.latitude,
            longitude: cabildeo.longitude,
          }}
          title={cabildeo.title}
          anchor={{x: 0.5, y: 0.5}}
          tappable
          tracksViewChanges={false}
          zIndex={15}
          onPress={() => {
            lastTapRef.current = Date.now()
            navigation.navigate('CabildeoDetail', {
              cabildeoUri: cabildeo.uri,
            })
          }}>
          <View style={styles.civicMarkerWrap}>
            <View
              style={[
                styles.civicMarkerDot,
                {backgroundColor: t.palette.primary_500},
              ]}
            />
            {cab && (
              <View
                style={[
                  a.absolute,
                  a.px_xs,
                  a.py_2xs,
                  a.rounded_xs,
                  t.atoms.bg,
                  a.border,
                  t.atoms.border_contrast_low,
                  {bottom: 18, minWidth: 120, maxWidth: 180},
                ]}>
                <Text
                  style={[a.text_2xs, a.font_bold, t.atoms.text]}
                  numberOfLines={1}>
                  {cab.title}
                </Text>
                <Text
                  style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_xs]}>
                  {cab.phase} · {cab.voteTotals.total} votes
                </Text>
              </View>
            )}
          </View>
        </MarkerComponent>
      )
    })
  }, [
    MarkerComponent,
    civicHeatOn,
    civicPointsData,
    filteredCabildeos,
    navigation,
    t,
  ])

  // Data arrays for MapLibre imperative rendering (web)
  const cityMarkersData = useMemo(() => {
    if (!showCities || !selectedState) return []
    return visibleCityMarkers.map(city => ({
      name: city.name,
      stateName: city.stateName,
      coordinate: city.coordinate,
      color: getPartyColor(city.dominantParty),
      selected: selectedCityName === city.name,
      onPress: () => {
        setSelectedCityName(city.name)
        focusCity(city.stateName, city.name)
      },
    }))
  }, [
    showCities,
    selectedState,
    visibleCityMarkers,
    selectedCityName,
    focusCity,
  ])

  const districtPolygonsData = useMemo(() => {
    if (activeLayer !== 'districts' || !selectedState) return []
    return getDistrictsByState(selectedState.name)
      .filter(d => d.boundary && d.boundary.length >= 4)
      .map(d => {
        const isSelected = selectedDistrictId === d.id
        return {
          districtKey: d.districtKey,
          boundary: d.boundary!,
          fillColor: `${d.accent}${isSelected ? '60' : '30'}`,
          strokeColor: d.accent,
          strokeWidth: isSelected ? 1.5 : 0.8,
          onPress: () => {
            setSelectedDistrictId(d.id)
            setMapRouteParams({
              state: selectedState.name,
              layer: 'districts',
              districtId: d.id,
            })
          },
        }
      })
  }, [activeLayer, selectedDistrictId, selectedState, setMapRouteParams])

  const districtCentroidsData = useMemo(() => {
    if (activeLayer !== 'districts' || !selectedState) return []
    return getDistrictsByState(selectedState.name)
      .filter(d => d.centroid)
      .map(d => {
        const isSelected = selectedDistrictId === d.id
        return {
          districtKey: d.districtKey,
          coordinate: d.centroid!,
          color: `${d.accent}${isSelected ? 'CC' : '80'}`,
          onPress: () => {
            setSelectedDistrictId(d.id)
            setMapRouteParams({
              state: selectedState.name,
              layer: 'districts',
              districtId: d.id,
            })
          },
        }
      })
  }, [activeLayer, selectedDistrictId, selectedState, setMapRouteParams])

  const hasSplitPane = !!DesktopLayout
  const isDesktopSplitPane = !!hasSplitPane && rightNavVisible

  const mapViewElement =
    MapViewComponent && PolygonComponent ? (
      <MapViewComponent
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        provider={web('google')}
        polygonsData={polygonsData}
        civicPointsData={civicPointsData}
        cityMarkersData={cityMarkersData}
        districtPolygonsData={districtPolygonsData}
        districtCentroidsData={districtCentroidsData}
        onRegionChangeComplete={(region: MapRegion) => {
          if (
            region &&
            Number.isFinite(region.latitude) &&
            Number.isFinite(region.longitude) &&
            Number.isFinite(region.latitudeDelta) &&
            Number.isFinite(region.longitudeDelta)
          ) {
            setMapRegion(region)
          }
        }}
        onPress={() => {
          if (Date.now() - lastTapRef.current < 200) {
            return
          }
          clearMapSelection()
        }}
        onCivicPointPress={(uri: string) => {
          navigation.navigate('CabildeoDetail', {
            cabildeoUri: uri,
          })
        }}>
        {renderedPolygons}
        {renderedDistrictPolygons}
        {renderedDistrictCentroidMarkers}
        {renderedCityMarkers}
        {civicMarkers}
      </MapViewComponent>
    ) : (
      <MapUnavailable
        message={
          unavailableMessage || 'Map support is missing from the current build.'
        }
      />
    )

  // The mobile bottom overlays (state summary, cities, districts) occupy the
  // same corner as the zoom cluster; hide the cluster while one is open —
  // pinch still zooms. On the wide web layout the sheets sit bottom-left, clear
  // of the cluster, so only full-width (phone) sheets need this.
  const bottomOverlayOpen =
    (!hasSplitPane || !gtMobile) &&
    ((!!selectedState &&
      activeLayer === 'states' &&
      !showCities &&
      !showDistricts) ||
      showCities ||
      showDistricts)

  const floatingControls = (
    <>
      {MapViewComponent &&
        (!gtMobile || hasSplitPane) &&
        !bottomOverlayOpen && (
          <View
            style={[
              a.absolute,
              {right: 20, bottom: 60 + insets.bottom},
              a.gap_md,
              {zIndex: 20},
            ]}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => handleZoom('in')}
              style={styles.floatingButton(t)}>
              <Text style={[a.text_2xl, a.font_bold, t.atoms.text]}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => handleZoom('out')}
              style={styles.floatingButton(t)}>
              <Text style={[a.text_2xl, a.font_bold, t.atoms.text]}>-</Text>
            </TouchableOpacity>
          </View>
        )}

      <View style={[a.absolute, {right: 20, top: 20}, a.gap_sm, {zIndex: 20}]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={translate(msg`Reset map view`)}
          accessibilityHint={translate(
            msg`Clears the selected place and returns to the full Mexico map.`,
          )}
          onPress={handleRecenter}
          style={styles.floatingButton(t)}>
          <Text style={[a.text_md, a.font_bold, t.atoms.text]}>⌖</Text>
        </TouchableOpacity>

        {!gtMobile && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={translate(msg`Filter map discourse`)}
            accessibilityHint={translate(
              msg`Opens filters for the map heat layer.`,
            )}
            onPress={() => setShowDiscourseModal(true)}
            style={[
              styles.floatingButton(t),
              selectedDiscourseItem && selectedDiscourseItem !== 'Any'
                ? {borderColor: '#FF5A36'}
                : null,
            ]}>
            <FilterIcon
              width={20}
              height={20}
              fill={
                selectedDiscourseItem && selectedDiscourseItem !== 'Any'
                  ? '#FF5A36'
                  : t.atoms.text.color
              }
            />
          </TouchableOpacity>
        )}
      </View>

      {!searchExpanded &&
        selectedDiscourseItem &&
        selectedDiscourseItem !== 'Any' && (
          <View
            style={[
              a.absolute,
              {top: 20, right: 76},
              a.p_md,
              a.rounded_full,
              t.atoms.bg_contrast_25,
              web({backdropFilter: 'blur(12px)'}),
              a.border,
              {borderColor: '#FF5A36'},
              a.shadow_sm,
              a.flex_row,
              a.align_center,
              a.gap_sm,
              {maxWidth: gtMobile ? 240 : 180},
              {zIndex: 20},
            ]}>
            <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
              Heatmap: {selectedDiscourseItem}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setSelectedDiscourseItem('')}>
              <Text
                style={[a.text_md, a.font_bold, t.atoms.text_contrast_medium]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>
        )}
    </>
  )

  const mobileOverlays = (
    <>
      <SelectedStateOverlay
        selectedState={selectedState}
        visible={
          !!selectedState &&
          activeLayer === 'states' &&
          !showCities &&
          !showDistricts
        }
        insets={insets}
        onClose={() => {
          clearMapSelection()
        }}
        onShowCities={() => {
          setActiveLayer('cities')
          setShowCities(true)
          setShowDistricts(false)
          setSelectedDistrictId(null)
          setSelectedCityName(null)
          if (selectedState) {
            setMapRouteParams({state: selectedState.name, layer: 'cities'})
          }
        }}
        onShowDistricts={() => {
          setActiveLayer('districts')
          setShowDistricts(true)
          setShowCities(false)
          setSelectedDistrictId(null)
          setSelectedCityName(null)
          if (selectedState) {
            setMapRouteParams({
              state: selectedState.name,
              layer: 'districts',
            })
          }
        }}
      />

      <BigCitiesDataOverlay
        selectedState={selectedState}
        showCities={showCities}
        selectedCityName={selectedCityName}
        onSelectCity={cityName => {
          if (selectedState) focusCity(selectedState.name, cityName)
        }}
        onClose={() => {
          setActiveLayer('states')
          setShowCities(false)
          setSelectedCityName(null)
          if (selectedState) {
            setMapRouteParams({state: selectedState.name, layer: 'states'})
          }
        }}
      />

      <DistrictsDataOverlay
        selectedState={selectedState}
        showDistricts={showDistricts}
        selectedDistrictId={selectedDistrictId}
        onSelectDistrict={handleSelectDistrict}
        onClose={() => {
          setActiveLayer('states')
          setShowDistricts(false)
          setSelectedDistrictId(null)
          if (selectedState) {
            setMapRouteParams({state: selectedState.name, layer: 'states'})
          }
        }}
        onBackToState={() => {
          setActiveLayer('states')
          setShowDistricts(false)
          setSelectedDistrictId(null)
          if (selectedState) {
            setMapRouteParams({state: selectedState.name, layer: 'states'})
          }
        }}
      />
    </>
  )

  const desktopSidebar = hasSplitPane ? (
    <>
      <View style={[a.p_md, a.gap_sm]}>
        <View style={[a.pt_xs, a.pb_sm]}>
          <Text style={[a.text_2xl, a.font_bold, t.atoms.text]}>
            {selectedState?.name || translate(msg`Mexico Map`)}
          </Text>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_2xs]}>
            {selectedState
              ? showDistricts
                ? translate(msg`Federal districts`)
                : showCities
                  ? translate(msg`Major cities`)
                  : translate(msg`State overview`)
              : translate(msg`Search, filter and explore civic geography`)}
          </Text>
        </View>

        <MapSidebarSearch
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          recentSearchResults={recentSearchResults}
          onSelect={handleSearchSelect}
        />

        <MapSidebarLayers
          activeLayer={activeLayer}
          onSelectLayer={handleSelectLayer}
          civicHeatOn={civicHeatOn}
          onToggleCivicHeat={toggleCivicHeat}
          civicPointCount={civicPointCount}
        />

        <MapSidebarZoneFilters
          discourseType={discourseType}
          selectedDiscourseItem={selectedDiscourseItem}
          onSelectDiscourseType={setDiscourseType}
          onSelectDiscourseItem={(item, type) => {
            setSelectedDiscourseItem(item === 'Any' ? '' : item)
            setDiscourseType(type)
          }}
          onClear={() => setSelectedDiscourseItem('')}
          onOpenPicker={() => setShowDiscourseModal(true)}
        />
      </View>
    </>
  ) : null

  return (
    <Screen hideBorders noInsetTop={isDesktopSplitPane}>
      {!isDesktopSplitPane && (
        <Header.Outer noBottomBorder>
          <Header.BackButton
            style={{marginLeft: -(BUTTON_VISUAL_ALIGNMENT_OFFSET + 8)}}
          />
          {hasSplitPane && onDrawerOpenChange && (
            <Header.Slot>
              <Button
                label={translate(msg`Open sidebar`)}
                size="small"
                variant="ghost"
                color="secondary"
                shape="round"
                onPress={() => onDrawerOpenChange(!drawerOpen)}
                style={[
                  a.bg_transparent,
                  {marginLeft: -BUTTON_VISUAL_ALIGNMENT_OFFSET},
                ]}>
                <ButtonIcon icon={MenuIcon} size="lg" />
              </Button>
            </Header.Slot>
          )}
          <Header.Content>
            <Header.TitleText>
              {selectedState
                ? `${selectedState.name}${showDistricts ? ' · Districts' : showCities ? ' · Cities' : civicHeatOn ? ' · Civic' : ''}`
                : civicHeatOn
                  ? translate(msg`Civic Activity`)
                  : translate(msg`Mexico Map`)}
            </Header.TitleText>
          </Header.Content>
          <Header.Slot />
        </Header.Outer>
      )}

      {hasSplitPane ? (
        <DesktopLayout
          sidebar={desktopSidebar}
          drawerOpen={drawerOpen}
          onDrawerOpenChange={onDrawerOpenChange}
          map={
            <View style={[a.flex_1, a.relative]}>
              {mapViewElement}
              {!mexicoGeoJSON && (
                <View
                  style={[
                    a.absolute,
                    a.inset_0,
                    a.align_center,
                    a.justify_center,
                    t.atoms.bg,
                    {zIndex: 10},
                  ]}>
                  <Loader size="lg" />
                </View>
              )}
              {floatingControls}
              {mobileOverlays}
            </View>
          }
        />
      ) : (
        <View style={[a.flex_1]}>
          <View style={[a.flex_1, a.relative]}>
            {mapViewElement}
            {!mexicoGeoJSON && (
              <View
                style={[
                  a.absolute,
                  a.inset_0,
                  a.align_center,
                  a.justify_center,
                  t.atoms.bg,
                  {zIndex: 10},
                ]}>
                <Loader size="lg" />
              </View>
            )}

            {/* Keep phone controls in normal flow so their measured heights
                cannot put search on top of the layer selector. */}
            <View
              pointerEvents="box-none"
              style={
                !gtMobile && [
                  a.absolute,
                  a.gap_md,
                  {top: 20, left: 16, right: 76, zIndex: 30},
                ]
              }>
              <MapSearchControls
                inline={!gtMobile}
                searchExpanded={searchExpanded}
                setSearchExpanded={setSearchExpanded}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchResults={searchResults}
                recentSearchResults={recentSearchResults}
                onSelect={handleSearchSelect}
              />

              {/* The expanded search drops a results list over this corner. */}
              {!searchExpanded && (
                <MapLayersPanel
                  inline={!gtMobile}
                  activeLayer={activeLayer}
                  onSelectLayer={handleSelectLayer}
                  civicHeatOn={civicHeatOn}
                  onToggleCivicHeat={toggleCivicHeat}
                  civicPointCount={civicPointCount}
                />
              )}
            </View>

            {floatingControls}
            {mobileOverlays}
          </View>
        </View>
      )}

      <Modal
        visible={showDiscourseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDiscourseModal(false)}>
        <View
          style={[
            a.flex_1,
            a.justify_end,
            {backgroundColor: 'rgba(0, 0, 0, 0.4)'},
          ]}>
          <View
            style={[
              a.w_full,
              t.atoms.bg,
              {borderTopLeftRadius: 24, borderTopRightRadius: 24},
              a.p_lg,
              {height: '80%', padding: 0},
            ]}>
            <ScrollView contentContainerStyle={{padding: 16}}>
              <View
                style={[
                  a.rounded_full,
                  t.atoms.bg_contrast_200,
                  {
                    width: 40,
                    height: 4,
                    alignSelf: 'center',
                    marginBottom: 10,
                  },
                ]}
              />

              <MapDiscourseLensContent
                discourseType={discourseType}
                onChangeDiscourseType={setDiscourseType}
                selectedDiscourseItem={selectedDiscourseItem}
                onSelectDiscourseItem={(item, type) => {
                  setSelectedDiscourseItem(item === 'Any' ? '' : item)
                  setDiscourseType(type)
                  setShowDiscourseModal(false)
                }}
                onClear={() => {
                  setSelectedDiscourseItem('')
                  setShowDiscourseModal(false)
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const styles = {
  floatingButton: (t: ReturnType<typeof useTheme>) => [
    t.atoms.bg_contrast_25,
    web({backdropFilter: 'blur(10px)'}),
    a.rounded_full,
    a.shadow_md,
    a.border,
    t.atoms.border_contrast_low,
    a.overflow_hidden,
    a.align_center,
    a.justify_center,
    {width: 44, height: 44},
  ],
  pillButton: (t: ReturnType<typeof useTheme>) => [
    a.px_md,
    a.py_sm,
    a.rounded_full,
    a.border,
    t.atoms.border_contrast_low,
  ],
  pillButtonActive: (t: ReturnType<typeof useTheme>) => [
    {borderColor: t.palette.primary_500, backgroundColor: '#ffffff10'},
  ],
  cityMarkerWrap: [a.align_center, a.justify_center],
  cityMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
  },
  cityMarkerLabel: [a.mt_xs, a.px_sm, {paddingVertical: 3, borderRadius: 999}],
  districtCentroidMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  districtCentroidMarkerSelected: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  civicMarkerWrap: [a.align_center, a.justify_center],
  civicMarkerDot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
  },
}
