import { NextRequest, NextResponse } from "next/server";

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const FIREBASE_DATABASE_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const DAILY_DOMAIN = process.env.NEXT_PUBLIC_DAILY_DOMAIN;

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

function parseDailyHost(input: string | undefined) {
  if (!input) return null;

  const withProtocol = input.includes("://") ? input : `https://${input}`;
  const parsed = new URL(withProtocol);
  return parsed.hostname;
}

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

async function verifyFirebaseIdToken(idToken: string) {
  if (!FIREBASE_API_KEY) {
    throw new Error("missing_firebase_api_key");
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
    throw new Error(data.error?.message || "invalid_firebase_id_token");
  }

  return {
    uid: data.users[0].localId,
    email: data.users[0].email,
    displayName: data.users[0].displayName,
  };
}

async function getUserRoleFromRTDB(uid: string, idToken: string): Promise<AppRole> {
  if (!FIREBASE_DATABASE_URL) {
    throw new Error("missing_firebase_database_url");
  }

  const response = await fetch(
    `${FIREBASE_DATABASE_URL}/users/${uid}/role.json?auth=${encodeURIComponent(idToken)}`
  );

  if (!response.ok) {
    throw new Error(`rtdb_role_read_failed_${response.status}`);
  }

  const role = (await response.json()) as unknown;

  if (role == null) {
    const fallbackResponse = await fetch(
      `${FIREBASE_DATABASE_URL}/users/${uid}/role.json?auth=${encodeURIComponent(idToken)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("audience"),
      }
    );

    if (!fallbackResponse.ok) {
      throw new Error(`rtdb_role_default_write_failed_${fallbackResponse.status}`);
    }

    return "audience";
  }

  if (role !== "streamer" && role !== "audience") {
    throw new Error("role_missing_or_invalid");
  }

  return role;
}

export async function GET(req: NextRequest) {
  const roomName = req.nextUrl.searchParams.get("room") || "main-stage";
  const dailyHost = parseDailyHost(DAILY_DOMAIN);
  const idToken = getBearerToken(req);

  const checks: Record<string, unknown> = {
    roomName,
    env: {
      hasDailyApiKey: Boolean(DAILY_API_KEY),
      hasDailyDomain: Boolean(DAILY_DOMAIN),
      dailyHost,
      hasFirebaseApiKey: Boolean(FIREBASE_API_KEY),
      hasFirebaseDbUrl: Boolean(FIREBASE_DATABASE_URL),
    },
  };

  if (!DAILY_API_KEY) {
    checks.daily = { ok: false, error: "missing_daily_api_key" };
    return NextResponse.json({ ok: false, checks }, { status: 500 });
  }

  if (!dailyHost) {
    checks.daily = { ok: false, error: "invalid_daily_domain" };
    return NextResponse.json({ ok: false, checks }, { status: 500 });
  }

  try {
    const roomCheckResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });

    if (!roomCheckResponse.ok) {
      const roomData = await roomCheckResponse.json();
      checks.daily = {
        ok: false,
        error: roomData.info || roomData.error || `daily_room_check_failed_${roomCheckResponse.status}`,
      };
      return NextResponse.json({ ok: false, checks }, { status: 500 });
    }

    const roomData = await roomCheckResponse.json();
    checks.daily = {
      ok: true,
      roomUrl: roomData.url,
      roomDomainMatchesEnv: String(roomData.url || "").includes(`${dailyHost}/`),
    };
  } catch (error) {
    checks.daily = {
      ok: false,
      error: error instanceof Error ? error.message : "daily_check_exception",
    };
    return NextResponse.json({ ok: false, checks }, { status: 500 });
  }

  if (!idToken) {
    checks.auth = { ok: false, error: "missing_authorization_bearer" };
    checks.hint =
      "Llama este endpoint con Authorization: Bearer <Firebase ID Token> para validar rol/token end-to-end.";
    return NextResponse.json({ ok: true, checks });
  }

  try {
    const user = await verifyFirebaseIdToken(idToken);
    const role = await getUserRoleFromRTDB(user.uid, idToken);

    const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: role === "streamer",
          user_name: user.displayName || user.email || user.uid,
          start_video_off: role !== "streamer",
          start_audio_off: role !== "streamer",
        },
      }),
    });

    if (!tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      checks.auth = {
        ok: true,
        uid: user.uid,
        role,
      };
      checks.dailyToken = {
        ok: false,
        error: tokenData.info || tokenData.error || `daily_token_failed_${tokenResponse.status}`,
      };
      return NextResponse.json({ ok: false, checks }, { status: 500 });
    }

    checks.auth = {
      ok: true,
      uid: user.uid,
      role,
    };
    checks.dailyToken = { ok: true };
    return NextResponse.json({ ok: true, checks });
  } catch (error) {
    checks.auth = {
      ok: false,
      error: error instanceof Error ? error.message : "auth_or_role_check_exception",
    };
    return NextResponse.json({ ok: false, checks }, { status: 500 });
  }
}
