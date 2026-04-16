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

    // 1. Asegurar que la sala existe en Daily.co
    const roomCheckResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (!roomCheckResponse.ok) {
      console.log(`Sala ${roomName} no encontrada. Creándola...`);
      const createRoomResponse = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roomName,
          privacy: "public", // Para el MVP usamos salas públicas con acceso controlado por token
          properties: {
            enable_chat: true,
            start_video_off: false,
            start_audio_off: false,
          },
        }),
      });

      if (!createRoomResponse.ok) {
        const createError = await createRoomResponse.json();
        console.error("Error al crear sala:", createError);
        throw new Error(createError.info || createError.error || "Error al crear la sala en Daily");
      }
    }

    // 2. Generar el Token de acceso
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
          // Eliminada propiedad inválida 'enable_publishing' que causaba error 500
        },
      }),
    };

    const response = await fetch("https://api.daily.co/v1/meeting-tokens", options);
    const data = await response.json();

    if (!response.ok) {
      console.error("Daily API Error:", data);
      throw new Error(data.info || data.error || "Failed to generate Daily token");
    }

    return NextResponse.json({ token: data.token });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    console.error("Daily Token Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
