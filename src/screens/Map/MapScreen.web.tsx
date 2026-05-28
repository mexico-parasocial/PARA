import {
  type ComponentType,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'
import MapView, {Marker, Polygon} from 'react-native-maps'

import {useMapProvider} from '#/lib/hooks/useMapProvider'
import {useAlf} from '#/alf'
import {MapSplitPaneLayout} from './MapDesktopLayout'
import {MapLibreWeb, type MapLibreWebRef} from './MapLibreWeb'
import {
  MapScreenImpl,
  type MapViewProps,
  type MapViewRef,
  type MarkerProps,
  type PolygonProps,
  type Props,
} from './MapScreen.shared'
import {
  CitiesSidebar,
  DistrictsSidebar,
  StateSummarySidebar,
} from './MapSidebarContent'

/**
 * Adapts MapLibreWeb to the MapViewComponent interface expected by
 * MapScreenImpl. Bridges the imperative ref, polygon data, and theme.
 */
const MapLibreAdapter = forwardRef<MapViewRef, MapViewProps>(
  function MapLibreAdapter(props, ref) {
    const {viewMode} = useMapProvider()
    const {themeName} = useAlf()
    const mapLibreRef = useRef<MapLibreWebRef>(null)

    // Bridge imperative ref so shared code can call animateToRegion,
    // animateCamera, fitToCoordinates, and getCamera.
    useImperativeHandle(ref, () => ({
      animateToRegion(region, duration) {
        mapLibreRef.current?.animateToRegion(region, duration)
      },
      animateCamera(camera) {
        mapLibreRef.current?.animateCamera(camera)
      },
      fitToCoordinates(coordinates, options) {
        mapLibreRef.current?.fitToCoordinates(coordinates, options)
      },
      async getCamera() {
        return mapLibreRef.current?.getCamera() ?? {}
      },
    }))

    // MapLibre handles polygons, civic points, city markers, and district
    // polygons imperatively via GeoJSON layers, so we extract the plain data.
    const polygons = useMemo(() => props.polygonsData || [], [props.polygonsData])
    const civicPoints = useMemo(
      () => props.civicPointsData || [],
      [props.civicPointsData],
    )
    const cityMarkers = useMemo(
      () => props.cityMarkersData || [],
      [props.cityMarkersData],
    )
    const districtCentroids = useMemo(
      () => props.districtCentroidsData || [],
      [props.districtCentroidsData],
    )

    return (
      <MapLibreWeb
        ref={mapLibreRef}
        initialRegion={props.initialRegion!}
        viewMode={viewMode}
        themeName={themeName}
        polygons={polygons}
        civicPoints={civicPoints}
        cityMarkers={cityMarkers}
        districtCentroids={districtCentroids}
        onRegionChangeComplete={props.onRegionChangeComplete}
        onPress={props.onPress}
        onCivicPointPress={props.onCivicPointPress}
      />
    )
  },
)

/**
 * No-op marker for MapLibre mode — MapLibre handles markers through its own
 * API, but the current map doesn't rely heavily on markers for core UX.
 */
function MapLibreMarkerStub(_props: MarkerProps) {
  return null
}

/**
 * No-op polygon for MapLibre mode — polygons are rendered by the MapLibre
 * GL layer system, not as React components.
 */
function MapLibrePolygonStub(_props: PolygonProps) {
  return null
}

/**
 * Web-specific MapScreen with split-pane desktop layout and dual map
 * provider support.
 *
 * - Authenticated users → Google Maps (via react-native-maps)
 * - Anonymous users → MapLibre GL JS (free, no API key, privacy-first)
 * - User can override via Settings toggle
 *
 * On desktop (gtMobile), renders a responsive left sidebar with search,
 * layer picker, and contextual state/district/city panels. The map fills
 * the remaining width.
 *
 * On mobile, falls back to the floating-card overlay layout from
 * MapScreenImpl.
 */
export function MapScreen(props: Props) {
  const {provider} = useMapProvider()

  const isMapLibre = provider === 'maplibre'

  return (
    <MapScreenImpl
      {...props}
      MapViewComponent={
        isMapLibre
          ? (MapLibreAdapter as unknown as ComponentType<MapViewProps>)
          : (MapView as unknown as ComponentType<MapViewProps>)
      }
      MarkerComponent={
        isMapLibre
          ? (MapLibreMarkerStub as unknown as ComponentType<MarkerProps>)
          : (Marker as unknown as ComponentType<MarkerProps>)
      }
      PolygonComponent={
        isMapLibre
          ? (MapLibrePolygonStub as unknown as ComponentType<PolygonProps>)
          : (Polygon as unknown as ComponentType<PolygonProps>)
      }
      DesktopLayout={MapSplitPaneLayout}
      DesktopSidebarComponents={{
        StateSummary: StateSummarySidebar,
        Districts: DistrictsSidebar,
        Cities: CitiesSidebar,
      }}
    />
  )
}
