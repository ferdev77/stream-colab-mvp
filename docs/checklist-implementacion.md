# Checklist de Implementación

## Fase 1: Setup
- [ ] Inicialización Proyecto Next.js
- [ ] Instalación de Dependencias Core
- [ ] Estructura de Carpetas

## Fase 2: Auth & Guardias
- [ ] Configuración Firebase Client
- [ ] Auth Hook (`useAuth`)
- [ ] Página Login / Registro
- [ ] Redirección por Roles

## Fase 3: Sala & Daily
- [ ] Daily API Token Route Handler
- [ ] `DailyProvider` / Context
- [ ] Componente `LocalVideo`
- [ ] Componente `RemoteVideo` (Grilla dinámica)

## Fase 4: Chat & Presencia (Realtime)
- [ ] RTDB Listener `Chat`
- [ ] RTDB Listener `Presence`
- [ ] Lógica `onDisconnect` para Streamers/Audiencia

## Fase 5: Métricas & Pulido
- [ ] Contador Online
- [ ] Contador Total (Persistente)
- [ ] UI Refinada con Tailwind
