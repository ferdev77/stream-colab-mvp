# Setup Local

## Requisitos Previos
- Node.js 18+
- cuenta en Firebase (Spark es suficiente).
- cuenta en Daily.co.

## Pasos de Instalación
1. Clonar el repositorio (o inicializarlo en este caso).
2. Ejecutar `npm install`.
3. Configurar `.env.local` con las siguientes claves:
   ```text
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   DAILY_API_KEY=...
   NEXT_PUBLIC_DAILY_DOMAIN=...
   ```
4. Ejecutar `npm run dev`.

## Configuración de Firebase RTDB
Asegúrate de publicar las reglas del archivo `database.rules.json`:

```bash
firebase deploy --only database
```

Reglas aplicadas para este MVP:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "presence": {
      "$roomId": {
        ".read": "auth != null",
        "$uid": {
          ".write": "auth != null && auth.uid === $uid"
        }
      }
    },
    "chat": {
      "$roomId": {
        ".read": "auth != null",
        "$messageId": {
          ".write": "auth != null && !data.exists()"
        }
      }
    },
    "rooms": {
      "$roomId": {
        "stats": {
          ".read": "auth != null"
        }
      }
    }
  }
}
```

## Validación manual final (2 pestañas)
1. Abrir pestaña A y B con usuarios distintos autenticados.
2. En pestaña A elegir `Streamer`; en B elegir `Audience`.
3. Entrar ambos a `/room/main-stage`.
4. Confirmar:
   - A puede activar/desactivar mic y cámara.
   - B no puede publicar mic/cámara.
   - Ambos se ven en `Online`.
   - Chat sincroniza en tiempo real entre ambas pestañas.
5. En ambos clientes enviar mensajes y validar rol (`streamer`/`audience`) en cada burbuja.
6. Cerrar la pestaña B y verificar que `Online` disminuye automáticamente.
7. Reingresar B y confirmar que `Total` no se reinicia.
