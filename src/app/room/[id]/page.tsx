"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onValue, ref } from "firebase/database";
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
  RefreshCw
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
  const [streamerProfiles, setStreamerProfiles] = useState<StreamerProfile[]>([]);
  const [audienceNames, setAudienceNames] = useState<string[]>([]);
  const previousMediaState = useRef<{ cam: boolean; mic: boolean }>({ cam: true, mic: true });
  const effectiveCamOn = role === "streamer" ? isCamOn : false;
  const effectiveMicOn = role === "streamer" ? isMicOn : false;

  const streamerNames = useMemo(() => {
    return participants
      .filter((participant) => {
        const maybeOwner = (participant as { owner?: boolean }).owner;
        const hasVideoTrack = Boolean(participant.tracks?.video?.persistentTrack);
        const hasAudioTrack = Boolean(participant.tracks?.audio?.persistentTrack);
        return maybeOwner || hasVideoTrack || hasAudioTrack;
      })
      .map((participant) => participant.user_name || "Streamer")
      .filter((name, index, array) => array.indexOf(name) === index);
  }, [participants]);

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

  const handleLeave = async () => {
    setStayOffline(false);
    await leaveRoom();
    router.push("/dashboard");
  };

  const handleGoOffline = async () => {
    setStayOffline(true);
    await leaveRoom();
  };

  const handleReconnect = () => {
    setStayOffline(false);
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

          {isJoined && visibleParticipants.map((p) => (
            <VideoTile
              key={p.user_id}
              participant={p}
              isLocal={p.local}
              isStreamer={streamerNames.includes(p.user_name || "Streamer")}
            />
          ))}
          {isJoined && visibleParticipants.length === 0 && (
            <div className="col-span-full h-full flex items-center justify-center">
              <p className="text-slate-500 italic">
                {role === "audience" ? "Esperando a que un streamer salga al aire..." : "Esperando a los participantes..."}
              </p>
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
              <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                {streamerStatusList.map((streamer) => (
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
                {streamerStatusList.length === 0 && (
                  <p className="text-xs text-slate-500">No hay streamers registrados todavía.</p>
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
