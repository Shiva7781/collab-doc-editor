import { getServerSession } from "next-auth";
import { authOptions } from "./config";
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

// For WebSocket auth: verify a JWT token passed as a query param
export async function verifyWsToken(token: string): Promise<{ userId: string; name: string; email: string } | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || !payload.name || !payload.email) return null;
    return {
      userId: payload.sub,
      name: payload.name as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

// Generate a short-lived WS token for a user
export async function generateWsToken(userId: string, name: string, email: string): Promise<string> {
  const { SignJWT } = await import("jose");
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  return new SignJWT({ name, email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime("1h")
    .sign(secret);
}

// Extract user from request (for API routes)
export async function getUserFromRequest(_req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return session.user;
}
