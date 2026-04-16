"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { ref, onValue, off, Unsubscribe } from "firebase/database";
import { auth, db } from "@/lib/firebase/client";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  role: "streamer" | "audience" | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"streamer" | "audience" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeRole: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      // Limpiar listener de rol previo si existe
      if (unsubscribeRole) {
        unsubscribeRole();
        unsubscribeRole = null;
      }

      if (currentUser) {
        // Escuchar el rol del usuario en RTDB
        const roleRef = ref(db, `users/${currentUser.uid}/role`);
        unsubscribeRole = onValue(roleRef, (snapshot) => {
          setRole(snapshot.val());
          setLoading(false);
        }, (error) => {
          console.error("Error al leer rol:", error);
          toast.error("Error al sincronizar perfil de usuario");
          setLoading(false);
        });
      } else {
        setRole(null);
        setLoading(false);
      }
    }, (error) => {
      console.error("Auth error:", error);
      toast.error("Falla en el servicio de autenticación");
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeRole) unsubscribeRole();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
