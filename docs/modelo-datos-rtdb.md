# Modelo de Datos (RTDB)

## Estructura Jerárquica

```json
{
  "presence": {
    "$room_id": {
      "$user_id": {
        "name": "string",
        "role": "streamer | audience",
        "joinedAt": "timestamp",
        "lastSeen": "timestamp"
      }
    }
  },
  "rooms": {
    "$room_id": {
      "metadata": {
        "title": "string",
        "createdBy": "$user_id",
        "createdAt": "timestamp"
      },
      "stats": {
        "online_count": "number",
        "total_viewers": "number"
      }
    }
  },
  "chat": {
    "$room_id": {
      "$message_id": {
        "userId": "string",
        "userName": "string",
        "text": "string",
        "timestamp": "timestamp"
      }
    }
  }
}
```

## Racional de la estructura

1. **Desacoplamiento:** `presence`, `rooms` y `chat` están en nodos raíz separados para evitar cargar datos innecesarios al escuchar cambios en solo uno de ellos.
2. **Presencia Atómica:** El uso de `$user_id` bajo `$room_id` permite usar `onDisconnect().remove()` de forma limpia.
3. **Escalabilidad:** Al no anidar el chat dentro de la habitación, podemos paginar o archivar mensajes sin afectar la metadata de la sala.
4. **Seguridad:** Facilita la aplicación de reglas de Firebase (e.g., solo permitir escribir en `chat` si el usuario está autenticado).
