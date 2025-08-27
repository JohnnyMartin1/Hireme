import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

/**
 * Helper to check if a session user has one of the required roles.
 * Returns true if the session exists and the user has an allowed role.
 */
export async function hasRole(req: NextRequest, allowedRoles: string[]): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  return !!userRole && allowedRoles.includes(userRole);
}

/**
 * Middleware to restrict API routes to specific roles.
 * If unauthorized, returns 403.
 */
export function requireRole(roles: string[]) {
  return async function (req: NextRequest) {
    const ok = await hasRole(req, roles);
    if (!ok) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    return NextResponse.next();
  };
}