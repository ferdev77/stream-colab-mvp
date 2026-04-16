import { NextRequest, NextResponse } from "next/server";

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const FIREBASE_DATABASE_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

interface FirebaseLookupResponse {
  users?: Array<{
    localId?: string;
    displayName?: string;
    email?: string;
  }>;
  error?: {
    message?: string;
  };
}

type AppRole = "streamer" | "audience";

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

async function verifyFirebaseIdToken(idToken: string) {
  if (!FIREBASE_API_KEY) {
    throw new Error("Falta NEXT_PUBLIC_FIREBASE_API_KEY en el servidor");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  const data = (await response.json()) as FirebaseLookupResponse;

  if (!response.ok || !data.users?.[0]?.localId) {
    throw new Error(data.error?.message || "Token de Firebase inválido");
  }

  return {
    uid: data.users[0].localId,
    displayName: data.users[0].displayName,
    email: data.users[0].email,
  };
}

async function getUserRoleFromRTDB(uid: string, idToken: string): Promise<AppRole> {
  if (!FIREBASE_DATABASE_URL) {
    throw new Error("Falta NEXT_PUBLIC_FIREBASE_DATABASE_URL en el servidor");
  }

  const response = await fetch(
    `${FIREBASE_DATABASE_URL}/users/${uid}/role.json?auth=${encodeURIComponent(idToken)}`
  );

  const role = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error("No se pudo validar el rol de usuario");
  }

  if (role !== "streamer" && role !== "audience") {
    throw new Error("El usuario no tiene un rol válido");
  }

  return role;
}

export async function POST(req: NextRequest) {
  try {
    const idToken = getBearerToken(req);
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { uid, displayName, email } = await verifyFirebaseIdToken(idToken);
    const role = await getUserRoleFromRTDB(uid, idToken);
    const { roomName } = await req.json();

    if (!roomName) {
      return NextResponse.json({ error: "roomName is required" }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(roomName)) {
      return NextResponse.json(
        { error: "roomName contiene caracteres inválidos" },
        { status: 400 }
      );
    }

    if (!DAILY_API_KEY || DAILY_API_KEY === "PLACEHOLDER_DAILY_API_KEY") {
      return NextResponse.json(
        { error: "Daily API Key no configurada en el servidor" },
        { status: 500 }
      );
    }

    // 1. Asegurar que la sala existe en Daily.co
    const roomCheckResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (roomCheckResponse.status === 404) {
      console.log(`Sala ${roomName} no encontrada. Creándola...`);
      const createRoomResponse = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roomName,
          privacy: "private",
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
    } else if (!roomCheckResponse.ok) {
      const roomCheckError = await roomCheckResponse.json();
      throw new Error(roomCheckError.info || roomCheckError.error || "Error consultando sala en Daily");
    }

    // 2. Generar el Token de acceso
    const isOwner = role === "streamer";
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
          user_name: displayName || email || uid,
          start_video_off: role !== "streamer",
          start_audio_off: role !== "streamer",
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
