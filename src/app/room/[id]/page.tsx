"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Users, 
  LayoutGrid,
  Radio
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDaily } from "@/context/DailyContext";
import { VideoTile } from "@/components/room/VideoTile";
import { ChatRoom } from "@/components/room/ChatRoom";

export default function RoomPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const { joinRoom, leaveRoom, isJoined, participants, callObject } = useDaily();
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const effectiveCamOn = role === "streamer" ? isCamOn : false;
  const effectiveMicOn = role === "streamer" ? isMicOn : false;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }

    if (!authLoading && user && !role) {
      router.replace("/dashboard");
      return;
    }

    if (user && role && !isJoined) {
      joinRoom(id as string);
    }
  }, [authLoading, user, role, id, isJoined, joinRoom, router]);

  const handleLeave = async () => {
    await leaveRoom();
    router.push("/dashboard");
  };

  const toggleVideo = () => {
    if (!callObject || role !== "streamer") return;
    const current = callObject.localVideo();
    callObject.setLocalVideo(!current);
    setIsCamOn(!current);
  };

  const toggleAudio = () => {
    if (!callObject || role !== "streamer") return;
    const current = callObject.localAudio();
    callObject.setLocalAudio(!current);
    setIsMicOn(!current);
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950">
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

  if (!isJoined) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950">
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

  return (
    <div className="flex-1 flex flex-col bg-black overflow-hidden h-screen">
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
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-medium">{participants.length} Online</span>
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
          {participants.map((p) => (
            <VideoTile key={p.user_id} participant={p} isLocal={p.local} />
          ))}
          {participants.length === 0 && (
            <div className="col-span-full h-full flex items-center justify-center">
              <p className="text-slate-500 italic">Esperando a los participantes...</p>
            </div>
          )}
        </div>

        {/* Sidebar / Chat Area */}
        <div className="w-full md:w-80 lg:w-96 h-[400px] md:h-full shrink-0">
          <ChatRoom roomId={id as string} />
        </div>
      </main>

      {/* Controls Bar */}
      <footer className="h-24 bg-gradient-to-t from-slate-950 to-transparent flex items-center justify-center px-6 relative z-20">
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/5 px-8 pt-4 pb-4 rounded-3xl shadow-2xl flex items-center gap-6 -translate-y-4">
          <button
            onClick={toggleAudio}
            disabled={role !== "streamer"}
            className={`p-4 rounded-2xl transition-all ${
              role !== "streamer"
                ? "opacity-30 cursor-not-allowed bg-slate-900 text-slate-600"
                : effectiveMicOn
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  : "bg-red-500 text-white"
            }`}
          >
            {effectiveMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>
          
          <button
            onClick={toggleVideo}
            disabled={role !== "streamer"}
            className={`p-4 rounded-2xl transition-all ${
              role !== "streamer" ? "opacity-30 cursor-not-allowed bg-slate-900 text-slate-600" :
              effectiveCamOn ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-red-500 text-white"
            }`}
          >
            {effectiveCamOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>

          <div className="w-px h-10 bg-slate-800 mx-2" />

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
