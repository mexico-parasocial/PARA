# Propuesta de Refactor: Arquitectura de Mapa y Ubicación v2

> **Status:** Draft  
> **Autor:** Asistente Técnico  
> **Fecha:** 2026-05-13  
> **Referencia:** Análisis comparativo contra [iNaturalistReactNative](https://github.com/inaturalist/iNaturalistReactNative)

---

## 1. Resumen Ejecutivo

Esta propuesta busca resolver dos cuellos de botella arquitectónicos identificados en el módulo de mapas de PARA:

1. **Rendimiento del mapa en mobile:** Renderizar 300+ polígonos GeoJSON de distritos electorales + 32 estados + marcadores de ciudades genera jank perceptible en dispositivos de gama media/baja. La estrategia actual no escalará cuando agreguemos actividad cívica (cabildeos, RAQs, nodos de deliberación) por distrito.

2. **Gestión de ubicación acoplada y poco precisa:** El flujo actual de GPS (`expo-location` inline en `MapScreen.shared`) es de una sola lectura, no distinge entre precisión para UI vs. precisión para guardar datos, y no tiene un patrón reutilizable de permisos.

La solución propone adoptar dos patrones probados en producción por iNaturalist (app con >10M descargas, misma stack RN):

- **UTFGrid / Tile-based interactivity** para el mapa.
- **Tiered Location Strategy + `LocationPermissionGate`** para ubicación.

---

## 2. Problema Actual

### 2.1 Mapa: "Death by Polygon"

```
Archivos actuales implicados:
- src/screens/Map/MapScreen.shared.tsx   (~1,775 líneas)
- src/screens/Map/MapScreen.native.tsx
- src/lib/constants/electoralDistrictsData.ts
- src/lib/constants/mexicoGeoJSON.json
- src/lib/constants/mexicoCityData.ts
```

**Síntomas:**
- En Android gama media, el primer render del mapa con polígonos de estado tarda ~1.5s en mostrarse.
- Al cambiar a capa "Distritos", el frame rate cae por debajo de 30fps.
- El JSON de distritos (~300 objetos con geometría hexagonal placeholder) pesa en memoria.
- La capa de "discourse heatmap" es solo un tinte de color, no refleja densidad real de actividad.

**Por qué empeorará:**
- Planeamos mostrar cabildeos/RAQs por distrito → más datos por polígono.
- Queremos heatmaps de actividad cívica → no se puede hacer con polígonos estáticos sin matar el GPU.
- Web vs. Native mantienen dos implementaciones (Google Maps vs. MapLibre) con lógica de polígonos duplicada.

### 2.2 Ubicación: "All-or-Nothing GPS"

```
Archivos actuales implicados:
- src/screens/Map/MapScreen.shared.tsx  (líneas 824-894: locateMe)
- src/geolocation/device.ts
- src/geolocation/service.ts
```

**Síntomas:**
- `locateMe` hace un solo `getCurrentPositionAsync` sin parámetros de precisión.
- No hay distinción entre "necesito ubicación para centrar el mapa" (baja precisión, rápido) vs. "necesito ubicación para georreferenciar un cabildeo" (alta precisión, lento, con consumo de batería).
- La lógica de permisos está inline en `MapScreen.shared`: si queremos usar GPS en otra pantalla (ej. `CivicActivityComposer`), copiamos/peguemos código.
- No hay manejo de "usuario caminó mientras abría la cámara" → ubicación stale.

---

## 3. Propuesta Técnica

### 3.1 Fase A: UTFGrid-Style Interactivity (Mapa v2)

#### Concepto

En lugar de que el cliente renderice 300 polígonos, el servidor (o un proceso de build) genera:

1. **Raster tiles** o **MVT (Mapbox Vector Tiles)** con la capa de distritos/estados/ciudades.
2. Un **companion UTFGrid JSON** (o simplemente un grid de identificadores) que mapea píxeles del tile → ID de entidad (distrito, estado, ciudad).

Al tocar el mapa:
- No se detecta colisión con polígonos.
- Se calcula en qué tile y qué píxel cayó el tap.
- Se hace fetch al UTFGrid correspondiente (cacheable, ~5KB por tile).
- Se resuelve el ID → se navega al perfil del distrito/estado/ciudad.

#### Arquitectura propuesta

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Mobile App    │         │   CDN / API     │         │   Tile Server   │
│                 │         │                 │         │  (o MapLibre)   │
│  react-native-  │◄────────┤  /tiles/{z}/{x} │◄────────┤                 │
│  maps + UrlTile │  PNG    │  /grid/{z}/{x}  │  JSON   │  UTFGrid        │
│                 │         │                 │         │  Generator      │
└────────┬────────┘         └─────────────────┘         └─────────────────┘
         │
         │ Tap en (lat, lng)
         ▼
  ┌──────────────┐
  │  calculate   │
  │  tile + pixel│
  └──────┬───────┘
         │ GET /grid/12/1204/1533.json
         ▼
  ┌──────────────┐
  │  UTFGrid     │  { " districtId": "14-DIS-089", "activityScore": 42 }
  │  Response    │
  └──────┬───────┘
         │ navigation.push('DistrictProfile', { districtId: "14-DIS-089" })
         ▼
```

#### Implementación práctica (fase corto plazo)

**Opción A: MVT + MapLibre (recomendada para web)**
- Convertir `electoralDistrictsData.ts` + `mexicoGeoJSON.json` a un `.mbtiles` o servirlo con [tippecanoe](https://github.com/felt/tippecanoe).
- En web, MapLibre ya soporta MVT nativamente. Los polígonos se renderizan en GPU.
- Interactivity vía `queryRenderedFeatures` (más simple que UTFGrid).

**Opción B: UTFGrid manual (recomendada para RN + compatibilidad web)**
- Generar tiles PNG con colores por distrito (servidos desde S3/CloudFront).
- Generar grids JSON con el mismo esquema de directorios (`{z}/{x}/{y}.json`).
- En `react-native-maps`, usar `<UrlTile />` para el raster + un helper `fetchUTFGrid(z, x, y, pixelX, pixelY)` en tap.
- Cachear grids en `react-native-mmkv` o memoria (LRU de 100 tiles).

**Opción C: Híbrida (mvp inmediato)**
- Mantener polígonos GeoJSON para estados (solo 32, rendimiento OK).
- Reemplar **solo distritos** con tile-based approach.
- Esto reduce de 300 polígonos a 32 polígonos + tiles.

#### Cambios en código (resumen)

```typescript
// Nuevo: src/components/Map/UtfGridResolver.ts
export async function resolveTapToDistrict(
  coordinate: { latitude: number; longitude: number },
  zoom: number
): Promise<DistrictHit | null> {
  const { x, y } = latLngToTile(coordinate, zoom);
  const { px, py } = latLngToPixelInTile(coordinate, zoom);
  const grid = await fetchUTFGrid(zoom, x, y); // cached
  return decodeGridPixel(grid, px, py);
}

// Nuevo: src/components/Map/HeatmapTileLayer.tsx
// Reemplaza la lógica de polygon rendering para distritos
```

#### Beneficios esperados

| Métrica | Antes | Después |
|---------|-------|---------|
| Polígonos en memoria (mobile) | 300+ | 0 |
| Tiempo primer render mapa | ~1.5s | ~300ms |
| FPS al cambiar capas | <30fps | 60fps |
| Tamaño de bundle (GeoJSON) | Incluido | Lazy-loaded o eliminado |
| Escalabilidad actividad cívica | Limitada | Ilimitada (solo tiles) |

---

### 3.2 Fase B: Tiered Location Strategy + PermissionGate

#### Concepto

Separar la obtención de ubicación en **tres niveles de precisión**, cada uno con un propósito claro, y centralizar los permisos en un componente/HOC reutilizable.

#### Niveles de precisión

| Nivel | Función | Precisión | Tiempo | Uso en PARA |
|-------|---------|-----------|--------|-------------|
| **Coarse** (`fetchCoarseLocation`) | Baja, rápida, bajo consumo | ~100m-1km | <500ms | Centrar mapa en estado aproximado; pre-seleccionar estado en dropdowns |
| **Accurate** (`fetchAccurateLocation`) | Alta, una sola lectura | ~5-20m | 2-5s | Guardar ubicación de un cabildeo/RAQ/evento. Se ejecuta **solo al momento de guardar** |
| **Watch** (`useWatchPosition`) | Alta, continua hasta umbral | <10m | Variable (hasta lograr <10m) | Eventos en tiempo real: protesta, town hall. Se muestra indicador de precisión y se bloquea "fijar ubicación" hasta alcanzar el umbral |

#### Arquitectura propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    LocationPermissionGate                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ hasPermissions  │  │ request()       │  │ renderGate  │  │
│  │ (boolean)       │  │ (async)         │  │ (component) │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
   │  MapScreen  │    │ CivicActivity│    │ LocationPicker  │
   │  (coarse)   │    │ Composer     │    │ (accurate)      │
   │             │    │ (accurate)   │    │                 │
   └─────────────┘    └─────────────┘    └─────────────────┘
```

#### API propuesta

```typescript
// Nuevo: src/geolocation/LocationPermissionGate.tsx
export function LocationPermissionGate({
  children,
  fallback = <LocationPermissionPrompt />,
}: Props) {
  const { hasPermissions, requestPermissions } = useLocationPermission();
  if (!hasPermissions) return fallback;
  return children;
}

// Nuevo: src/geolocation/hooks/useLocationPermission.ts
export function useLocationPermission() {
  const [hasPermissions, setHasPermissions] = useState(false);
  const requestPermissions = async () => { /* ... */ };
  return { hasPermissions, requestPermissions };
}

// Nuevo: src/geolocation/hooks/useCoarseLocation.ts
export function useCoarseLocation() {
  return useQuery({
    queryKey: ['location', 'coarse'],
    queryFn: fetchCoarseUserLocation,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

// Nuevo: src/geolocation/hooks/useAccurateLocation.ts
export async function fetchAccurateUserLocation(): Promise<Location> {
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation,
    mayShowUserSettingsDialog: true,
  });
}

// Nuevo: src/geolocation/hooks/useWatchPosition.ts
export function useWatchPosition(options: {
  targetAccuracy: number;     // ej. 10 (metros)
  timeout: number;            // ej. 30000 (ms)
  onReached: (loc: Location) => void;
  onTimeout: () => void;
}) {
  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      (pos) => {
        if (pos.coords.accuracy <= options.targetAccuracy) {
          options.onReached(pos);
          Geolocation.clearWatch(watchId);
        }
      },
      null,
      { enableHighAccuracy: true, distanceFilter: 0 }
    );
    const timer = setTimeout(() => {
      Geolocation.clearWatch(watchId);
      options.onTimeout();
    }, options.timeout);
    return () => {
      Geolocation.clearWatch(watchId);
      clearTimeout(timer);
    };
  }, []);
}
```

#### Patrón de uso

```tsx
// ANTES (MapScreen.shared.tsx ~línea 824)
const locateMe = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return;
  const location = await Location.getCurrentPositionAsync({}); // ¡una sola lectura!
  // ... lógica inline de 70 líneas ...
};

// DESPUÉS
function MapScreen() {
  const { data: coarseLocation } = useCoarseLocation();
  const { mutate: locate } = useCoarseLocationMutation();
  
  return (
    <LocationPermissionGate>
      <MapView
        onPressLocateMe={() => locate()}
        initialRegion={coarseLocation}
      />
    </LocationPermissionGate>
  );
}

// En CivicActivityComposer.tsx
function CivicActivityComposer() {
  const [pendingLocation, setPendingLocation] = useState<Location | null>(null);
  
  const handleSave = async () => {
    // Solo aquí pedimos alta precisión
    const accurateLocation = await fetchAccurateUserLocation();
    setPendingLocation(accurateLocation);
    await submitCabildeo({ ...data, location: accurateLocation });
  };
  
  return (
    <LocationPermissionGate>
      <Composer onSave={handleSave} />
    </LocationPermissionGate>
  );
}

// En un evento en vivo (protesta, town hall)
function LiveEventPinning() {
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  useWatchPosition({
    targetAccuracy: 10,
    timeout: 30000,
    onReached: (loc) => {
      setAccuracy(loc.coords.accuracy);
      setIsReady(true);
    },
    onTimeout: () => {
      Alert.alert('No se pudo obtener precisión suficiente');
    },
  });
  
  return (
    <View>
      <Text>Precisión actual: {accuracy ?? 'calculando...'}m</Text>
      <Button disabled={!isReady} title="Fijar ubicación del evento" />
    </View>
  );
}
```

#### Beneficios esperados

| Métrica | Antes | Después |
|---------|-------|---------|
| Reutilización permisos | Copy-paste por pantalla | `<LocationPermissionGate />` una vez |
| Consumo batería (mapa) | Alto (precisión alta innecesaria) | Bajo (coarse para UI) |
| Precisión de datos cívicos | Variable (~100m) | Garantizada (~5-20m) con metadato de accuracy |
| UX en eventos en vivo | No existe | Indicador de precisión + bloqueo hasta <10m |
| Testabilidad | Difícil (lógica acoplada a UI) | Fácil (hooks puros, mockables) |

---

## 4. Plan de Implementación

### Fase 1: Fundamentos (Semana 1-2)
- [ ] Crear `useLocationPermission`, `LocationPermissionGate`, `fetchCoarseLocation`
- [ ] Refactorizar `MapScreen.shared.tsx`: extraer `locateMe` a `useCoarseLocationMutation`
- [ ] Agregar `positionalAccuracy` al schema de datos cívicos (para guardar accuracy junto con lat/lng)
- [ ] Tests unitarios para hooks de ubicación

### Fase 2: Mapa híbrido (Semana 3-4)
- [ ] Generar tiles PNG para distritos (usar tippecanoe o script de Python con GeoJSON)
- [ ] Implementar `UtfGridResolver` + caché LRU
- [ ] Reemplazar render de distritos en `MapScreen.native.tsx` con `<UrlTile />`
- [ ] Mantener estados como polígonos GeoJSON (solo 32, rendimiento aceptable)
- [ ] Fallback: si no hay tiles, mostrar polígonos originales (band `useTileLayer`)

### Fase 3: Ubicación precisa para contenido (Semana 5)
- [ ] Crear `fetchAccurateUserLocation` y `useWatchPosition`
- [ ] Integrar en flujo de creación de cabildeos/RAQs (cuando exista)
- [ ] Agregar `LocationPicker` con crosshair (ver propuesta separada si aplica)
- [ ] Integrar `GeoprivacySheet` para niveles de privacidad de ubicación

### Fase 4: Optimización y métricas (Semana 6)
- [ ] Agregar `mapPerformanceTracker` (tiempo a primer tile visible, tiempo a interactivity)
- [ ] Medir antes/después con Flipper o Firebase Performance
- [ ] A/B test: tiles vs. polígonos en producción

---

## 5. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Generación de tiles añade infraestructura | Media | Medio | Fase 2 usa pipeline manual (script local + S3). No requiere servidor propio inicialmente. |
| `react-native-maps` + `UrlTile` tiene bugs en Android | Alta | Alto | iNat ya documentó workarounds extensivos. Podemos portar sus helpers `androidLocalRegion` y tile re-render. |
| Usuarios esperan tap inmediato, UTFGrid añade latencia | Media | Medio | Cache agresivo + precarga de tiles adyacentes. Mostrar spinner mínimo. |
| `expo-location` no soporta `watchPosition` con umbral de accuracy | Baja | Alto | Migrar a `@react-native-community/geolocation` solo para watch, mantener `expo-location` para lecturas simples. |
| Breaking change en web (MapLibre ya es diferente) | Baja | Medio | La arquitectura tile-based es *más* compatible con MapLibre que con react-native-maps. Web se beneficia. |

---

## 6. Alternativas Consideradas

| Alternativa | Pros | Contras | Veredicto |
|-------------|------|---------|-----------|
| **Mantener polígonos, optimizar con `react-native-svg`** | Sin infraestructura nueva | No escala a actividad cívica densa; sigue pesado en memoria | Descartado |
| **Supercluster + markers** (como Airbnb) | Bueno para puntos | Distritos son polígonos, no puntos. No aplica directamente. | Descartado |
| **Mapbox GL RN (v10)** | Mejor rendimiento que react-native-maps | SDK pesado, licencia restrictiva, migración completa. | Postergado; evaluar en futuro |
| **Solo tiles raster, sin UTFGrid** | Más simple | No hay interactivity. El tap no sabe qué distrito es. | Descartado |

---

## 7. Conclusión

Esta refactorización transforma el mapa de PARA de un **visor de capas estáticas** a una **plataforma de descubrimiento espacial escalable**, y la ubicación de un **comodín de una sola lectura** a un **sistema de precisión graduada con privacidad incorporada**.

Los patrones propuestos están probados en iNaturalist, una app con millones de usuarios y década de iteración en mapas + GPS + creación de contenido georreferenciado. No reinventamos la rueda; adoptamos lo que ya funciona.

**Recomendación:** Aprobar Fase 1 inmediatamente (bajo riesgo, alto valor). Fase 2 requiere validación con un prototipo de tile generation antes de comprometer recursos.

---

## Apéndice A: Referencias de iNaturalist

- [`Map.tsx`](https://github.com/inaturalist/iNaturalistReactNative/blob/main/src/components/SharedComponents/Map/Map.tsx) — Componente centralizado de mapa con `UrlTile`, `onRegionChangeComplete`, workarounds de Android.
- [`fetchAccurateUserLocation.ts`](https://github.com/inaturalist/iNaturalistReactNative/blob/main/src/components/SharedComponents/Map/fetchAccurateUserLocation.ts) — Estrategia de precisión.
- [`useWatchPosition.ts`](https://github.com/inaturalist/iNaturalistReactNative/blob/main/src/components/SharedComponents/Map/hooks/useWatchPosition.ts) — Watch con umbral de accuracy.
- [`useLocationPermission.ts`](https://github.com/inaturalist/iNaturalistReactNative/blob/main/src/components/SharedComponents/hooks/useLocationPermission.ts) — Hook de permisos.
- [`ExploreContext.tsx`](https://github.com/inaturalist/iNaturalistReactNative/blob/main/src/components/Explore/ExploreContext.tsx) — Reducer unificado de búsqueda geográfica.
- [`LocationPicker.js`](https://github.com/inaturalist/iNaturalistReactNative/blob/main/src/components/LocationPicker/LocationPicker.js) — Crosshair picker.

---

*Fin de la propuesta.*
