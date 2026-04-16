"use client";

import React from "react";
import Link from "next/link";
import { 
  Orbit,
  Radar,
  Users, 
  Sparkles,
  Shield,
  ArrowRight,
  Play,
  RadioTower,
  Globe
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
    <div className="relative flex-1 flex flex-col overflow-x-hidden bg-[#040406] text-slate-200">
      <div className="pointer-events-none absolute inset-0 orbit-universe" />
      <div className="pointer-events-none absolute inset-0 orbit-stars" />
      <div className="pointer-events-none absolute inset-0 orbit-grid" />
      <div className="pointer-events-none absolute left-[8%] top-[30%] h-[2px] w-72 origin-left orbit-electric" />
      <div className="pointer-events-none absolute right-[10%] top-[56%] h-[2px] w-60 origin-right orbit-electric-delayed" />
      <div className="pointer-events-none absolute left-[45%] top-[18%] h-[2px] w-44 orbit-electric-soft" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-red-500/20 bg-black/35 px-6 py-4 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-red-500 to-orange-500 p-1.5 rounded-lg shadow-lg shadow-red-500/30">
              <Orbit className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl tracking-[0.18em] text-white">ORBITA</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-red-300 transition-colors">Características</a>
            <a href="#mission" className="hover:text-red-300 transition-colors">Misión</a>
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
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-black hover:from-red-400 hover:to-orange-400 transition-all active:scale-95"
            >
              Entrar en ORBITA
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-44 pb-28 px-6 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute top-16 right-10 hidden md:block orbit-pulse-ring" />
        <div className="absolute bottom-12 left-10 hidden md:block orbit-pulse-ring orbit-pulse-ring-alt" />

        <div className="max-w-4xl space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 text-[10px] font-black uppercase tracking-[0.2em]">
            <Sparkles className="w-3 h-3 fill-current" />
            <span>Red Federal De Streamers</span>
          </div>

          <h1 className="text-5xl md:text-8xl font-black tracking-tight text-white leading-[0.92]">
            Conectate a la
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-500 to-orange-400">
              orbita del streaming
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-lg md:text-xl text-slate-300 font-medium leading-relaxed">
            ORBITA conecta streamers y audiencia en un universo de transmisiones en vivo con video real, chat en tiempo real y presencia sincronizada.
            Todo en una experiencia lista para demo.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link 
              href="/register" 
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold hover:from-red-400 hover:to-orange-400 transition-all shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 group active:scale-95"
            >
              Despegar Ahora
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 border border-red-400/20 text-white font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 backdrop-blur-md active:scale-95">
              <Play className="w-5 h-5 fill-current" />
              Entrar Al Control
            </Link>
          </div>
        </div>

        <div className="mt-20 relative max-w-5xl mx-auto w-full px-2">
          <div className="absolute -inset-1 bg-gradient-to-r from-red-500/50 via-orange-500/40 to-red-500/50 rounded-[2.5rem] blur-md opacity-65" />
          <div className="relative bg-[#08090f]/90 rounded-[2.2rem] border border-red-500/25 p-4 shadow-2xl overflow-hidden aspect-video orbit-panel-float">
            <div className="w-full h-full rounded-[1.5rem] border border-red-500/15 bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.12),_transparent_55%)] p-5 grid grid-cols-3 gap-4">
              <div className="col-span-2 rounded-2xl border border-red-500/20 bg-black/45 relative overflow-hidden">
                <div className="absolute inset-0 orbit-stars opacity-45" />
                <div className="absolute bottom-3 left-3 text-xs font-bold tracking-[0.15em] text-red-300 uppercase flex items-center gap-2">
                  <RadioTower className="w-3.5 h-3.5" />
                  Señal Activa
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/50 p-4 text-left">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">Canal Federal</p>
                <p className="text-lg font-bold text-white mb-2">Nodo ORBITA</p>
                <p className="text-xs text-slate-400 leading-relaxed">Presencia, chat y video vivo conectados a la misma orbita.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 py-24 max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: Radar, title: "Señal En Tiempo Real", desc: "Transmisión en vivo con video real y control fino de cámara, audio y pausa de stream." },
          { icon: Users, title: "Comunidad Federal", desc: "Roles de streamer y audiencia con presencia online, chat sincronizado y métricas de sala." },
          { icon: Shield, title: "Control Seguro", desc: "Autenticación Firebase, tokens backend y permisos aplicados por rol para cada acceso." }
        ].map((feat, i) => (
          <div key={i} className="p-8 rounded-[2rem] bg-black/45 border border-red-500/20 hover:border-red-400/45 transition-all group backdrop-blur-md">
            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-400/20 group-hover:bg-red-500/20 transition-all">
              <feat.icon className="w-6 h-6 text-red-300" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-red-300 transition-colors">
              {feat.title}
            </h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              {feat.desc}
            </p>
          </div>
        ))}
      </section>

      <section id="mission" className="relative z-10 max-w-7xl mx-auto w-full px-6 pb-24">
        <div className="rounded-[2rem] border border-red-500/20 bg-black/45 backdrop-blur-md px-8 py-10 md:px-12 md:py-12 flex flex-col md:flex-row gap-8 md:items-center md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.2em] text-red-300 mb-3">Slogan</p>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">ORBITA · red federal de streamers</h2>
            <p className="text-slate-300 leading-relaxed">Una plataforma para validar conocimiento técnico real: autenticación, permisos por rol, streaming en vivo y UX lista para presentaciones.</p>
          </div>
          <div className="flex items-center gap-3 text-red-300">
            <Globe className="w-6 h-6" />
            <span className="font-semibold">Nodos conectados en una sola orbita</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-16 border-t border-red-500/20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 opacity-50">
          <div className="flex items-center gap-2">
            <Orbit className="w-4 h-4" />
            <span className="font-bold text-sm tracking-[0.14em] uppercase">ORBITA © 2026</span>
          </div>
          <p className="text-xs text-slate-500">
            Powered by Next.js, Firebase & Daily.co
          </p>
        </div>
      </footer>
    </div>
  );
}
