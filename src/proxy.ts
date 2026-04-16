import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy (anteriormente Middleware).
 * Se utiliza para ejecutar lógica antes de que se complete una solicitud.
 */
export function proxy(request: NextRequest) {
  // Nota: En una app real de Firebase, lo ideal sería verificar una Cookie de Session.
  // Pero para este MVP, usaremos la lógica de cliente en AuthProvider.
  
  // Delegamos la protección estricta al AuthProvider en el cliente
  // asegurando compatibilidad con el Edge Runtime y los límites de Firebase Client SDK.

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/room/:path*'],
};
