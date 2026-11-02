import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dashboard } from "./Dashboard";
import { Login } from "./Login";
import { clearSession } from "./api";
import type { User } from "./types";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  if (!user) return <Login onLogin={setUser} />;
  return <Dashboard user={user} onLogout={() => {
    clearSession(); queryClient.clear(); setUser(null);
  }} />;
}
