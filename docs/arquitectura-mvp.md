# Arquitectura MVP

## Stack Tecnológico
- **Frontend:** Next.js 14+ (App Router).
- **Estilos:** Tailwind CSS.
- **Auth:** Firebase Auth.
- **Realtime / State:** Firebase Realtime Database.
- **Video En Vivo:** Daily.co Custom SDK (Call Object mode).

## Flujos Principales

### Auth & Roles
1. Usuario ingresa -> Landing.
2. Login/Success -> Redirección a `/dashboard`.
3. Dashboard -> Selección de Rol (`Streamer` | `Audience`).
4. Selección se guarda en el estado global (Context/Zustand) y se valida en la entrada a la sala.

### Sala de Streaming
1. Usuario entra a `/room/[id]`.
2. El sistema pide un `Daily Access Token` al backend (Route Handler).
3. Backend valida rol:
   - Si es `Streamer`: Genera token con permisos de `owner` y `start_video: true`.
   - Si es `Audience`: Genera token con `start_video: false` y solo permisos de visualización.
4. Cliente inicializa `DailyCall` usando el token.

### Presencia y Métricas
1. Al conectar a la sala, se registra en RTDB: `/presence/[room_id]/[user_id]`.
2. Se usa `.info/connected` para limpiar el registro al desconectar (detectar cierres de pestaña).
3. El contador de "Audiencia Online" es un listener sobre `/presence/[room_id]`.
4. "Audiencia Total" es un contador persistente en `/rooms/[room_id]/metrics/total_viewers` que se incrementa cada vez que un usuario nuevo entra.
