import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/Auth/AuthServer";
import { MissingAblyKeyError, getAblyRest } from "@/lib/Realtime/AblyServer";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const rest = getAblyRest();
    const tokenRequest = await rest.auth.createTokenRequest({
      clientId: `user:${user.userId}`,
    });

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("Ably token error:", error);
    if (error instanceof MissingAblyKeyError) {
      return NextResponse.json(
        { error: "Ably API key missing" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }
}
