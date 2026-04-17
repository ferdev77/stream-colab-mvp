"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onValue, ref, remove, serverTimestamp, set } from "firebase/database";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Users, 
  LayoutGrid,
  Radio,
  PauseCircle,
  PlayCircle,
  WifiOff,
  RefreshCw,
  Link2,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDaily } from "@/context/DailyContext";
import { VideoTile } from "@/components/room/VideoTile";
import { ChatRoom } from "@/components/room/ChatRoom";
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
  const [orbitaSession, setOrbitaSession] = useState<OrbitaSession | null>(null);
  const [showOrbitaPicker, setShowOrbitaPicker] = useState(false);
  const [selectedOrbitaGuestName, setSelectedOrbitaGuestName] = useState("");
  const [selectedAudienceStreamerId, setSelectedAudienceStreamerId] = useState<string | null>(null);
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

  const visibleParticipants = useMemo(() => {
    if (role !== "audience") {
      return participants;
    }

    return participants.filter((participant) => {
      const participantName = participant.user_name || "Streamer";
      return streamerNames.includes(participantName);
    });
  }, [participants, role, streamerNames]);

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

  const selectedAudienceParticipant = useMemo(() => {
    if (role !== "audience") {
      return null;
    }

    return orbitaFilteredParticipants.find(
      (participant) => participant.user_id === selectedAudienceStreamerId
    ) || orbitaFilteredParticipants[0] || null;
  }, [role, orbitaFilteredParticipants, selectedAudienceStreamerId]);

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

  const individualStreamerStatusList = useMemo(() => {
    if (!orbitaSession?.active) {
      return streamerStatusList;
    }

    return streamerStatusList.filter(
      (streamer) => streamer.name !== orbitaSession.hostName && streamer.name !== orbitaSession.guestName
    );
  }, [streamerStatusList, orbitaSession]);

  const orbitaGuestOptions = useMemo(() => {
    return streamerStatusList
      .filter((streamer) => streamer.isLive && streamer.name !== localParticipantName)
      .map((streamer) => streamer.name);
  }, [streamerStatusList, localParticipantName]);

  const effectiveOrbitaGuestName = useMemo(() => {
    if (orbitaGuestOptions.length === 0) {
      return "";
    }

    if (orbitaGuestOptions.includes(selectedOrbitaGuestName)) {
      return selectedOrbitaGuestName;
    }

    return orbitaGuestOptions[0];
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
        return;
      }

      const presenceData = snapshot.val() as Record<string, { name?: string; role?: string }>;
      const viewers = Object.values(presenceData)
        .filter((entry) => entry?.role === "audience")
        .map((entry) => entry?.name || "Audiencia")
        .filter((name, index, array) => array.indexOf(name) === index);

      setAudienceNames(viewers);
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

  const cleanupOrbitaIfNeeded = async () => {
    if (!user || role !== "streamer" || !orbitaSession?.active) {
      return;
    }

    const isHost = orbitaSession.hostUid === user.uid;
    const isGuestByUid = orbitaSession.guestUid === user.uid;
    const isGuestByName = orbitaSession.guestName === localParticipantName;

    if (isHost || isGuestByUid || isGuestByName) {
      await remove(ref(db, `rooms/${roomId}/orbita`));
    }
  };

  const hardDisconnectStream = async () => {
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
  };

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
    const guestUid = streamerStatusList.find((streamer) => streamer.name === guestName)?.uid;

    await set(ref(db, `rooms/${roomId}/orbita`), {
      active: true,
      hostName: localParticipantName,
      guestName,
      hostUid: user.uid,
      guestUid,
      updatedAt: serverTimestamp(),
    });

    setShowOrbitaPicker(false);
  };

  const handleStopOrbita = async () => {
    if (!user || role !== "streamer") return;
    if (orbitaSession?.hostUid !== user.uid) return;

    await remove(ref(db, `rooms/${roomId}/orbita`));
  };

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
    <div className="flex-1 flex flex-col bg-transparent overflow-hidden h-screen">
      {/* Header Bar */}
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

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-slate-400">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
              <Radio className="w-4 h-4 text-red-400" />
              <span className="text-xs font-medium">
                {streamerStatusList.filter((streamer) => streamer.isLive).length} Streamers en vivo
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-medium">
                {audienceNames.length} Audiencia conectada
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
              <LayoutGrid className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-medium">Grid Mode</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-min gap-4 overflow-y-auto pr-2 custom-scrollbar">
          {isOrbitaDualLive && orbitaHostParticipant && orbitaGuestParticipant && (
            <div className="col-span-full relative rounded-3xl border border-red-500/25 bg-black/40 p-4 md:p-5 backdrop-blur-md overflow-hidden">
              <div className="absolute inset-0 pointer-events-none orbit-stars opacity-30" />
              <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-red-300">Modo ORBITA</p>
                  <h3 className="text-white text-lg font-bold">Dual panel en vivo</h3>
                </div>
                <div className="px-3 py-1 rounded-full border border-red-400/40 bg-red-500/15 text-[10px] uppercase tracking-wider font-bold text-red-200 animate-pulse">
                  ON AIR
                </div>
              </div>

              <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="relative rounded-2xl border border-red-500/30 bg-slate-950/70 p-3 overflow-hidden">
                  <div className="absolute left-2 top-2 w-4 h-4 border-l border-t border-red-400/60" />
                  <div className="absolute right-2 top-2 w-4 h-4 border-r border-t border-red-400/60" />
                  <div className="absolute left-2 bottom-2 w-4 h-4 border-l border-b border-red-400/60" />
                  <div className="absolute right-2 bottom-2 w-4 h-4 border-r border-b border-red-400/60" />
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-white truncate pr-2">{orbitaSession?.hostName || "Streamer A"}</p>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-red-300">Canal A</span>
                  </div>
                  <VideoTile participant={orbitaHostParticipant} isLocal={orbitaHostParticipant.local} isStreamer />
                  <div className="mt-3 rounded-xl border border-red-500/25 bg-black/50 px-3 py-2">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
                      <span className="text-red-300 font-bold">Orbita 105.1</span>
                      <span className="px-2 py-0.5 rounded bg-red-500/25 text-red-200 font-bold">ON AIR</span>
                    </div>
                    <div className="mt-2 flex items-end gap-1 h-6">
                      {[20, 45, 28, 60, 34, 50, 18, 55, 30, 42].map((height, index) => (
                        <span
                          key={`eq-a-${index}`}
                          className="w-1 rounded-sm bg-gradient-to-t from-red-500 to-orange-300 animate-pulse"
                          style={{ height: `${height}%`, animationDelay: `${index * 0.08}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="relative rounded-2xl border border-red-500/30 bg-slate-950/70 p-3 overflow-hidden">
                  <div className="absolute left-2 top-2 w-4 h-4 border-l border-t border-red-400/60" />
                  <div className="absolute right-2 top-2 w-4 h-4 border-r border-t border-red-400/60" />
                  <div className="absolute left-2 bottom-2 w-4 h-4 border-l border-b border-red-400/60" />
                  <div className="absolute right-2 bottom-2 w-4 h-4 border-r border-b border-red-400/60" />
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-white truncate pr-2">{orbitaSession?.guestName || "Streamer B"}</p>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-red-300">Canal B</span>
                  </div>
                  <VideoTile participant={orbitaGuestParticipant} isLocal={orbitaGuestParticipant.local} isStreamer />
                  <div className="mt-3 rounded-xl border border-red-500/25 bg-black/50 px-3 py-2">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
                      <span className="text-red-300 font-bold">Orbita 97.7</span>
                      <span className="px-2 py-0.5 rounded bg-red-500/25 text-red-200 font-bold">ON AIR</span>
                    </div>
                    <div className="mt-2 flex items-end gap-1 h-6">
                      {[22, 38, 26, 52, 33, 58, 20, 47, 31, 44].map((height, index) => (
                        <span
                          key={`eq-b-${index}`}
                          className="w-1 rounded-sm bg-gradient-to-t from-red-500 to-orange-300 animate-pulse"
                          style={{ height: `${height}%`, animationDelay: `${index * 0.08}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-[2px] bg-gradient-to-r from-red-500/0 via-orange-400 to-red-500/0 shadow-[0_0_18px_rgba(248,113,113,0.8)]" />
              </div>
            </div>
          )}

          {!isJoined && stayOffline && role === "streamer" && (
            <div className="col-span-full h-full flex flex-col items-center justify-center rounded-3xl border border-amber-500/30 bg-slate-900/55 p-8 text-center">
              <WifiOff className="w-10 h-10 text-amber-400 mb-3" />
              <h3 className="text-white text-xl font-bold mb-2">Modo offline activado</h3>
              <p className="text-slate-400 max-w-xl mb-5">Estás dentro del panel, pero tu transmisión no está conectada.</p>
              <button
                onClick={handleReconnect}
                className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Conectar stream
              </button>
            </div>
          )}

          {!isJoined && !stayOffline && (
            <div className="col-span-full h-full flex flex-col items-center justify-center rounded-3xl border border-indigo-500/25 bg-slate-900/55 p-8 text-center">
              <div className="relative w-20 h-20 mb-4">
                <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20" />
                <div className="relative bg-slate-900 rounded-full w-20 h-20 flex items-center justify-center border border-slate-800">
                  <Radio className="w-8 h-8 text-indigo-500 animate-pulse" />
                </div>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">Conectando transmisión...</h3>
              <p className="text-slate-400 max-w-xl">Preparando audio, video y señal de sala.</p>
            </div>
          )}

          {isJoined && !isOrbitaDualLive && role === "audience" && selectedAudienceParticipant && (
            <div className="col-span-full space-y-3">
              <VideoTile
                key={selectedAudienceParticipant.user_id}
                participant={selectedAudienceParticipant}
                isLocal={false}
                isStreamer
              />
              {orbitaFilteredParticipants.length > 1 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {orbitaFilteredParticipants.map((participant) => {
                    const isSelected = selectedAudienceParticipant.user_id === participant.user_id;
                    return (
                      <button
                        key={participant.user_id}
                        onClick={() => setSelectedAudienceStreamerId(participant.user_id)}
                        className={`rounded-xl border p-2 transition-all text-left ${isSelected
                          ? "border-red-400 bg-red-500/15"
                          : "border-slate-700 bg-slate-900/70 hover:border-slate-500"
                          }`}
                      >
                        <p className="text-xs font-semibold text-slate-200 truncate">{participant.user_name || "Streamer"}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{isSelected ? "Viendo ahora" : "Ver señal"}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {isJoined && !isOrbitaDualLive && role === "streamer" && visibleParticipants.map((p) => (
            <VideoTile
              key={p.user_id}
              participant={p}
              isLocal={p.local}
              isStreamer={streamerNames.includes(p.user_name || "Streamer")}
            />
          ))}

          {isJoined && !isOrbitaDualLive && role === "audience" && orbitaFilteredParticipants.length === 0 && (
            <div className="col-span-full h-full flex items-center justify-center">
              <p className="text-slate-500 italic">Esperando a que un streamer salga al aire...</p>
            </div>
          )}

          {isJoined && !isOrbitaDualLive && role === "streamer" && visibleParticipants.length === 0 && (
            <div className="col-span-full h-full flex items-center justify-center">
              <p className="text-slate-500 italic">Esperando a los participantes...</p>
            </div>
          )}
        </div>

        {/* Sidebar / Chat Area */}
        <div className="w-full md:w-80 lg:w-96 h-[400px] md:h-full shrink-0">
          <div className="h-full flex flex-col gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Audiencia</h3>
                <span className="text-xs text-slate-400">{audienceNames.length} viewers</span>
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar pr-1">
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
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Streamers</h3>
                <span className="text-xs text-slate-400">{streamerStatusList.length} perfiles</span>
              </div>
              <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-300 mb-1">Modo ORBITA</p>
                <p className="text-xs text-slate-300 mb-2">Señal compartida entre streamers conectados.</p>
                {orbitaSession?.active ? (
                  <button
                    onClick={() => {
                      if (role === "audience") {
                        setSelectedAudienceStreamerId(orbitaHostParticipant?.user_id || null);
                      }
                    }}
                    className="w-full rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-red-200 uppercase tracking-wider">ORBITA EN VIVO</p>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-red-400/40 bg-red-500/20 text-red-200 animate-pulse">Al Aire</span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1 truncate">{orbitaSession.hostName} + {orbitaSession.guestName}</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{role === "audience" ? "Ver canal ORBITA" : "Canal ORBITA activo"}</p>
                  </button>
                ) : (
                  <div className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2">
                    <p className="text-xs text-slate-400">No hay señal ORBITA activa.</p>
                  </div>
                )}
              </div>
              {role === "streamer" && (
                <div className="mb-3">
                  {!orbitaSession?.active ? (
                    <>
                      <button
                        onClick={() => setShowOrbitaPicker((previous) => !previous)}
                        className="w-full rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-300 hover:bg-red-500/20"
                      >
                        Entrar a la Orbita
                      </button>
                      {showOrbitaPicker && (
                        <div className="mt-2 space-y-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                          <p className="text-[11px] text-slate-400">Elegí streamer online para emitir en señal compartida.</p>
                          <select
                            value={effectiveOrbitaGuestName}
                            onChange={(event) => setSelectedOrbitaGuestName(event.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200"
                          >
                            {orbitaGuestOptions.length === 0 && <option value="">No hay streamers online</option>}
                            {orbitaGuestOptions.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                          <button
                            onClick={handleStartOrbita}
                            disabled={orbitaGuestOptions.length === 0}
                            className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40"
                          >
                            Activar señal ORBITA
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={handleStopOrbita}
                      disabled={orbitaSession.hostUid !== user.uid}
                      className="w-full rounded-xl border border-amber-400/30 bg-amber-500/15 px-3 py-2 text-xs font-bold uppercase tracking-wider text-amber-300 disabled:opacity-40"
                    >
                      {orbitaSession.hostUid === user.uid ? "Finalizar Orbita" : "Orbita en curso"}
                    </button>
                  )}
                </div>
              )}
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Canales individuales</p>
              <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                {individualStreamerStatusList.map((streamer) => (
                  <div key={streamer.uid} className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2">
                    <span className="text-sm text-slate-200 truncate pr-2">{streamer.name}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${streamer.isLive
                      ? "bg-red-500/15 text-red-300 border-red-500/40 animate-pulse"
                      : "bg-slate-800/80 text-slate-400 border-slate-700"
                      }`}>
                      {streamer.isLive ? "Al Aire" : "Offline"}
                    </span>
                  </div>
                ))}
                {individualStreamerStatusList.length === 0 && (
                  <p className="text-xs text-slate-500">No hay canales individuales disponibles.</p>
                )}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ChatRoom roomId={roomId} />
            </div>
          </div>
        </div>
      </main>

      {/* Controls Bar */}
      <footer className="h-24 bg-gradient-to-t from-slate-950 to-transparent flex items-center justify-center px-6 relative z-20">
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/5 px-8 pt-4 pb-4 rounded-3xl shadow-2xl flex items-center gap-6 -translate-y-4">
          <button
            onClick={togglePauseStream}
            disabled={role !== "streamer"}
            className={`p-4 rounded-2xl transition-all ${
              role !== "streamer"
                ? "opacity-30 cursor-not-allowed bg-slate-900 text-slate-600"
                : isStreamPaused
                  ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title={isStreamPaused ? "Reanudar stream" : "Pausar stream"}
          >
            {isStreamPaused ? <PlayCircle className="w-6 h-6" /> : <PauseCircle className="w-6 h-6" />}
          </button>

          <button
            onClick={toggleAudio}
            disabled={role !== "streamer"}
            className={`p-4 rounded-2xl transition-all ${
              role !== "streamer"
                ? "opacity-30 cursor-not-allowed bg-slate-900 text-slate-600"
                : isStreamPaused
                  ? "bg-slate-900 text-slate-600"
                  : effectiveMicOn
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  : "bg-red-500 text-white"
            }`}
            title="Encender o apagar micrófono"
          >
            {effectiveMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>
          
          <button
            onClick={toggleVideo}
            disabled={role !== "streamer"}
            className={`p-4 rounded-2xl transition-all ${
              role !== "streamer" ? "opacity-30 cursor-not-allowed bg-slate-900 text-slate-600" :
              isStreamPaused ? "bg-slate-900 text-slate-600" :
              effectiveCamOn ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-red-500 text-white"
            }`}
            title="Encender o apagar cámara"
          >
            {effectiveCamOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>

          <button
            onClick={cycleBackgroundFilter}
            disabled={role !== "streamer" || !isJoined}
            className={`p-4 rounded-2xl transition-all ${
              role !== "streamer" || !isJoined
                ? "opacity-30 cursor-not-allowed bg-slate-900 text-slate-600"
                : backgroundFilter === "none"
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  : backgroundFilter === "soft"
                    ? "bg-amber-500/90 text-slate-950 hover:bg-amber-400"
                    : "bg-red-500 text-white hover:bg-red-400"
            }`}
            title={`Filtro de fondo: ${backgroundFilter === "none" ? "apagado" : backgroundFilter === "soft" ? "suave" : "fuerte"}`}
          >
            <Sparkles className="w-6 h-6" />
          </button>

          <div className="w-px h-10 bg-slate-800 mx-2" />

          {role === "streamer" && (
            <button
              onClick={isJoined ? handleGoOffline : handleReconnect}
              className={`px-5 py-4 rounded-2xl font-bold transition-all flex items-center gap-2 active:scale-95 ${isJoined
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                }`}
              title="Conectar o desconectar sin salir del panel"
            >
              {isJoined ? <WifiOff className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
              <span className="hidden md:inline">{isJoined ? "Quedar offline" : "Conectar stream"}</span>
            </button>
          )}

          <button
            onClick={handleLeave}
            className="px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-600/20 active:scale-95"
          >
            <PhoneOff className="w-6 h-6" />
            <span className="hidden md:inline">Salir de la sala</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
