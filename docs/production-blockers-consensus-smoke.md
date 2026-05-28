# PARA: Blockers Reales de Produccion y Smoke Test

Fecha base: April 24, 2026

## Objetivo de release

Llevar PARA a produccion con una comunidad real, un flujo real de politica/propuesta, votos ponderados `-3` a `+3`, y un resultado oficial verificable por reglas claras.

Discourse analysis queda fuera de este release.

## Definicion de hecho

El release esta listo cuando:

- `GetParaCommunityGovernance` funciona end to end desde backend hasta UI.
- una propuesta o politica real puede recibir votos ponderados `-3..+3`.
- el tally se calcula de forma determinista y repetible.
- una politica puede pasar a estado `official`.
- los permisos de `member`, `verified`, `deputy`, `delegate` y `moderator` estan implementados y respetados.
- el smoke test de este documento pasa sin mocks en el camino principal.

## Blockers de produccion

### 1. `GetParaCommunityGovernance` funcionando end to end

#### Alcance

Debemos tener una sola ruta real y consistente para governance:

- lexicon y contrato estables
- lectura desde PDS/AppView/backend
- query en cliente
- render en Community Profile / Badges / Governance surfaces

#### El payload minimo que tiene que existir

- `communityId`
- `slug`
- `name`
- `governanceSummary`
- `moderators`
- `delegates`
- `deputyRoles` o equivalente
- `officials` si aplica
- metadata suficiente para mostrar estado de publicacion y timestamps

#### Criterios de aceptacion

- una comunidad real responde governance desde backend sin fallback mock.
- el cliente muestra uno de estos estados y solo uno:
  - loading
  - published
  - no-record
  - error con retry
- Community Profile y Community Badges muestran la misma fuente de verdad.
- el retry vuelve a disparar la query y puede recuperar desde error.

#### Riesgos a cerrar

- governance record sin lexicon formal
- diferencias entre record store y AppView
- UI leyendo campos que backend todavia no garantiza

---

### 2. Flujo real de propuesta/politica con votos ponderados `-3..+3`

#### Alcance

Necesitamos una ruta real para:

1. crear propuesta o politica
2. abrir ventana de voto
3. emitir votos con `signal`
4. leer esos votos en UI
5. preparar el tally

#### Contrato minimo

Cada voto debe incluir:

- `subject`
- `subjectType`
- `signal`
- `createdAt`
- `author`

Cada propuesta/politica debe incluir:

- `uri`
- `title`
- `community`
- `status`
- `version` o referencia equivalente para congelar el contenido a votar

#### Reglas de validacion

- `signal` solo acepta enteros de `-3` a `3`
- valores fuera de rango se rechazan
- si el voto cuenta para consenso oficial, el autor debe ser elegible
- un usuario no puede tener mas de un voto activo por version de propuesta
- cambiar voto debe definirse explicitamente:
  - recomendado para MVP: se toma el voto mas reciente del mismo actor sobre la misma version

#### Criterios de aceptacion

- un usuario elegible puede votar con cualquier valor entre `-3` y `3`
- el voto aparece reflejado en UI y backend sin mocks
- el sistema rechaza payloads invalidos
- la propuesta correcta recibe los votos correctos

---

### 3. Calculo de tally determinista

#### Principio

Dos lecturas del mismo conjunto de votos deben producir exactamente el mismo resultado.

#### Regla recomendada para MVP

Para una version congelada de propuesta:

- conjunto de votos elegibles: ultimo voto valido por actor elegible
- quorum:
  - al menos `10` votantes elegibles, o
  - `20%` del censo elegible,
  - usar el menor de los dos para la primera comunidad
- promedio ponderado:
  - `sum(signal) / totalVotosElegibles`
- resultado:
  - `>= 2`: aprobado con apoyo fuerte
  - `>= 1`: aprobado
  - `>-1` y `<1`: sin consenso suficiente
  - `<= -1`: rechazado

#### Reglas de borde

- `0` cuenta para quorum y para el promedio
- empate o promedio entre `-0.99` y `0.99` no pasa
- votos emitidos fuera de la ventana no cuentan
- votos sobre otra version no cuentan
- votos de usuarios no elegibles no cuentan

#### Artefacto de tally

Cada tally debe registrar:

- `proposalUri`
- `proposalVersion`
- `eligibleVoterCount`
- `votesCounted`
- `quorumThreshold`
- `quorumReached`
- `sumSignal`
- `averageSignal`
- `result`
- `computedAt`

#### Criterios de aceptacion

- el mismo input produce el mismo tally en backend y UI
- el tally no depende del orden de llegada de eventos
- existen tests de limites:
  - `-3`
  - `3`
  - quorum exacto
  - quorum fallido
  - promedio exacto `1`
  - promedio exacto `-1`

---

### 4. Estado `official` para politicas

#### Principio

Una politica no se vuelve oficial por percepcion social; se vuelve oficial porque cumplio regla, quorum y certificacion.

#### Flujo recomendado

Estados minimos:

- `draft`
- `in_deliberation`
- `vote_open`
- `passed`
- `failed`
- `official`
- `superseded` si luego hay reemplazo

#### Condicion para pasar a `official`

Debe cumplirse todo esto:

- la propuesta estuvo en `vote_open`
- existe tally valido y determinista
- `quorumReached = true`
- `result = approved` o `approved_strong`
- existe certificacion valida

#### Certificacion MVP

Recomendado:

- dos `delegate`, o
- un `delegate` y un `moderator`/auditor

#### Criterios de aceptacion

