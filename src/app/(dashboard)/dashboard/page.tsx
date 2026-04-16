"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RadioTower, Users, ShieldCheck, ArrowRight, Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuthService } from "@/service/auth";
import { toast } from "sonner";

export default function DashboardPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  const handleRoleSelect = async (newRole: "streamer" | "audience") => {
    if (!user) return;
    setUpdating(true);
    const toastId = toast.loading("Sincronizando perfil...");
    try {
      await AuthService.updateRole(user.uid, newRole);
      toast.success(`Rol cambiado a ${newRole === "streamer" ? "Streamer" : "Audiencia"}`, { id: toastId });
      router.push(`/room/main-stage`);
    } catch (error) {
      console.error("Error al actualizar rol:", error);
      toast.error("No se pudo conectar con el servidor. Reintenta.", { id: toastId });
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    router.push("/login");
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 bg-transparent">
      <div className="w-full max-w-4xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Hola, {user.displayName || "Usuario"}!</h1>
            <p className="text-slate-400 text-lg">¿Cuál será tu misión hoy en la plataforma?</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>

        {/* Roles Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Streamer Card */}
          <button
            onClick={() => handleRoleSelect("streamer")}
            disabled={updating}
            className="group relative flex flex-col p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all text-left overflow-hidden active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-6 group-hover:scale-110 transition-transform">
              <RadioTower className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">Ser Streamer</h2>
            <p className="text-slate-400 mb-8 flex-1">
              Transmite tu cámara y micrófono. Tendrás control absoluto sobre la emisión y herramientas de moderación.
            </p>
            
            <div className="flex items-center text-indigo-400 font-semibold group-hover:gap-3 transition-all">
              {updating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span>Cargando...</span>
                </>
              ) : (
                <>
                  <span>Comenzar Transmisión</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </div>
          </button>

          {/* Audience Card */}
          <button
            onClick={() => handleRoleSelect("audience")}
            disabled={updating}
            className="group relative flex flex-col p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all text-left overflow-hidden active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">Ser Audiencia</h2>
            <p className="text-slate-400 mb-8 flex-1">
              Disfruta de los streams en vivo, interactúa en el chat y mira las métricas en tiempo real de la comunidad.
            </p>
            
            <div className="flex items-center text-emerald-400 font-semibold group-hover:gap-3 transition-all">
              <span>Entrar como Espectador</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </div>
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-12 p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50 flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0" />
          <p className="text-sm text-slate-500">
            Tu rol actual es <span className="text-slate-300 font-medium capitalize">{role || "no definido"}</span>. 
            Puedes cambiar de rol en cualquier momento seleccionando una de las opciones superiores. 
            Los permisos se aplicarán automáticamente al entrar a la sala.
          </p>
        </div>
      </div>
    </main>
  );
}
