"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import DailyIframe, { DailyCall, DailyParticipant } from "@daily-co/daily-js";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface DailyContextType {
  callObject: DailyCall | null;
  joinRoom: (roomName: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  isJoined: boolean;
  participants: DailyParticipant[]; // Tipado correctamente para Vercel
}

const DailyContext = createContext<DailyContextType>({
  callObject: null,
  joinRoom: async () => {},
  leaveRoom: async () => {},
  isJoined: false,
  participants: [],
});

export const DailyProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, role } = useAuth();
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [participants, setParticipants] = useState<DailyParticipant[]>([]);

  useEffect(() => {
    const co = DailyIframe.createCallObject();
    setCallObject(co);

    return () => {
      co.destroy();
    };
  }, []);

  const updateParticipants = useCallback(() => {
    if (!callObject) return;
    const p = callObject.participants();
    setParticipants(Object.values(p));
  }, [callObject]);

  useEffect(() => {
    if (!callObject) return;

    const handleJoined = () => {
      setIsJoined(true);
      updateParticipants();
    };

    const handleLeft = () => {
      setIsJoined(false);
      setParticipants([]);
    };

    callObject.on("joined-meeting", handleJoined);
    callObject.on("left-meeting", handleLeft);
    callObject.on("participant-joined", updateParticipants);
    callObject.on("participant-updated", updateParticipants);
    callObject.on("participant-left", updateParticipants);

    return () => {
      callObject.off("joined-meeting", handleJoined);
      callObject.off("left-meeting", handleLeft);
      callObject.off("participant-joined", updateParticipants);
      callObject.off("participant-updated", updateParticipants);
      callObject.off("participant-left", updateParticipants);
    };
  }, [callObject, updateParticipants]);

  const joinRoom = async (roomName: string) => {
    if (!callObject || !user || !role) return;

    try {
      const firebaseIdToken = await user.getIdToken();

      // 1. Obtener Token del Backend
      const response = await fetch("/api/daily/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseIdToken}`,
        },
        body: JSON.stringify({
          roomName,
        }),
      });

      const payload = (await response.json()) as { token?: string; error?: string };
      if (!response.ok || payload.error || !payload.token) {
        const message = payload.error || "Error al generar token de Daily";
        toast.error(`Error al generar token: ${message}`);
        throw new Error(message);
      }

      // 2. Unirse a la sala usando el token
      const configuredDomain = process.env.NEXT_PUBLIC_DAILY_DOMAIN || "";
      const normalizedDomain = configuredDomain
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "");
      const dailyHost =
        normalizedDomain.length === 0
          ? "tu-dominio.daily.co"
          : normalizedDomain.includes(".")
            ? normalizedDomain
            : `${normalizedDomain}.daily.co`;

      await callObject.join({
        url: `https://${dailyHost}/${roomName}`,
        token: payload.token,
      });

      if (role !== "streamer") {
        callObject.setLocalVideo(false);
        callObject.setLocalAudio(false);
      }

    } catch (error: unknown) {
      console.error("Error joining Daily room:", error);
      const err = error as Error;
      
      // Manejar errores comunes de Daily
      if (err.message?.includes("cam-mic")) {
        toast.error("No se pudo acceder a la cámara o micrófono. Verificá los permisos del navegador.");
      } else if (err.message?.includes("not-found")) {
        toast.error("La sala especificada no existe.");
      } else {
        toast.error("Error inesperado al intentar unirse a la sala.");
      }
    }
  };

  const leaveRoom = async () => {
    if (!callObject) return;
    await callObject.leave();
  };

  return (
    <DailyContext.Provider value={{ callObject, joinRoom, leaveRoom, isJoined, participants }}>
      {children}
    </DailyContext.Provider>
  );
};

export const useDaily = () => useContext(DailyContext);
