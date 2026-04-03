// Auth Session API â lightweight endpoint to check auth status
// GET /api/v1/auth/session â returns current user or null

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
}
