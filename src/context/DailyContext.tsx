"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import DailyIframe, { DailyCall, DailyEventObject } from "@daily-co/daily-js";
import { useAuth } from "./AuthContext";

interface DailyContextType {
  callObject: DailyCall | null;
  joinRoom: (roomName: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  isJoined: boolean;
  participants: any[]; // Simplificado para el MVP
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
  const [participants, setParticipants] = useState<any[]>([]);

  // Inicializar el objeto de llamada una sola vez
  useEffect(() => {
    if (!callObject) {
      const co = DailyIframe.createCallObject();
      setCallObject(co);
    }

    return () => {
      callObject?.destroy();
    };
  }, [callObject]);

  const updateParticipants = useCallback(() => {
    if (!callObject) return;
    const p = callObject.participants();
    setParticipants(Object.values(p));
  }, [callObject]);

  useEffect(() => {
    if (!callObject) return;

    callObject.on("joined-meeting", () => setIsJoined(true));
    callObject.on("left-meeting", () => setIsJoined(false));
    callObject.on("participant-joined", updateParticipants);
    callObject.on("participant-updated", updateParticipants);
    callObject.on("participant-left", updateParticipants);

    return () => {
      callObject.off("joined-meeting", () => setIsJoined(true));
      callObject.off("left-meeting", () => setIsJoined(false));
      callObject.off("participant-joined", updateParticipants);
      callObject.off("participant-updated", updateParticipants);
      callObject.off("participant-left", updateParticipants);
    };
  }, [callObject, updateParticipants]);

  const joinRoom = async (roomName: string) => {
    if (!callObject || !user) return;

    try {
      // 1. Obtener Token del Backend
      const response = await fetch("/api/daily/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName,
          isOwner: role === "streamer"
        }),
      });

      const { token, error } = await response.json();
      if (error) throw new Error(error);

      // 2. Unirse a la sala usando el token
      const domain = process.env.NEXT_PUBLIC_DAILY_DOMAIN || "tu-dominio";
      await callObject.join({
        url: `https://${domain}.daily.co/${roomName}`,
        token,
      });

    } catch (err) {
      console.error("Error joining Daily room:", err);
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
