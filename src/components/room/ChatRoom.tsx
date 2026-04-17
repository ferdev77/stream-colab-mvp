"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, MessageCircle, User } from "lucide-react";
import {
  ref,
  push,
  onValue,
  serverTimestamp,
  query,
  limitToLast,
  get,
  runTransaction,
  onDisconnect,
  set,
  remove
} from "firebase/database";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/context/AuthContext";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  role: string;
}

interface ChatRoomProps {
  roomId: string;
}

export function ChatRoom({ roomId }: ChatRoomProps) {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [presenceCount, setPresenceCount] = useState(0);
  const [totalViewers, setTotalViewers] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Presence & Stats Logic
  useEffect(() => {
    if (!user || !roomId) return;

    const connectedRef = ref(db, ".info/connected");
    const presenceRef = ref(db, `presence/${roomId}/${user.uid}`);
    const roomPresenceRef = ref(db, `presence/${roomId}`);
    const uniqueViewerRef = ref(db, `rooms/${roomId}/stats/unique_viewers/${user.uid}`);
    const totalViewersRef = ref(db, `rooms/${roomId}/stats/total_viewers`);

    const markViewerSeen = async () => {
      const seenSnapshot = await get(uniqueViewerRef);
      if (seenSnapshot.exists()) {
        return;
      }

      await set(uniqueViewerRef, serverTimestamp());
      await runTransaction(totalViewersRef, (currentValue) => {
        if (typeof currentValue === "number") {
          return currentValue + 1;
        }

        return 1;
      });
    };

    markViewerSeen().catch((error) => {
      console.error("Viewers count error:", error);
    });

    const unsubscribeConnected = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() !== true) {
        return;
      }

      void (async () => {
        await set(presenceRef, {
          name: user.displayName || "Anónimo",
          role,
          joinedAt: serverTimestamp(),
          lastSeen: serverTimestamp(),
        });

        onDisconnect(presenceRef).remove();
      })();
    }, (error) => {
      console.error("Presence connection error:", error);
      toast.error("Error al sincronizar audiencia");
    });

    // Listen to presence count
    const unsubscribePresence = onValue(roomPresenceRef, (snapshot) => {
      setPresenceCount(snapshot.exists() ? Object.keys(snapshot.val()).length : 0);
    }, (error) => {
      console.error("Presence error:", error);
      toast.error("Error al sincronizar audiencia");
    });

    // Listen to total viewers count
    const unsubscribeTotal = onValue(totalViewersRef, (snapshot) => {
      const value = snapshot.val();
      setTotalViewers(typeof value === "number" ? value : 0);
    }, (error) => {
      console.error("Viewers count error:", error);
    });

    return () => {
      unsubscribeConnected();
      unsubscribePresence();
      unsubscribeTotal();
      remove(presenceRef);
    };
  }, [user, roomId, role]);

  // 2. Chat Logic
  useEffect(() => {
    if (!roomId) return;

    const messagesRef = query(ref(db, `chat/${roomId}`), limitToLast(50));
    
    const unsubscribeChat = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        interface ChatMessage {
          senderId: string;
          senderName: string;
          text: string;
          timestamp: number;
          role: string;
        }
        const msgList = Object.entries(data)
          .map(([id, val]) => ({
            id,
            ...(val as ChatMessage),
          }))
          .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(msgList);
      }
    }, (error) => {
      console.error("Chat fetch error:", error);
      toast.error("Error al cargar el chat");
    });

    return () => unsubscribeChat();
  }, [roomId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      const messagesRef = ref(db, `chat/${roomId}`);
      await push(messagesRef, {
        senderId: user.uid,
        senderName: user.displayName || "Anónimo",
        text: newMessage,
        timestamp: serverTimestamp(),
        role: role,
      });

      setNewMessage("");
    } catch (error) {
      console.error("Send message error:", error);
      toast.error("No se pudo enviar el mensaje");
    }
  };

  return (
    <div className="w-full min-w-0 flex flex-col h-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-sm text-slate-200 uppercase tracking-wider">Chat en Vivo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-bold text-indigo-400 uppercase">{presenceCount} Online</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 rounded-full border border-white/5">
            <User className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">{totalViewers} Total</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth custom-scrollbar"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={cn(
              "flex flex-col max-w-[85%]",
              msg.senderId === user?.uid ? "ml-auto items-end" : "items-start"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-tighter px-1.5 rounded",
                msg.role === "streamer" ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "text-slate-500"
              )}>
                {msg.role}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {msg.senderName}
              </span>
            </div>
            <div className={cn(
              "px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all",
              msg.senderId === user?.uid 
                ? "bg-indigo-600 text-white rounded-tr-none" 
                : "bg-slate-800 text-slate-300 rounded-tl-none border border-white/5"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-20 text-slate-400 space-y-2">
            <MessageCircle className="w-12 h-12" />
            <p className="text-xs font-bold uppercase tracking-widest">No hay mensajes</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-4 bg-slate-950/50 border-t border-white/5">
        <div className="relative group">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe algo emocionante..."
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-2xl px-5 py-3.5 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 group-hover:border-slate-700"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:active:scale-100"
            disabled={!newMessage.trim()}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
