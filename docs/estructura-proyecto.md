# Estructura del Proyecto

Se seguirá una arquitectura modular basada en **Next.js App Router** con separación clara de intereses.

## Carpetas Raíz

```text
/
├── docs/               # Documentación técnica (Arquitectura, Modelos, Planes)
├── public/             # Assets estáticos (Images, Fonts, Favicon)
├── src/
│   ├── app/            # Next.js App Router (Páginas y API Routes)
│   │   ├── (auth)/     # Grupo de rutas: login, register
│   │   ├── (dashboard)/# Grupo de rutas: selección de rol
│   │   ├── api/        # Handlers: daily-token, rtdb-validate
│   │   └── room/[id]/  # Sala de streaming principal
│   ├── components/     # UI Components atómicos y compuestos
│   │   ├── core/       # Botones, Inputs, Modales (Design System Propio)
│   │   ├── layout/     # Header, Footer, Page Containers
│   │   └── room/       # VideoPlayer, Chat, Metrics, Controls
│   ├── context/        # React Contexts (AuthContext, DailyContext)
│   ├── hooks/          # Custom Hooks (useAuth, useDaily, usePresence)
│   ├── lib/            # Clientes y Utilidades (firebase.client, daily.server)
│   ├── service/        # Lógica de negocio / Capa de datos (rtdb.ts, auth.ts)
│   ├── styles/         # CSS Global (globals.css)
│   └── types/          # Definiciones TypeScript Globales
├── .env.local          # Variables de entorno (NO se sube a repo)
├── next.config.mjs     # Configuración de Next.js
├── tailwind.config.ts  # Configuración de Tailwind CSS
└── tsconfig.json       # Configuración de TypeScript
```

## Convenciones de Código
- **Componentes:** Funcionales con TypeScript, usando `export const Name = () => ...`.
- **Estilos:** Tailwind CSS con clases ordenadas y uso de `clsx` / `tailwind-merge`.
- **Naming:** CamelCase para componentes y hooks, kebab-case para archivos y carpetas.
- **Seguridad:** Ninguna lógica sensible en componentes cliente; validación obligatoria en API Routes.
