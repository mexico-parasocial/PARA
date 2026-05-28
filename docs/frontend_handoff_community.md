# PARA Frontend Handoff: Community Creation & Flow

Este documento detalla el comportamiento de la arquitectura "Comunidades" en PARA para la integración en la aplicación React Native, particularmente en el módulo de Mapas Computacionales y Cívicos.

## Estructura Central (El modelo 270/30)

Para evitar conflictos de estado debido a la naturaleza experimental de los grupos en el protocolo AT base de Bluesky, la creación de Comunidades será delegada integramente al servidor a través de una **operación única (RPC)**.

### Nueva Acción (RPC)

Deben utilizar el endpoint `com.para.community.createBoard` para la fundación inicial.

**Llamada (Input):**

```ts
const res = await agent.com.para.community.createBoard({
  name: 'Alianza Cívica Centro', // Nombre de la comunidad (visible)
  quadrant: 'NW-23', // El token o índice 25th del compás político
  description: 'Debate abierto del sector noroeste',
})
```

**Respuesta (Output):**

```ts
{
  uri: "at://did:plc:x/com.para.community.board/y", // ATProto URI publico del record
  cid: "bafyre...",
  delegatesChatId: "group-x...",       // ID del primer grupo bsky chat (Capacidad 270 máx)
  subdelegatesChatId: "group-y..."     // ID del segundo bsky chat (Capacidad 30 máx)
}
```

## Protocolos de Visualización (View Protocols)

El backend de PARA ahora fuerza una separación rígida y lógica. La UI debe reflejar esto en base a los identificadores devueltos.

### 1. Estado Público (No miembro)

- **Modo**: Sólo lectura.
- **Data Source**: Cargar posts y/o el historial del chat usando `subdelegatesChatId`.
- **Restricción**: Ocultar el input o "composer" hasta que el usuario se afilie.

### 2. Afiliado General (Miembro)

- **Modo**: Lectura y Escritura en grupo General.
- **Lógica**: Utilizar el `delegatesChatId`.
- **Topes**: El backend arrojará un error `InvalidRequest` si el grupo ya contiene 270 usuarios. El UI debe atrapar y mostrar: "La comunidad está en su máxima capacidad.".

### 3. Subdelegados (Miembro de Alto Rango)

- **Modo**: Privilegiado.
- **Lógica**: Cuando un usuario tiene el Rol de Subdelegado, **pierde acceso de lectura/escritura a `delegatesChatId`**. La UI **debe cambiar automáticamente al feed de `subdelegatesChatId`** (máximo 30 personas).
- Si el frontend intenta enviar un mensaje al chat de 270 desde un Subdelegado, fallará abruptamente porque por diseño, estos usuarios habitan la "pecera" pública.

## Mock Server Configuration

Si están trabajando en entorno local:

- Usen la variable `NODE_ENV=development pnpm run start`.
- El mock test chat server `dev-env/src/chat.ts` ya está inyectado con `createBoard` y fuerza matemáticamente el rechazo a agregar miembros por encima del umbral de `270` y `30`.

## Recomendaciones Técnicas Adicionales

- Empleen `chat.bsky.group.addMembers` para el flujo de invitaciones en pruebas.
- Mantengan un **estado global local** (e.g. en Zustand/Redux) de si el usuario es "General" o "Subdelegado" para evitar fetches innecesarios de autorización al desplegar la pantalla de chat (`ChatScreen.tsx`).
