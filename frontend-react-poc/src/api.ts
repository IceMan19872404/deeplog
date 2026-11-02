import type { ApiEnvelope, Dive, DiveStats, User } from "./types";

let accessToken: string | null = null;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/v1${path}`, { ...init, headers, credentials: "same-origin" });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message || "No se pudo completar la operación");
  return body as T;
}

export async function login(email: string, password: string): Promise<User> {
  const result = await request<ApiEnvelope<{ user: User; accessToken: string }>>("/auth/login", {
    method: "POST", body: JSON.stringify({ email, password })
  });
  accessToken = result.data.accessToken;
  return result.data.user;
}

export function clearSession() { accessToken = null; }
export async function getDives() {
  return (await request<ApiEnvelope<{ dives: Dive[] }>>("/dives?page=1&limit=6")).data.dives;
}
export async function getStats() {
  return (await request<ApiEnvelope<{ stats: DiveStats }>>("/dives/stats")).data.stats;
}
