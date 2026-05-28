# Plan: Software para Visualización de Grafos de Última Generación en PolicyTree
## Contexto: PARA — Civic Tech Platform

---

## Estado Actual (Revisado)

Tras inspección del código, el usuario ha mejorado significativamente la terminología:

| Antes | Ahora | Estado |
|---|---|---|
| PolicyTreeScreen | CivicMapScreen | ✅ Renombrado |
| /policy-tree | /civic-map | ✅ Renombrado |
| MyBase (tab) | MyBase (perfil) | ✅ Separado |
| Spatial Deliberation | Mapa Cívico Comunitario | ✅ Renombrado |
| Collections | Branches (ramas) | ✅ Metáfora de árbol |

**Hallazgos clave:**
- `CivicMapScreen` gestiona **colecciones personales** (ramas) del usuario
- `SpatialDeliberationScreen` (`Mapa Cívico Comunitario`) ya tiene un **grafo funcional** con `DeliberationGraph` usando SVG + force simulation
- `DeliberationGraph` soporta: pan, zoom, doble-tap, wheel (web), nodos coloreados por stance, aristas por tipo de relación, filtros, búsqueda
- La arquitectura de datos usa `GraphData` con `nodes` (cards/claims) y `edges` (relationships)

**Problema pendiente:** El `CivicMapScreen` (colecciones personales) **NO tiene visualización de grafo**. Es solo una FlatList de ramas. El usuario quiere que las colecciones personales también se exploren como un **grafo interactivo de última generación**, igual que el Mapa Cívico Comunitario pero para contenido personal.

---

## Objetivo

Encontrar y evaluar software (librerías, motores, frameworks) que permitan visualizar grafos de conocimiento (nodos = posts, claims, evidence, policies; aristas = relaciones semánticas/temáticas) con:

1. **Paridad mobile/web** (React Native + Web)
2. **Rendimiento con >100 nodos** (60fps en móvil)
3. **Interacciones táctiles nativas** (pan, pinch-zoom, tap, long-press)
4. **Layouts automáticos inteligentes** (force-directed, hierarchical, radial)
5. **Personalización visual** (colores por tipo de nodo, tamaño por influencia, labels)
6. **Fácil integración con React Native** (preferiblemente sin WebView)

---

## Opciones Evaluadas

### Opción 1: Reanimated 3 + Gesture Handler + react-native-svg (Stack Actual Mejorado)

**Descripción:** Usar la misma arquitectura que ya funciona en `DeliberationGraph` pero optimizada con Reanimated 3 para animaciones en UI thread y react-native-gesture-handler para gestos nativos.

**Pros:**
- Ya está en el proyecto (`react-native-svg` confirmado en `DeliberationGraph`)
- Control total sobre renderizado
- Funciona en web vía `@svgdotjs/svg.js` o renderizado canvas
- Sin dependencias pesadas

**Contras:**
- Requiere implementar force simulation desde cero o adaptar `d3-force`
- Zoom/pinch en móvil es complejo de hacer bien
- Layouts no automáticos (hay que codear cada uno)

**Veredicto:** Viable para MVP, pero no es "última generación" sin inversión significativa.

---

### Opción 2: vis.js / vis-network (via WebView o react-native-webview)

**Descripción:** Librería web madura para grafos interactivos. En RN se usa via WebView.

**Pros:**
- Feature-rich: clustering, físicas, layouts, clustering jerárquico
- Muy probada en producción
- Fácil de usar (declarativa)

**Contras:**
- **WebView = mala UX en móvil** (scroll conflicts, touch latency, no native feel)
- No hay paridad real mobile/web
- Bundle size grande
- Performance decae con >200 nodos en WebView

**Veredicto:** Descartado. WebView rompe la experiencia nativa.

---

### Opción 3: react-native-graph (by Shopify) + Custom Layout Engine

**Descripción:** Librería de Shopify para grafos en RN usando Skia.

**Pros:**
- Renderizado nativo via Skia (GPU-accelerated)
- Animaciones fluidas
- Buen rendimiento

**Contras:**
- Diseñada para **time-series / line graphs**, no para network graphs
- No tiene layouts de grafo (force-directed, etc.)
- Requeriría fork heavy

**Veredicto:** No aplica. Es para gráficas de líneas, no grafos de red.

---

### Opción 4: **react-native-graphview** (no existe) → Sigma.js via react-native-skia

**Descripción:** Sigma.js es el estándar web para grafos grandes. Podría portarse a Skia.

**Pros:**
- Sigma.js maneja 10k+ nodos en web
- WebGL rendering

**Contras:**
- No hay binding de Sigma.js para React Native
- Portar a Skia es proyecto de semanas
- WebGL no está disponible en RN sin expo-gl (complejo)

**Veredicto:** Demasiado ambicioso para el scope.

---

### Opción 5: **Ogma by Linkurious** (Commercial) o **Cytoscape.js**

**Ogma:**
- Comercial, muy caro
- Web-only, no RN

**Cytoscape.js:**
- Web-only
- WebView needed for RN

**Veredicto:** Descartados por no soportar RN nativo.

---

### Opción 6: **react-native-reanimated-graph** (Custom Build)

**Descripción:** Construir un motor de grafo propio sobre:
- `react-native-reanimated` (animaciones en UI thread)
- `react-native-gesture-handler` (gestos nativos)
- `react-native-svg` (renderizado vectorial)
- `d3-force` o custom force simulation (lógica en JS thread, posiciones animadas vía shared values)

**Arquitectura propuesta:**

