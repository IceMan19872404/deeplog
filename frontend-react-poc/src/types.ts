export interface User { id: number; firstName: string; lastName: string; email: string }
export interface Dive {
  id: number; name: string; date: string; durationMinutes: number;
  maxDepthMeters: number; diveCenter: string | null;
}
export interface DiveStats {
  totalDives: number; totalMinutes: number; maxDepthMeters: number | null;
  longestDurationMinutes: number | null;
}
export interface ApiEnvelope<T> { data: T }
