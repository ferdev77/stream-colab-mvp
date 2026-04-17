"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onDisconnect, onValue, ref, remove, serverTimestamp, set } from "firebase/database";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Users, 
  Radio,
  PauseCircle,
  PlayCircle,
  WifiOff,
  RefreshCw,
  Link2,
  Sparkles,
  X
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDaily } from "@/context/DailyContext";
import { VideoTile } from "@/components/room/VideoTile";
import { ChatRoom } from "@/components/room/ChatRoom";
import { OrbitaSignal } from "@/components/room/OrbitaSignal";
import { db } from "@/lib/firebase/client";

interface StreamerProfile {
  uid: string;
  name: string;
}

interface OrbitaSession {
  active: boolean;
  hostName: string;
  guestName: string;
  hostUid: string;
  guestUid?: string;
  updatedAt: number;
}

type StreamerConnectionStatus = "live" | "online" | "offline";

export default function RoomPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const { joinRoom, leaveRoom, isJoined, participants, callObject } = useDaily();
  const roomId = id as string;
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const [stayOffline, setStayOffline] = useState(true);
  const [backgroundFilter, setBackgroundFilter] = useState<"none" | "soft" | "strong">("none");
  const [streamerProfiles, setStreamerProfiles] = useState<StreamerProfile[]>([]);
  const [audienceNames, setAudienceNames] = useState<string[]>([]);
  const [streamerOnlineNames, setStreamerOnlineNames] = useState<string[]>([]);
  const [orbitaSession, setOrbitaSession] = useState<OrbitaSession | null>(null);
  const [selectedAudienceStreamerId, setSelectedAudienceStreamerId] = useState<string | null>(null);
  const [isAudiencePreviewOpen, setIsAudiencePreviewOpen] = useState(false);
  const [audiencePreviewMode, setAudiencePreviewMode] = useState<"streamer" | "orbita">("streamer");
  const [selectedOrbitaGuestName, setSelectedOrbitaGuestName] = useState("");
  const hasEnforcedStreamerEntryOffline = useRef(false);
  const previousMediaState = useRef<{ cam: boolean; mic: boolean }>({ cam: true, mic: true });
  const effectiveCamOn = role === "streamer" ? isCamOn : false;
  const effectiveMicOn = role === "streamer" ? isMicOn : false;

  const streamerProfileNames = useMemo(
    () => new Set(streamerProfiles.map((streamer) => streamer.name)),
    [streamerProfiles]
  );

  const streamerNames = useMemo(() => {
    return participants
      .filter((participant) => {
        const participantName = participant.user_name || "Streamer";
        const maybeOwner = (participant as { owner?: boolean }).owner;
        const hasVideoTrack = Boolean(participant.tracks?.video?.persistentTrack);
        const hasAudioTrack = Boolean(participant.tracks?.audio?.persistentTrack);
        const knownStreamerProfile = streamerProfileNames.has(participantName);
        return knownStreamerProfile || maybeOwner || hasVideoTrack || hasAudioTrack;
      })
      .map((participant) => participant.user_name || "Streamer")
      .filter((name, index, array) => array.indexOf(name) === index);
  }, [participants, streamerProfileNames]);

  const streamerStatusList = useMemo(() => {
    return streamerProfiles.map((streamer) => ({
      ...streamer,
      isLive: streamerNames.includes(streamer.name),
    }));
  }, [streamerProfiles, streamerNames]);

  const localParticipantName = useMemo(() => {
    const localParticipant = participants.find((participant) => participant.local);
    return localParticipant?.user_name || user?.displayName || "Streamer";
  }, [participants, user]);

  const liveStreamerParticipants = useMemo(() => {
    return participants.filter((participant) => {
      const participantName = participant.user_name || "Streamer";
      return streamerNames.includes(participantName);
    });
  }, [participants, streamerNames]);

  const localStreamerParticipant = useMemo(() => {
    return participants.find((participant) => participant.local) || null;
  }, [participants]);

  const orbitaFilteredParticipants = useMemo(() => {
    if (!orbitaSession?.active) {
      return liveStreamerParticipants;
    }

    const orbitaParticipants = liveStreamerParticipants.filter((participant) => {
      const participantName = participant.user_name || "Streamer";
      return participantName === orbitaSession.hostName || participantName === orbitaSession.guestName;
    });

    // Fallback: si la sesión ORBITA quedó stale o no matchea nombres,
    // no bloqueamos la visualización de streamers en vivo para audiencia.
    return orbitaParticipants.length > 0 ? orbitaParticipants : liveStreamerParticipants;
  }, [liveStreamerParticipants, orbitaSession]);

  const orbitaHostParticipant = useMemo(() => {
    if (!orbitaSession?.active) return null;
    return liveStreamerParticipants.find(
      (participant) => (participant.user_name || "Streamer") === orbitaSession.hostName
    ) || null;
  }, [liveStreamerParticipants, orbitaSession]);

  const orbitaGuestParticipant = useMemo(() => {
    if (!orbitaSession?.active) return null;
    return liveStreamerParticipants.find(
      (participant) => (participant.user_name || "Streamer") === orbitaSession.guestName
    ) || null;
  }, [liveStreamerParticipants, orbitaSession]);

  const isOrbitaDualLive = Boolean(
    isJoined && orbitaSession?.active && orbitaHostParticipant && orbitaGuestParticipant
  );

  const orbitaPairNames = useMemo(() => {
    if (!orbitaSession?.active) {
      return new Set<string>();
    }

    return new Set([orbitaSession.hostName, orbitaSession.guestName]);
  }, [orbitaSession]);

  const audienceStreamerStatusList = useMemo(() => {
    return streamerStatusList.map((streamer) => {
      const isConnected = streamerOnlineNames.includes(streamer.name);
      const status: StreamerConnectionStatus =
        isConnected && streamer.isLive
          ? "live"
          : isConnected
            ? "online"
            : "offline";
      return {
        ...streamer,
        status,
      };
    });
  }, [streamerStatusList, streamerOnlineNames]);

  const audienceOrbitaEntry = useMemo(() => {
    if (!orbitaSession?.active) {
      return null;
    }

    const host = audienceStreamerStatusList.find((streamer) => streamer.name === orbitaSession.hostName) || null;
    const guest = audienceStreamerStatusList.find((streamer) => streamer.name === orbitaSession.guestName) || null;

    if (!host || !guest) {
      return null;
    }

    return {
      id: `${host.uid}-${guest.uid}`,
      host,
      guest,
    };
  }, [audienceStreamerStatusList, orbitaSession]);

  const audienceOnlineStreamers = useMemo(() => {
    return audienceStreamerStatusList.filter(
      (streamer) => streamer.status === "online" && !orbitaPairNames.has(streamer.name)
    );
  }, [audienceStreamerStatusList, orbitaPairNames]);

  const audienceLiveStreamers = useMemo(() => {
    return audienceStreamerStatusList.filter(
      (streamer) => streamer.status === "live" && !orbitaPairNames.has(streamer.name)
    );
  }, [audienceStreamerStatusList, orbitaPairNames]);

  const audienceOfflineStreamers = useMemo(() => {
    return audienceStreamerStatusList.filter((streamer) => streamer.status === "offline");
  }, [audienceStreamerStatusList]);

  const streamerLiveRows = useMemo(
    () => audienceStreamerStatusList.filter((streamer) => streamer.status === "live"),
    [audienceStreamerStatusList]
  );

  const streamerOnlineRows = useMemo(
    () => audienceStreamerStatusList.filter((streamer) => streamer.status === "online"),
    [audienceStreamerStatusList]
  );

  const selectedAudienceStreamerProfile = useMemo(() => {
    if (!selectedAudienceStreamerId) return null;
    return audienceStreamerStatusList.find((streamer) => streamer.uid === selectedAudienceStreamerId) || null;
  }, [audienceStreamerStatusList, selectedAudienceStreamerId]);

  const selectedAudienceParticipant = useMemo(() => {
    if (role !== "audience" || !selectedAudienceStreamerId) {
      return null;
    }

    return (
      orbitaFilteredParticipants.find((participant) => participant.user_id === selectedAudienceStreamerId) ||
      orbitaFilteredParticipants.find(
        (participant) =>
          selectedAudienceStreamerProfile != null &&
          (participant.user_name || "Streamer") === selectedAudienceStreamerProfile.name
      ) ||
      null
    );
  }, [role, orbitaFilteredParticipants, selectedAudienceStreamerId, selectedAudienceStreamerProfile]);

  const orbitaSelectableStreamers = useMemo(() => {
    return audienceStreamerStatusList.filter(
      (streamer) => streamer.name !== localParticipantName && streamer.status !== "offline"
    );
  }, [audienceStreamerStatusList, localParticipantName]);

  const orbitaGuestOptions = useMemo(
    () => orbitaSelectableStreamers.map((streamer) => streamer.name),
    [orbitaSelectableStreamers]
  );

  const effectiveOrbitaGuestName = useMemo(() => {
    if (orbitaGuestOptions.length === 0) {
      return "";
    }

    return orbitaGuestOptions.includes(selectedOrbitaGuestName)
      ? selectedOrbitaGuestName
      : orbitaGuestOptions[0];
  }, [orbitaGuestOptions, selectedOrbitaGuestName]);

  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      if (!snapshot.exists()) {
        setStreamerProfiles([]);
        return;
      }

      const usersData = snapshot.val() as Record<string, { name?: string; role?: string }>;
      const streamers = Object.entries(usersData)
        .filter(([, value]) => value?.role === "streamer")
        .map(([uid, value]) => ({
          uid,
          name: value?.name || "Streamer",
        }));

      setStreamerProfiles(streamers);
    });

    return () => unsubscribeUsers();
  }, []);

  useEffect(() => {
    const presenceRef = ref(db, `presence/${roomId}`);
    const unsubscribePresence = onValue(presenceRef, (snapshot) => {
      if (!snapshot.exists()) {
        setAudienceNames([]);
        setStreamerOnlineNames([]);
        return;
      }

      const presenceData = snapshot.val() as Record<string, { name?: string; role?: string }>;
      const viewers = Object.values(presenceData)
        .filter((entry) => entry?.role === "audience")
        .map((entry) => entry?.name || "Audiencia")
        .filter((name, index, array) => array.indexOf(name) === index);

      setAudienceNames(viewers);

      const connectedStreamers = Object.values(presenceData)
        .filter((entry) => entry?.role === "streamer")
        .map((entry) => entry?.name || "Streamer")
        .filter((name, index, array) => array.indexOf(name) === index);

      setStreamerOnlineNames(connectedStreamers);
    });

    return () => unsubscribePresence();
  }, [roomId]);

  useEffect(() => {
    const orbitaRef = ref(db, `rooms/${roomId}/orbita`);
    const unsubscribeOrbita = onValue(orbitaRef, (snapshot) => {
      if (!snapshot.exists()) {
        setOrbitaSession(null);
        return;
      }

      const data = snapshot.val() as Partial<OrbitaSession>;
      if (!data.active || !data.hostName || !data.guestName || !data.hostUid) {
        setOrbitaSession(null);
        return;
      }

      setOrbitaSession({
        active: true,
        hostName: data.hostName,
        guestName: data.guestName,
        hostUid: data.hostUid,
        guestUid: data.guestUid,
        updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
      });
    });

    return () => unsubscribeOrbita();
  }, [roomId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }

    if (!authLoading && user && !role) {
      router.replace("/dashboard");
      return;
    }

    const shouldJoin = role === "audience" || !stayOffline;

    if (user && role && !isJoined && shouldJoin) {
      joinRoom(roomId);
    }
  }, [authLoading, user, role, roomId, isJoined, stayOffline, joinRoom, router]);

  useEffect(() => {
    hasEnforcedStreamerEntryOffline.current = false;
  }, [roomId, user?.uid, role]);

  const cleanupOrbitaIfNeeded = React.useCallback(async () => {
    if (!user || role !== "streamer" || !orbitaSession?.active) {
      return;
    }

    const isHost = orbitaSession.hostUid === user.uid;
    const isGuestByUid = orbitaSession.guestUid === user.uid;
    const isGuestByName = orbitaSession.guestName === localParticipantName;

    if (isHost || isGuestByUid || isGuestByName) {
      await remove(ref(db, `rooms/${roomId}/orbita`));
    }
  }, [user, role, orbitaSession, localParticipantName, roomId]);

  const hardDisconnectStream = React.useCallback(async () => {
    await cleanupOrbitaIfNeeded();

    if (callObject && isJoined) {
      if (backgroundFilter !== "none") {
        try {
          await callObject.updateInputSettings({
            video: { processor: { type: "none" } },
          });
        } catch (error) {
          console.error("No se pudo limpiar el filtro de fondo:", error);
        }
      }

      try {
        callObject.setLocalVideo(false);
        callObject.setLocalAudio(false);
      } catch (error) {
        console.error("No se pudieron apagar tracks locales antes de salir:", error);
      }
    }

    await leaveRoom();
    setIsCamOn(false);
    setIsMicOn(false);
    setIsStreamPaused(false);
    setBackgroundFilter("none");
  }, [cleanupOrbitaIfNeeded, callObject, isJoined, backgroundFilter, leaveRoom]);

  useEffect(() => {
    if (authLoading || !user || role !== "streamer") {
      return;
    }

    if (hasEnforcedStreamerEntryOffline.current) {
      return;
    }

    hasEnforcedStreamerEntryOffline.current = true;

    if (isJoined && callObject) {
      try {
        if (callObject.localVideo()) {
          callObject.setLocalVideo(false);
        }
        if (callObject.localAudio()) {
          callObject.setLocalAudio(false);
        }
        void callObject.leave();
      } catch (error) {
        console.error("No se pudo forzar entrada offline de streamer:", error);
      }
    }
  }, [authLoading, user, role, isJoined, callObject]);

  const handleLeave = async () => {
    setStayOffline(false);
    await hardDisconnectStream();
    router.push("/dashboard");
  };

  const handleGoOffline = async () => {
    setStayOffline(true);
    await hardDisconnectStream();
  };

  const handleReconnect = () => {
    setStayOffline(false);
  };

  const handleStartOrbita = async () => {
    if (!user || role !== "streamer") return;
    if (!isJoined) {
      handleReconnect();
      return;
    }

    const guestName = effectiveOrbitaGuestName;
    if (!guestName) return;
    const guestUid = orbitaSelectableStreamers.find((streamer) => streamer.name === guestName)?.uid;
    const orbitaRef = ref(db, `rooms/${roomId}/orbita`);

    await set(orbitaRef, {
      active: true,
      hostName: localParticipantName,
      guestName,
      hostUid: user.uid,
      guestUid,
      updatedAt: serverTimestamp(),
    });

    // ORBITA efímera: si el host se corta, se borra automáticamente.
    onDisconnect(orbitaRef).remove();

  };

  const handleStopOrbita = async () => {
    if (!user || role !== "streamer") return;
    if (orbitaSession?.hostUid !== user.uid) return;

    const orbitaRef = ref(db, `rooms/${roomId}/orbita`);
    await onDisconnect(orbitaRef).cancel();
    await remove(orbitaRef);
  };

  useEffect(() => {
    if (!orbitaSession?.active || role !== "streamer" || !isJoined) {
      return;
    }

    const hostOnline = liveStreamerParticipants.some(
      (participant) => (participant.user_name || "Streamer") === orbitaSession.hostName
    );
    const guestOnline = liveStreamerParticipants.some(
      (participant) => (participant.user_name || "Streamer") === orbitaSession.guestName
    );

    if (!hostOnline || !guestOnline) {
      void remove(ref(db, `rooms/${roomId}/orbita`));
    }
  }, [orbitaSession, role, isJoined, liveStreamerParticipants, roomId]);

  const toggleVideo = () => {
    if (!callObject || role !== "streamer") return;
    if (isStreamPaused) return;
    const current = callObject.localVideo();
    callObject.setLocalVideo(!current);
    setIsCamOn(!current);
  };

  const toggleAudio = () => {
    if (!callObject || role !== "streamer") return;
    if (isStreamPaused) return;
    const current = callObject.localAudio();
    callObject.setLocalAudio(!current);
    setIsMicOn(!current);
  };

  const togglePauseStream = () => {
    if (!callObject || role !== "streamer") return;

    if (!isStreamPaused) {
      previousMediaState.current = {
        cam: callObject.localVideo(),
        mic: callObject.localAudio(),
      };
      callObject.setLocalVideo(false);
      callObject.setLocalAudio(false);
      setIsCamOn(false);
      setIsMicOn(false);
      setIsStreamPaused(true);
      return;
    }

    callObject.setLocalVideo(previousMediaState.current.cam);
    callObject.setLocalAudio(previousMediaState.current.mic);
    setIsCamOn(previousMediaState.current.cam);
    setIsMicOn(previousMediaState.current.mic);
    setIsStreamPaused(false);
  };

  const cycleBackgroundFilter = async () => {
    if (!callObject || role !== "streamer" || !isJoined) return;

    const nextFilter =
      backgroundFilter === "none"
        ? "soft"
        : backgroundFilter === "soft"
          ? "strong"
          : "none";

    try {
      if (nextFilter === "none") {
        await callObject.updateInputSettings({
          video: { processor: { type: "none" } },
        });
      } else {
        await callObject.updateInputSettings({
          video: {
            processor: {
              type: "background-blur",
              config: {
                strength: nextFilter === "soft" ? 0.45 : 0.9,
              },
            },
          },
        });
      }

      setBackgroundFilter(nextFilter);
    } catch (error) {
      console.error("Error al aplicar blur de fondo:", error);
    }
  };

  const getStatusDotClass = (status: StreamerConnectionStatus) => {
    if (status === "live") return "bg-red-400";
    if (status === "online") return "bg-emerald-400";
    return "bg-slate-500";
  };

  const getStatusDotFxClass = (status: StreamerConnectionStatus) => {
    if (status !== "live") return "";
    return "animate-pulse shadow-[0_0_10px_rgba(248,113,113,0.95)]";
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "ST";
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-transparent">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20" />
          <div className="relative bg-slate-900 rounded-full w-24 h-24 flex items-center justify-center border border-slate-800">
            <Radio className="w-10 h-10 text-indigo-500 animate-pulse" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Conectando a la sala...</h2>
        <p className="text-slate-500">Preparando transmisión colaborativa</p>
      </div>
    );
  }

  if (!user || !role) {
    return null;
  }

  return (
    <div className={`flex-1 flex flex-col bg-transparent overflow-hidden ${role === "audience" ? "h-[100dvh]" : "h-screen"}`}>
      {role === "streamer" && (
        <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold leading-tight">Sala: {id}</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">En Vivo</span>
              </div>
              {orbitaSession?.active && (
                <div className="mt-1 inline-flex items-center gap-2 px-2 py-1 rounded-md border border-red-500/35 bg-red-500/15 text-[10px] font-bold uppercase tracking-wider text-red-300">
                  <Link2 className="w-3 h-3" />
                  Orbita: {orbitaSession.hostName} + {orbitaSession.guestName}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-800 rounded-2xl px-2 py-1.5">
            <button
              onClick={togglePauseStream}
              className={`p-2 rounded-xl transition-all ${
                isStreamPaused
                  ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
              title={isStreamPaused ? "Reanudar stream" : "Pausar stream"}
            >
              {isStreamPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleAudio}
              className={`p-2 rounded-xl transition-all ${
                isStreamPaused
                  ? "bg-slate-900 text-slate-600"
                  : effectiveMicOn
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-red-500 text-white"
              }`}
              title="Encender o apagar micrófono"
            >
              {effectiveMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-2 rounded-xl transition-all ${
                isStreamPaused
                  ? "bg-slate-900 text-slate-600"
                  : effectiveCamOn
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-red-500 text-white"
              }`}
              title="Encender o apagar cámara"
            >
              {effectiveCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>

            <button
              onClick={cycleBackgroundFilter}
              disabled={!isJoined}
              className={`p-2 rounded-xl transition-all ${
                !isJoined
                  ? "opacity-30 cursor-not-allowed bg-slate-900 text-slate-600"
                  : backgroundFilter === "none"
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : backgroundFilter === "soft"
                      ? "bg-amber-500/90 text-slate-950 hover:bg-amber-400"
                      : "bg-red-500 text-white hover:bg-red-400"
              }`}
              title={`Filtro de fondo: ${backgroundFilter === "none" ? "apagado" : backgroundFilter === "soft" ? "suave" : "fuerte"}`}
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <button
              onClick={orbitaSession?.active ? handleStopOrbita : handleStartOrbita}
              disabled={(orbitaSession?.active ? orbitaSession.hostUid !== user.uid : orbitaGuestOptions.length === 0) || !isJoined}
              className={`p-2 rounded-xl transition-all ${
                orbitaSession?.active
                  ? "bg-amber-500/90 text-slate-950 hover:bg-amber-400"
                  : "bg-red-500/90 text-white hover:bg-red-400"
              } disabled:opacity-35 disabled:cursor-not-allowed`}
              title={orbitaSession?.active ? "Finalizar conexión ORBITA" : "Entrar a la Orbita"}
            >
              <Link2 className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-slate-800 mx-1" />

            <button
              onClick={isJoined ? handleGoOffline : handleReconnect}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isJoined
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
              }`}
              title="Conectar o desconectar sin salir del panel"
            >
              {isJoined ? <WifiOff className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
              <span className="hidden lg:inline">{isJoined ? "Offline" : "Conectar"}</span>
            </button>

            <button
              onClick={handleLeave}
              className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="hidden lg:inline">Salir</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 min-h-0 h-full relative flex flex-col md:flex-row p-4 gap-4 ${role === "streamer" ? "overflow-visible" : "overflow-hidden"}`}>
        {/* Video Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-min gap-4 overflow-y-auto pr-2 custom-scrollbar">
          {role === "audience" && !isAudiencePreviewOpen && (
            <div className="col-span-full rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-4 md:p-5 h-[93vh] min-h-[560px]">
              <div className="grid grid-rows-4 gap-3 h-full">
                <div className="rounded-2xl border border-red-500/25 bg-red-500/8 p-3 flex flex-col min-h-0">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-300 mb-2">Conexiones en la Orbita</h3>
                  <div className="overflow-y-auto custom-scrollbar pr-1">
                    {audienceOrbitaEntry ? (
                      <button
                        onClick={() => {
                          setAudiencePreviewMode("orbita");
                          setIsAudiencePreviewOpen(true);
                        }}
                        className="w-full rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2.5 hover:border-red-400/60 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-10">
                            <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-slate-900 border border-red-500/40 flex items-center justify-center text-[11px] font-bold text-red-200 z-10">
                              {getInitials(audienceOrbitaEntry.host.name)}
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-900 ${getStatusDotClass(audienceOrbitaEntry.host.status)} ${getStatusDotFxClass(audienceOrbitaEntry.host.status)}`} />
                            </div>
                            <div className="absolute left-4 top-0 w-10 h-10 rounded-full bg-slate-900 border border-red-500/40 flex items-center justify-center text-[11px] font-bold text-red-200">
                              {getInitials(audienceOrbitaEntry.guest.name)}
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-900 ${getStatusDotClass(audienceOrbitaEntry.guest.status)} ${getStatusDotFxClass(audienceOrbitaEntry.guest.status)}`} />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-red-200 font-semibold leading-tight break-words">
                              {audienceOrbitaEntry.host.name} + {audienceOrbitaEntry.guest.name}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Abrir señal compartida</p>
                          </div>
                        </div>
                      </button>
                    ) : (
                      <p className="text-xs text-slate-500">Sin conexiones ORBITA activas.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-rose-500/25 bg-rose-500/8 p-3 flex flex-col min-h-0">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300 mb-2">Streamers en vivo</h3>
                  <div className="overflow-y-auto custom-scrollbar pr-1">
                    {audienceLiveStreamers.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {audienceLiveStreamers.map((streamer) => (
                          <button
                            key={streamer.uid}
                            onClick={() => {
                              setSelectedAudienceStreamerId(streamer.uid);
                              setAudiencePreviewMode("streamer");
                              setIsAudiencePreviewOpen(true);
                            }}
                            className="w-[92px] rounded-xl border border-rose-500/30 bg-rose-500/10 px-2 py-2 flex flex-col items-center text-center hover:border-rose-400/60 transition-all"
                          >
                            <div className="relative w-10 h-10 rounded-full bg-slate-900 border border-rose-500/35 flex items-center justify-center text-[11px] font-bold text-rose-200">
                            {getInitials(streamer.name)}
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-900 ${getStatusDotClass(streamer.status)} ${getStatusDotFxClass(streamer.status)}`} />
                            </div>
                            <p className="mt-1 text-xs text-rose-200 font-medium leading-tight break-words">{streamer.name}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No hay streamers en vivo fuera de ORBITA.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-3 flex flex-col min-h-0">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300 mb-2">Streamers online</h3>
                  <div className="overflow-y-auto custom-scrollbar pr-1">
                    {audienceOnlineStreamers.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {audienceOnlineStreamers.map((streamer) => (
                          <button
                            key={streamer.uid}
                            onClick={() => {
                              setSelectedAudienceStreamerId(streamer.uid);
                              setAudiencePreviewMode("streamer");
                              setIsAudiencePreviewOpen(true);
                            }}
                            className="w-[92px] rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 py-2 flex flex-col items-center text-center hover:border-emerald-400/60 transition-all"
                          >
                            <div className="relative w-10 h-10 rounded-full bg-slate-900 border border-emerald-500/35 flex items-center justify-center text-[11px] font-bold text-emerald-200">
                            {getInitials(streamer.name)}
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-900 ${getStatusDotClass(streamer.status)} ${getStatusDotFxClass(streamer.status)}`} />
                            </div>
                            <p className="mt-1 text-xs text-emerald-200 font-medium leading-tight break-words">{streamer.name}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No hay streamers online fuera de ORBITA.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-950/65 p-3 flex flex-col min-h-0">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300 mb-2">Streamers offline</h3>
                  <div className="overflow-y-auto custom-scrollbar pr-1">
                    {audienceOfflineStreamers.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {audienceOfflineStreamers.map((streamer) => (
                          <button
                            key={streamer.uid}
                            onClick={() => {
                              setSelectedAudienceStreamerId(streamer.uid);
                              setAudiencePreviewMode("streamer");
                              setIsAudiencePreviewOpen(true);
                            }}
                            className="w-[92px] rounded-xl border border-slate-700 bg-slate-950/70 px-2 py-2 flex flex-col items-center text-center hover:border-slate-500 transition-all"
                          >
                            <div className="relative w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-300">
                            {getInitials(streamer.name)}
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-900 ${getStatusDotClass(streamer.status)} ${getStatusDotFxClass(streamer.status)}`} />
                            </div>
                            <p className="mt-1 text-xs text-slate-300 font-medium leading-tight break-words">{streamer.name}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No hay streamers offline.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {role === "audience" && isAudiencePreviewOpen && audiencePreviewMode === "orbita" && (
            <div className="col-span-full h-[93vh] min-h-[560px] relative overflow-hidden">
              <button
                onClick={() => setIsAudiencePreviewOpen(false)}
                className="absolute top-2 left-2 z-30 px-4 py-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-bold text-sm"
              >
                Salir
              </button>

              <div className="absolute inset-0 orbit-stars opacity-25 pointer-events-none" />

              <div className="relative h-full w-full flex items-center px-3 md:px-6">
                <div className="w-full relative grid grid-cols-1 lg:grid-cols-[minmax(280px,420px)_1fr_minmax(280px,420px)] gap-6 lg:gap-3 items-center">
                    <div className="w-full max-w-[420px] justify-self-start border border-red-500/35 bg-black/40 p-3 orbita-panel-shell orbita-panel-a lg:col-start-1">
                      <div className="orbita-crt-noise" />
                      <div className="orbita-sweep-line" />
                      <div className="flex items-center justify-between mb-2 px-1">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-red-300">Canal A · {orbitaSession?.hostName || "Streamer A"}</p>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${orbitaHostParticipant ? "bg-red-500/20 text-red-200 border-red-500/40 orbita-onair-badge" : "bg-slate-700/30 text-slate-400 border-slate-600/40"}`}>
                          {orbitaHostParticipant ? "ON AIR" : "OFFLINE"}
                        </span>
                      </div>
                      <div className="px-1 mb-2 text-[9px] uppercase tracking-[0.16em] text-red-200/70 font-semibold flex items-center justify-between">
                        <span>Freq 105.1</span>
                        <span>Lat 42ms</span>
                        <span>{orbitaHostParticipant ? "Link stable" : "Standby"}</span>
                      </div>
                      <div className="w-full max-w-[88%] mx-auto">
                        {orbitaHostParticipant ? (
                          <VideoTile
                            participant={orbitaHostParticipant}
                            isLocal={false}
                            isStreamer
                          />
                        ) : (
                          <div className="aspect-video rounded-2xl border border-slate-700 bg-slate-950 flex flex-col items-center justify-center text-slate-500 text-xs uppercase tracking-wider">
                            Señal A apagada
                          </div>
                        )}
                      </div>
                      <div className="mt-2 rounded-lg border border-red-500/20 bg-black/50 px-2 py-1.5 text-[10px] text-red-200 font-bold uppercase tracking-wider text-center">
                        Transmisor ORBITA A
                        <div className="mt-1.5 flex items-end justify-center gap-1 h-4">
                          {[20, 48, 36, 58, 32, 46, 24, 52].map((height, index) => (
                            <span
                              key={`orbita-a-${index}`}
                              className="w-1 rounded-sm bg-gradient-to-t from-red-500 to-orange-300 orbita-eq-bar"
                              style={{ height: `${height}%`, animationDelay: `${index * 0.08}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="w-full max-w-[420px] justify-self-end border border-orange-500/35 bg-black/40 p-3 orbita-panel-shell orbita-panel-b lg:col-start-3">
                      <div className="orbita-crt-noise" />
                      <div className="orbita-sweep-line orbita-sweep-line-delay" />
                      <div className="flex items-center justify-between mb-2 px-1">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-orange-300">Canal B · {orbitaSession?.guestName || "Streamer B"}</p>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${orbitaGuestParticipant ? "bg-orange-500/20 text-orange-200 border-orange-500/40 orbita-onair-badge" : "bg-slate-700/30 text-slate-400 border-slate-600/40"}`}>
                          {orbitaGuestParticipant ? "ON AIR" : "OFFLINE"}
                        </span>
                      </div>
                      <div className="px-1 mb-2 text-[9px] uppercase tracking-[0.16em] text-orange-200/70 font-semibold flex items-center justify-between">
                        <span>Freq 97.7</span>
                        <span>Lat 39ms</span>
                        <span>{orbitaGuestParticipant ? "Link stable" : "Standby"}</span>
                      </div>
                      <div className="w-full max-w-[88%] mx-auto">
                        {orbitaGuestParticipant ? (
                          <VideoTile
                            participant={orbitaGuestParticipant}
                            isLocal={false}
                            isStreamer
                          />
                        ) : (
                          <div className="aspect-video rounded-2xl border border-slate-700 bg-slate-950 flex flex-col items-center justify-center text-slate-500 text-xs uppercase tracking-wider">
                            Señal B apagada
                          </div>
                        )}
                      </div>
                      <div className="mt-2 rounded-lg border border-orange-500/20 bg-black/50 px-2 py-1.5 text-[10px] text-orange-200 font-bold uppercase tracking-wider text-center">
                        Transmisor ORBITA B
                        <div className="mt-1.5 flex items-end justify-center gap-1 h-4">
                          {[22, 42, 34, 56, 28, 44, 26, 50].map((height, index) => (
                            <span
                              key={`orbita-b-${index}`
                              }
                              className="w-1 rounded-sm bg-gradient-to-t from-orange-500 to-fuchsia-300 orbita-eq-bar"
                              style={{ height: `${height}%`, animationDelay: `${index * 0.08}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="hidden lg:flex lg:col-start-2 relative items-center justify-center h-full">
                      <OrbitaSignal />
                    </div>
                  </div>
                </div>
            </div>
          )}

          {role === "audience" && isAudiencePreviewOpen && audiencePreviewMode === "streamer" && (
            <div className="col-span-full h-[93vh] min-h-[560px] rounded-3xl border border-slate-800 bg-slate-900/45 backdrop-blur-md p-4 md:p-5">
              <div className="flex justify-start items-start h-full">
                <div className="w-full sm:w-[60%] lg:w-[40%] xl:w-[25%] space-y-2">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-300">Vista seleccionada</p>
                    <button
                      onClick={() => setIsAudiencePreviewOpen(false)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {selectedAudienceParticipant ? (
                    <VideoTile
                      participant={selectedAudienceParticipant}
                      isLocal={false}
                      isStreamer
                    />
                  ) : (
                    <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-400">
                      Señal no disponible para este streamer.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {role === "streamer" && (
            <div className="col-span-full min-h-[78vh] flex flex-col items-start justify-start gap-3">
              {isJoined && localStreamerParticipant ? (
                <div className="w-full flex flex-col md:flex-row gap-3 items-start">
                  <div className="w-full max-w-[360px] min-h-[220px] rounded-xl border border-amber-500/30 bg-slate-900/60 backdrop-blur-md p-2.5 text-left shrink-0">
                    <div className="w-full h-full rounded-lg overflow-hidden border border-slate-800">
                      <VideoTile
                        key={localStreamerParticipant.user_id}
                        participant={localStreamerParticipant}
                        isLocal
                        isStreamer
                      />
                    </div>
                  </div>

                  <div className="w-full max-w-[360px] min-h-[220px] rounded-xl border border-red-500/30 bg-red-500/8 backdrop-blur-md p-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-300 mb-2">Crear ORBITA</h4>
                    <p className="text-xs text-slate-400 mb-3">Elegí streamer online o en vivo para señal compartida.</p>

                    <select
                      value={effectiveOrbitaGuestName}
                      onChange={(event) => setSelectedOrbitaGuestName(event.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 mb-3"
                    >
                      {orbitaGuestOptions.length === 0 && <option value="">Sin streamers disponibles</option>}
                      {orbitaGuestOptions.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>

                    <button
                      onClick={orbitaSession?.active ? handleStopOrbita : handleStartOrbita}
                      disabled={(orbitaSession?.active ? orbitaSession.hostUid !== user.uid : orbitaGuestOptions.length === 0)}
                      className="w-full rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm px-4 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {orbitaSession?.active ? "Finalizar ORBITA" : "Crear ORBITA"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-[360px] min-h-[220px] rounded-xl border border-amber-500/30 bg-slate-900/60 backdrop-blur-md p-5 text-left shrink-0">
                  <div className="flex flex-col h-full justify-between gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/35 flex items-center justify-center shrink-0">
                      <WifiOff className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white text-base font-bold mb-1">Modo offline activado</h3>
                      <p className="text-slate-400 text-sm">Estás dentro del panel, pero tu transmisión no está conectada.</p>
                    </div>
                    <button
                      onClick={handleReconnect}
                      className="w-full px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Conectar stream
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-auto translate-y-[65px] w-full flex flex-col gap-3">
                {isJoined && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/8 p-3 min-h-[120px]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-300">Mi ORBITA</h4>
                    </div>

                    {orbitaSession?.active ? (
                      <div className="space-y-1">
                        <p className="text-sm text-red-200 font-semibold">{orbitaSession.hostName} + {orbitaSession.guestName}</p>
                        <p className="text-xs text-slate-400">Señal compartida activa</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No tenés una órbita activa.</p>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 p-3 min-h-[150px]">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300 mb-2">Streamers en vivo</h4>
                  {streamerLiveRows.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {streamerLiveRows.map((streamer) => (
                        <div key={streamer.uid} className="w-[86px] rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-2 flex flex-col items-center text-center">
                          <div className="relative w-9 h-9 rounded-full bg-slate-900 border border-rose-500/35 flex items-center justify-center text-[10px] font-bold text-rose-200">
                            {getInitials(streamer.name)}
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-900 ${getStatusDotClass(streamer.status)} ${getStatusDotFxClass(streamer.status)}`} />
                          </div>
                          <p className="mt-1 text-[11px] text-rose-200 font-medium leading-tight break-words">{streamer.name}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Sin streamers en vivo.</p>
                  )}
                </div>

                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-3 min-h-[150px]">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300 mb-2">Streamers online</h4>
                  {streamerOnlineRows.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {streamerOnlineRows.map((streamer) => (
                        <div key={streamer.uid} className="w-[86px] rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-2 flex flex-col items-center text-center">
                          <div className="relative w-9 h-9 rounded-full bg-slate-900 border border-emerald-500/35 flex items-center justify-center text-[10px] font-bold text-emerald-200">
                            {getInitials(streamer.name)}
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-900 ${getStatusDotClass(streamer.status)} ${getStatusDotFxClass(streamer.status)}`} />
                          </div>
                          <p className="mt-1 text-[11px] text-emerald-200 font-medium leading-tight break-words">{streamer.name}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Sin streamers online.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {isJoined && !isOrbitaDualLive && role === "audience" && orbitaFilteredParticipants.length === 0 && null}
        </div>

        {/* Sidebar / Chat Area */}
        <div className={`relative z-30 w-full md:w-80 lg:w-96 min-h-0 shrink-0 flex ${role === "audience" ? "h-full self-stretch md:h-[calc(100dvh-2rem)] max-h-full" : "h-full overflow-visible"}`}>
          <div className={`flex-1 min-h-0 h-full grid grid-rows-[auto_auto_minmax(0,1fr)] ${role === "streamer" ? "gap-1.5" : "gap-3"}`}>
            <div className={`grid grid-cols-1 sm:grid-cols-3 shrink-0 ${role === "streamer" ? "gap-1" : "gap-2"}`}>
              <div className={`flex items-center gap-2 px-3 rounded-full bg-slate-900 border border-slate-800 text-slate-300 ${role === "streamer" ? "py-1" : "py-2"}`}>
                <Radio className="w-4 h-4 text-red-400" />
                <span className="text-xs font-medium truncate">
                  {streamerStatusList.filter((streamer) => streamer.isLive).length} Streamers en vivo
                </span>
              </div>
              <div className={`flex items-center gap-2 px-3 rounded-full bg-slate-900 border border-slate-800 text-slate-300 ${role === "streamer" ? "py-1" : "py-2"}`}>
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-medium truncate">{audienceNames.length} Audiencia conectada</span>
              </div>
              {role === "audience" ? (
                <button
                  onClick={handleLeave}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-red-600/90 hover:bg-red-500 border border-red-400/30 text-white text-xs font-bold transition-all"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span className="truncate">Salir</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                  <PhoneOff className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-medium truncate">Control streamer</span>
                </div>
              )}
            </div>
            <div className={`rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-md shrink-0 ${role === "streamer" ? "p-2.5" : "p-4"}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Audiencia</h3>
                <span className="text-xs text-slate-400">{audienceNames.length} viewers</span>
              </div>
              <div className={`space-y-1.5 overflow-y-auto custom-scrollbar pr-1 ${role === "streamer" ? "max-h-16" : "max-h-28"}`}>
                {audienceNames.map((viewerName) => (
                  <div
                    key={viewerName}
                    className="rounded-lg border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
                  >
                    {viewerName}
                  </div>
                ))}
                {audienceNames.length === 0 && (
                  <p className="text-xs text-slate-500">Sin audiencia conectada por ahora.</p>
                )}
              </div>
            </div>
            <div className={`min-h-0 w-full ${role === "audience" ? "overflow-hidden h-[calc(108dvh-19rem)] min-h-[580px]" : "overflow-visible h-[107%] min-h-[660px]"}`}>
              <div className="w-full h-full">
                <ChatRoom roomId={roomId} />
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
