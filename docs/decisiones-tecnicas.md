# Decisiones Técnicas

## ¿Por qué Daily.co?
Daily.co permite una integración rápida de video con una latencia extremadamente baja. Al usar el "Call Object", podemos construir nuestra propia UI de video sin las limitaciones del componente prebuilt, lo cual es crítico para un "reproductor custom".

## ¿Por qué Firebase RTDB en lugar de Firestore?
1. **Latencia:** RTDB es una base de datos de sockets más rápida que Firestore, ideal para chat y presencia.
2. **Presencia:** El soporte para `onDisconnect` en RTDB es nativo y superior para detectar cierres de navegador sin necesidad de Cloud Functions complejas.
3. **Simplicidad:** Para un MVP de métricas y chat, el modelo JSON plano de RTDB es más ágil.

## ¿Por qué Route Handlers para Tokens?
La seguridad es prioridad. Las API Keys de Daily y los secretos de Firebase (si los hubiera) nunca deben llegar al cliente. El servidor valida la sesión y el rol antes de entregar un token de acceso a la sala.

## Manejo de Estado
Se ha decidido usar **React Context** inicialmente para evitar añadir dependencias de estado global como Zustand o Redux, manteniendo el proyecto ligero. Si la complejidad crece (e.g., múltiples salas, filtros avanzados), se migrará a Zustand.