```
Data Layer: GraphData (nodes[], edges[])
  ↓
Layout Engine: d3-force (simulation.tick() en worklet o JS)
  ↓
Shared Values: Reanimated SharedValue<{x,y}[]> 
  ↓
Renderer: react-native-svg (Circle, Line, Text)
  ↓
Gestures: GestureHandler (Pan, Pinch, Tap, LongPress)
```

**Pros:**
- Control total
- Paridad mobile/web (SVG funciona en ambos)
- Performance nativa con Reanimated 3
- Se reutiliza código existente de `DeliberationGraph`

**Contras:**
- Inversión de tiempo significativa
- Force simulation en worklets tiene limitaciones
- Pinch-zoom en SVG es tricky

**Veredicto:** La opción más viable para "última generación" manteniendo control.

---

### Opción 7: **Three.js / React Three Fiber** (3D Graphs)

**Descripción:** Usar React Three Fiber para grafos en 3D con nodos como esferas y aristas como líneas.

**Pros:**
- Visualmente impresionante
- React Three Fiber tiene soporte RN via `@react-three/fiber` + expo-gl
- Force layouts 3D nativos

**Contras:**
- Overkill para la mayoría de los casos de uso cívico
- Batería y GPU intensivo
- Accesibilidad complicada
- Overlap de nodos en 3D es difícil de navegar en móvil

**Veredicto:** Descartado. 3D no aporta valor para información cívica densa.

---

### Opción 8: **react-native-graph-kit** (Hipoético) / **Victory Native**

**Victory Native:** Solo para charts estadísticos, no network graphs.

**Veredicto:** No aplica.

---

## Recomendación Final

### Opción Ganadora: **Opción 6 — Motor Propio Optimizado (Reanimated 3 + SVG + d3-force)**

**Razones:**
1. El proyecto **ya tiene** `DeliberationGraph` funcionando con SVG + force simulation
2. La inversión incremental es menor que integrar una librería externa
3. Paridad mobile/web garantizada (SVG es universal)
4. Control sobre cada pixel (crítico para civic-tech donde la claridad importa)
5. No hay dependencias comerciales ni WebViews

### Plan de Implementación

#### Fase 1: Extraer motor reutilizable (2-3 días)

Crear `src/components/graph/` con:

```
graph/
  GraphCanvas.tsx          # Canvas SVG con pan/zoom/gestures
  GraphNode.tsx            # Nodo renderizable
  GraphEdge.tsx            # Arista renderizable
  useGraphLayout.ts        # Hook de force simulation (d3-force)
  useGraphGestures.ts      # Hook de pan/pinch/tap
  useGraphViewport.ts      # Hook de transformación coordenadas
  types.ts                 # GraphNode, GraphEdge, LayoutConfig
```

**Tareas:**
- [ ] Extraer lógica de `DeliberationGraph` en hooks reutilizables
- [ ] Migrar force simulation a worklet de Reanimated 3 (si es posible) o usar `requestAnimationFrame` optimizado
- [ ] Implementar pinch-zoom nativo con `GestureHandler`
- [ ] Soporte de selección múltiple y drag-and-drop de nodos

#### Fase 2: Adaptar CivicMapScreen (1-2 días)

- [ ] Crear vista de grafo para colecciones personales
- [ ] Nodos = items de colección (posts, claims, evidence)
- [ ] Aristas = relaciones temáticas o de colección compartida
- [ ] Colores por tipo de card (article, research, claim, etc.)
- [ ] Filtros por colección (mostrar/ocultar ramas)

#### Fase 3: Optimizaciones de última generación (3-5 días)

- [ ] **Virtualización:** Solo renderizar nodos en viewport (culling)
- [ ] **Level-of-Detail:** Labels solo en zoom > 1.2, nodos pequeños sin label
- [ ] **Clustering automático:** Agrupar nodos por colección cuando zoom < 0.8
- [ ] **Mini-map:** Vista de pájaro en esquina para navegación
- [ ] **Búsqueda visual:** Highlight de nodos matching query, fade del resto
- [ ] **Animaciones de entrada:** Nodos aparecen con spring animation

#### Fase 4: Web Parity (1 día)

- [ ] Asegurar que `.web.tsx` variants usen el mismo código SVG
- [ ] Wheel zoom en web (ya parcialmente implementado)
- [ ] Keyboard shortcuts (navegación con flechas, ESC para deselect)

---

## Comparativa Rápida

| Criterio | SVG+Reanimated (Propuesto) | WebView (vis.js) | 3D (Three.js) |
|---|---|---|---|
| Mobile Native Feel | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Web Parity | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Performance >100 nodos | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Customización | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Tiempo de implementación | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| Mantenimiento | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Sin WebView | ✅ | ❌ | ⚠️ (expo-gl) |

---

## Conclusión

La mejor experiencia de "última generación" para grafos de conocimiento en PARA se logra **evolucionando la arquitectura actual** (`DeliberationGraph`) en lugar de integrar librerías externas. El motor SVG + Reanimated 3 + Gesture Handler es la única opción que garantiza:

1. **Experiencia nativa** en iOS/Android
2. **Paridad web** sin duplicar código
3. **Performance** suficiente para grafos cívicos (<500 nodos típicamente)
4. **Control total** sobre la estética y las interacciones

El trabajo no es trivial (1-2 semanas), pero el resultado es un componente propio que se convierte en ventaja competitiva del producto, no en una deuda técnica de integración.

---

*Plan generado por Artu 🛠️🤖*
*Basado en inspección de código de PARA al 8 de mayo 2026*
