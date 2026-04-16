"use client";

import React from "react";
import Link from "next/link";
import { 
  Video, 
  Users, 
  Zap, 
  Shield, 
  ArrowRight,
  Play
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-200 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/50 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-600/30">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl tracking-tighter text-white">STREAM COLAB</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Características</a>
            <a href="#security" className="hover:text-white transition-colors">Seguridad</a>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
            >
              Log In
            </Link>
            <Link 
              href="/register" 
              className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-black hover:bg-slate-200 transition-all active:scale-95"
            >
              ¡Empezar Gratis!
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6 flex flex-col items-center text-center overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] -z-10" />
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] -z-10" />

        <div className="max-w-4xl space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest animate-bounce">
            <Zap className="w-3 h-3 fill-current" />
            <span>Disponible Ahora (MVP)</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white leading-[0.9]">
            Streaming <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Colaborativo</span> de Próxima Generación.
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 font-medium leading-relaxed">
            Unite a streamers y creadores en una experiencia de video inmersiva, chat en tiempo real y seguridad de grado empresarial. Sin latencia, sin fricción.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link 
              href="/register" 
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 group active:scale-95"
            >
              Crear Tu Primera Sala
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 backdrop-blur-md active:scale-95">
              <Play className="w-5 h-5 fill-current" />
              Ver Demo
            </button>
          </div>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="mt-24 relative max-w-5xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-25" />
          <div className="relative bg-slate-900 rounded-[2.2rem] border border-white/10 p-4 shadow-2xl overflow-hidden aspect-video">
            <div className="w-full h-full bg-slate-950 rounded-[1.5rem] flex items-center justify-center text-slate-800 font-black text-4xl italic tracking-tighter opacity-50">
              [ STREAM_INTERFACE_PREVIEW ]
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: Zap, title: "Baja Latencia", desc: "Basado en Daily.co para asegurar que la colaboración sea instantánea en todo el mundo." },
          { icon: Users, title: "Multi-Participante", desc: "Invitá a otros participantes a unirse a la transmisión con controles de rol inteligentes." },
          { icon: Shield, title: "Auth Seguro", desc: "Integración completa con Firebase para acceso seguro y roles protegidos en tiempo real." }
        ].map((feat, i) => (
          <div key={i} className="p-8 rounded-[2rem] bg-slate-900/50 border border-white/5 hover:border-indigo-500/30 transition-all group">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:bg-indigo-600/10 transition-all">
              <feat.icon className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-indigo-400 transition-colors">
              {feat.title}
            </h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              {feat.desc}
            </p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 opacity-50">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            <span className="font-bold text-sm tracking-tighter uppercase">Stream Colab © 2026</span>
          </div>
          <p className="text-xs text-slate-500">
            Powered by Next.js, Firebase & Daily.co
          </p>
        </div>
      </footer>
    </div>
  );
}