- una politica aprobada no se muestra como `official` sin certificacion
- una politica `official` muestra:
  - resultado
  - fecha de oficializacion
  - referencia al tally
  - firmantes/certificadores
- refresh y reindex preservan el estado

---

### 5. Permisos claros por rol

#### Matriz minima de permisos

| Rol             | Leer governance | Crear propuesta | Votar oficial  | Patrocinar/aperturar voto | Certificar                             | Moderar |
| --------------- | --------------- | --------------- | -------------- | ------------------------- | -------------------------------------- | ------- |
| Member          | si              | no              | no             | no                        | no                                     | no      |
| Verified Member | si              | si              | si             | no                        | no                                     | no      |
| Deputy          | si              | si              | si             | si                        | no                                     | no      |
| Delegate        | si              | si              | si             | si                        | si                                     | no      |
| Moderator       | si              | no              | no por defecto | no                        | si, si se permite como co-certificador | si      |

#### Decisiones de MVP

- `member` no participa en voto oficial
- `verified member` ya cuenta para quorum
- `deputy` puede empujar propuestas a voto
- `delegate` puede certificar
- `moderator` no altera resultados, solo seguridad y cumplimiento, salvo rol explicito como co-certificador

#### Criterios de aceptacion

- backend rechaza acciones fuera de permiso
- UI no muestra CTA invalidos para cada rol
- los errores de permiso son explicitos
- tests cubren al menos un caso permitido y uno denegado por rol critico

## Orden recomendado de ejecucion

### Fase 1. Governance real

- cerrar contrato de `GetParaCommunityGovernance`
- eliminar fallback mock del camino principal
- validar estados de carga/error/no-record

### Fase 2. Voto ponderado real

- cerrar shape final de propuesta y voto
- escribir y leer votos `-3..+3`
- mostrar agregado basico en cliente

### Fase 3. Tally y estado `official`

- implementar computo determinista
- guardar artefacto de tally
- implementar certificacion
- cambiar estado a `official`

### Fase 4. Permisos

- aplicar checks en backend
- reflejar permisos en UI
- correr smoke test completo

## Smoke test de produccion

### Precondiciones

- existe una comunidad real publicada
- existe governance record real
- existen al menos 5 cuentas de prueba:
  - 1 `member`
  - 1 `verified member`
  - 1 `deputy`
  - 1 `delegate`
  - 1 `moderator`
- la politica/propuesta puede crearse en entorno real o staging productivo

### Smoke test A: Governance read

1. Abrir comunidad real.
2. Entrar a perfil de comunidad.
3. Abrir surface de governance o badges.
4. Confirmar que se renderiza governance real.

Resultado esperado:

- no aparece mock data
- se ve `loading`, luego `published`
- moderators/delegates/deputy roles son consistentes entre surfaces

### Smoke test B: Crear propuesta/politica

1. Ingresar como `verified member` o `deputy`.
2. Crear una propuesta/politica nueva.
3. Confirmar que aparece en la lista de la comunidad.
4. Confirmar que tiene `status = draft` o `in_deliberation`.

Resultado esperado:

- la propuesta existe tras refresh
- la propuesta tiene `uri` estable

### Smoke test C: Abrir voto

1. Ingresar como `deputy` o `delegate`.
2. Mover la propuesta a `vote_open`.
3. Verificar que la version queda congelada para voting.

Resultado esperado:

- la UI muestra que el voto esta abierto
- queda claro sobre que version se esta votando

### Smoke test D: Emitir votos ponderados

1. Ingresar como `verified member` y votar `1`.
2. Ingresar como `deputy` y votar `3`.
3. Ingresar como `delegate` y votar `2`.
4. Intentar votar como `member`.
5. Intentar votar con un valor invalido como `4` o `-4`.

Resultado esperado:

- votos validos se guardan
- `member` no elegible recibe rechazo claro
- valores invalidos se rechazan
- el agregado visible cambia despues de cada voto valido

### Smoke test E: Tally determinista

1. Ejecutar recomputo o lectura del tally.
2. Refrescar cliente.
3. Repetir lectura desde otra sesion.

Resultado esperado:

- mismo `votesCounted`
- mismo `sumSignal`
- mismo `averageSignal`
- mismo `result`

### Smoke test F: Oficializacion

1. Ingresar como `delegate`.
2. Aplicar certificacion requerida.
3. Confirmar transicion a `official`.

Resultado esperado:

- la politica cambia a `official`
- se muestran firmantes/certificadores
- el estado persiste tras refresh

### Smoke test G: Permisos

1. `member` intenta crear propuesta oficial o votar oficial.
2. `verified member` intenta certificar.
3. `moderator` intenta alterar tally directamente.

Resultado esperado:

- todas las acciones prohibidas son rechazadas
- no se muestran CTAs incorrectos
- el backend protege aunque la UI falle

## Go / No-Go

### Go

Lanzamos si:

- pasan todos los smoke tests A-F
- los permisos criticos quedan validados
- no hay mock data en el camino principal
- el estado `official` sobrevive refresh y reindex

### No-Go

No lanzamos si ocurre cualquiera de estos:

- governance no carga desde fuente real
- votos `-3..+3` no son estables
- el tally cambia entre lecturas equivalentes
- una politica llega a `official` sin certificacion valida
- un rol no autorizado puede ejecutar acciones criticas

## Siguiente paso recomendado

El siguiente paso de ejecucion no es ampliar mas superficies. Es cerrar este camino completo en staging y luego correr este smoke test con cuentas reales de prueba antes de tocar discurso, mapas o delegation avanzada.
