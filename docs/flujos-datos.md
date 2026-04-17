# Flujos de Datos y Estados

Este documento detalla la coreografía entre los distintos servicios (Firebase, Daily, Next.js) para garantizar un sistema seguro y reactivo.

## 1. Flujo de Autenticación y Registro
1. **Frontend:** El usuario completa el formulario de Login/Registro.
2. **Firebase Auth:** Procesa la solicitud y devuelve un `ID Token`.
3. **Middleware:** Detecta el token y permite el acceso a rutas protegidas.
4. **Redirección:** Si es la primera vez, el usuario es enviado a `/dashboard` para selección de rol.

## 2. Flujo de Roles y Persistencia
1. **Selección:** El usuario elige `Streamer` o `Audience` en el Dashboard.
2. **RTDB:** Se guarda la preferencia en `/users/$uid/role`.
3. **Contexto:** Se actualiza el `RoleContext` local para habilitar/deshabilitar UI inmediata (ej. botón "Transmitir").

## 3. Flujo de Daily.co (Token & Acceso)
1. **Solicitud:** El cliente llama a `GET /api/daily/token?roomId=$id`.
2. **Backend (Route Handler):**
   - Extrae el UID del usuario de las cookies/header de auth.
   - Verifica el rol del usuario en RTDB.
   - Si es **Streamer**: Llama a Daily API para generar un token con `is_owner: true` y `start_video: true`.
   - Si es **Audience**: Genera un token con `is_owner: false` y `start_video: false`.
3. **Frontend:** Recibe el token y ejecuta `daily.join({ token, url: roomUrl })`.

## 4. Flujo de Presencia en Tiempo Real
1. **Conexión:** Al montar el componente de la sala, se escribe en `/presence/$roomId/$uid`.
2. **Métricas:** RTDB dispara un evento a todos los clientes suscritos a `/presence/$roomId`, actualizando el contador de "Audiencia Online".
3. **Desconexión:** Se configura `.info/connected` para ejecutar `onDisconnect().remove()` sobre el nodo de presencia. Esto garantiza que si el usuario cierra la pestaña, el contador baje automáticamente.

## 5. Estados de Streamer (Contrato de UI)
En la vista de audiencia, cada streamer cae en un único estado:

1. **Offline:** no está conectado a la sala (`/presence/$roomId` no contiene al streamer).
2. **Online:** está conectado a la sala, pero no está transmitiendo video/audio en vivo.
3. **En vivo:** está conectado a la sala **y** transmitiendo en vivo.
4. **ORBITA:** modo de señal compartida entre dos streamers conectados.

Regla de evaluación:
- `En vivo` requiere `Online` + tracks activos.
- `Online` no implica `En vivo`.
- `Offline` implica no conectado.

## 6. ORBITA Efímera (sin rastro)
- El nodo `rooms/$roomId/orbita` se crea solo mientras la sesión ORBITA está activa.
- Al finalizar manualmente ORBITA, se elimina el nodo completo.
- Si el host se desconecta inesperadamente, `onDisconnect().remove()` borra ORBITA automáticamente.
- Si host o guest dejan de estar conectados, la app limpia ORBITA para evitar estado stale.
