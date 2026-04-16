import { AuthProvider } from "@/context/AuthContext";
import { DailyProvider } from "@/context/DailyContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DailyProvider>
        {children}
      </DailyProvider>
    </AuthProvider>
  );
}
