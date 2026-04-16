import { NextRequest, NextResponse } from "next/server";

const DAILY_API_KEY = process.env.DAILY_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { roomName, isOwner } = await req.json();

    if (!roomName) {
      return NextResponse.json({ error: "roomName is required" }, { status: 400 });
    }

    if (!DAILY_API_KEY || DAILY_API_KEY === "PLACEHOLDER_DAILY_API_KEY") {
      console.warn("Daily API Key missing. Returning dummy token.");
      return NextResponse.json({ token: "dummy-token-for-dev" });
    }

    // Configurar permisos según el rol (isOwner)
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: !!isOwner,
          enable_publishing: !!isOwner, // Solo dueños pueden transmitir inicialmente
        },
      }),
    };

    const response = await fetch("https://api.daily.co/v1/meeting-tokens", options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate Daily token");
    }

    return NextResponse.json({ token: data.token });
  } catch (error: any) {
    console.error("Daily Token Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
