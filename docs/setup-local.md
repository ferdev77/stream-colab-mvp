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
   DAILY_API_KEY=...
   DAILY_DOMAIN=...
   ```
4. Ejecutar `npm run dev`.

## Configuración de Firebase RTDB
Asegúrate de configurar las reglas básicas para el MVP:
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```
*(Se refinarán más adelante)*.
