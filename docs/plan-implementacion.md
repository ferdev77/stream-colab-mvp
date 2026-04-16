# Plan de Implementación: Streaming Colaborativo MVP

Este documento detalla los pasos para construir el MVP de streaming colaborativo, asegurando una arquitectura escalable y un flujo de trabajo ordenado.

## Resumen del Proyecto
Construcción de una plataforma donde múltiples streamers pueden compartir video a una audiencia, con chat y métricas en tiempo real, utilizando Next.js, Firebase y Daily.co.

## Decisiones Técnicas Clave
- **Next.js App Router:** Para una navegación eficiente y una mejor integración de Route Handlers.
- **Firebase RTDB (Realtime Database):** Ideal para presencia y chat debido a su baja latencia y soporte nativo de desconexión.
- **Daily.co Call Object:** Se evitará el Prebuilt UI para tener control total sobre el reproductor de video (Mini reproductor custom).
- **Zustand (opcional/context):** Manejo de estado simple para roles y sesión de usuario.

---

## Fases de Implementación

### Fase 1: Setup y Configuración (Terminal)
1. Inicializar proyecto Next.js (`create-next-app`).
2. Instalar dependencias core: `firebase`, `daily-js`, `lucide-react`, `clsx`, `tailwind-merge`.
3. Configurar variables de entorno (`.env.local`).
4. Estructurar carpetas iniciales.

### Fase 2: Autenticación y Roles
1. Configurar Firebase Auth (Email/Password).
2. Crear páginas de Login y Registro.
3. Implementar Modal o Página de selección de rol (Streamer vs Audience).
4. Proteger rutas usando Middleware de Next.js o HOCs de React.

### Fase 3: Integración de Daily (Video Core)
1. Crear Route Handler `/api/daily/token` para generar tokens seguros.
2. Implementar hook `useDaily` para manejar la inicialización del objeto de llamada.
3. Crear el componente `VideoPlayer` (Mini reproductor custom).
4. Implementar lógica de conexión y desconexión.

### Fase 4: Realtime Features (RTDB)
1. Implementar sistema de chat modular.
2. Configurar sistema de presencia (`.info/connected`).
3. Crear indicadores de métricas (Online count, Total viewers).

### Fase 5: UI/UX y Pulido
1. Diseñar el Dashboard de la sala (Layout dividido: Video + Chat + Métricas).
2. Refinar botones de conectar/desconectar.
3. Implementar feedback visual (loading states, errores).

---

## User Review Required

> [!IMPORTANT]
> **Daily.co API Key:** Es necesaria una cuenta en Daily.co para obtener la API Key. Sin esto, la generación de tokens server-side fallará.
> **Firebase Config:** Necesitaremos los parámetros de configuración de tu proyecto Firebase (apiKey, authDomain, databaseURL, etc.).

> [!WARNING]
> Este MVP asume una única sala compartida para simplificar. La lógica de múltiples salas está contemplada en la arquitectura pero no será el foco inicial.

---

## Open Questions

1. **Nombre del Proyecto:** ¿Quieres que inicialice el proyecto en el directorio actual (`.`) con algún nombre específico?
2. **Setup de Firebase:** ¿Prefieres que use el MCP de Firebase para intentar configurar recursos o ya tienes un proyecto listo para conectar las keys?
3. **Daily API Key:** ¿Tienes ya una API Key de Daily.co?

---

## Checklist de Validación

- [ ] **Auth:** Login y Registro funcionales.
- [ ] **Roles:** Selección persistente (Streamer/Audience).
- [ ] **Acceso:** Rutas protegidas según sesión.
- [ ] **Streaming:** Streamer transmite, Audiencia solo ve.
- [ ] **Multi-streamer:** Varios streamers visibles simultáneamente.
- [ ] **Chat:** Envío y recepción de mensajes en tiempo real.
- [ ] **Métricas:** Online count y Total viewers precisos.
- [ ] **Controles:** Botón de Conectar / Desconectar funcional.

---

## Verification Plan

### Automated Tests
- No se proponen tests unitarios pesados para este MVP, se prioriza la validación visual y funcional en vivo.

### Manual Verification
1. Abrir dos pestañas: una como Streamer y otra como Audiencia.
2. Verificar que el Streamer ve su cámara y la Audiencia ve el stream.
3. Verificar que el chat se sincroniza.
4. Cerrar la pestaña del Streamer y verificar que el contador de audiencia online baja.
