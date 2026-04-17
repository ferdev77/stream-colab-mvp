"use client";

import React, { useEffect, useRef } from "react";
import { User, MicOff } from "lucide-react";

interface VideoParticipant {
  user_name?: string;
  audio: boolean;
  video: boolean;
  tracks: {
    video?: { persistentTrack?: MediaStreamTrack };
    audio?: { persistentTrack?: MediaStreamTrack };
  };
}

interface VideoTileProps {
  participant: VideoParticipant;
  isLocal?: boolean;
  isStreamer?: boolean;
  frameless?: boolean;
}

export const VideoTile = ({ participant, isLocal = false, isStreamer = false, frameless = false }: VideoTileProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const videoTrack = participant?.tracks?.video?.persistentTrack;
  const audioTrack = participant?.tracks?.audio?.persistentTrack;
  const isAudioOff = !participant?.audio;

  useEffect(() => {
    if (videoRef.current && videoTrack) {
      videoRef.current.srcObject = new MediaStream([videoTrack]);
    }
  }, [videoTrack]);

  useEffect(() => {
    if (audioRef.current && audioTrack && !isLocal) {
      audioRef.current.srcObject = new MediaStream([audioTrack]);
    }
  }, [audioTrack, isLocal]);

  return (
    <div
      className={`relative aspect-video overflow-hidden group ${
        frameless
          ? "bg-slate-900 rounded-lg"
          : "bg-slate-900 rounded-2xl border border-slate-800 shadow-lg"
      }`}
    >
      {videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal}
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
          <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-slate-500" />
          </div>
          <p className="text-slate-500 font-medium">Cámara apagada</p>
        </div>
      )}

      {/* Audio Element Hidden */}
      {!isLocal && <audio ref={audioRef} autoPlay />}

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-white text-xs font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {participant?.user_name || "Participante"} {isLocal && "(Tú)"}
        </div>
        {isAudioOff && (
          <div className="p-1.5 rounded-lg bg-red-500/80 backdrop-blur-md text-white">
            <MicOff className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {isLocal && (
        <div className="absolute top-4 right-4">
          <div className="px-2 py-1 rounded bg-indigo-500 text-[10px] font-bold text-white uppercase tracking-wider">
            Local
          </div>
        </div>
      )}

      {!isLocal && isStreamer && (
        <div className="absolute top-4 right-4">
          <div className="px-2 py-1 rounded bg-emerald-500 text-[10px] font-bold text-slate-950 uppercase tracking-wider">
            Streamer
          </div>
        </div>
      )}
    </div>
  );
};
