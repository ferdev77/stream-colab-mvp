import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile
} from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, db } from "@/lib/firebase/client";

export const AuthService = {
  register: async (email: string, pass: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    await updateProfile(user, { displayName: name });

    // Inicializar el usuario en RTDB con rol por defecto 'audience'
    await set(ref(db, `users/${user.uid}`), {
      name: name,
      email: email,
      role: "audience", // Default role
      createdAt: Date.now(),
    });

    return user;
  },

  login: async (email: string, pass: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  },

  logout: async () => {
    await signOut(auth);
  },
  
  updateRole: async (uid: string, role: "streamer" | "audience") => {
    await set(ref(db, `users/${uid}/role`), role);
  }
};
