import { useQuery } from "@tanstack/react-query";
import { getDives, getStats } from "./api";
import { formatDate, formatMinutes } from "./format";
import type { User } from "./types";

export function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const dives = useQuery({ queryKey: ["dives", user.id, { page: 1 }], queryFn: getDives });
  const stats = useQuery({ queryKey: ["dive-stats", user.id], queryFn: getStats });
  const loading = dives.isPending || stats.isPending;
  const failed = dives.isError || stats.isError;
  return <main className="dashboard-shell">
    <header><div className="brand"><span>D</span>DeepLog <small>React POC</small></div><div><strong>{user.firstName} {user.lastName}</strong><button className="quiet" onClick={onLogout}>Cerrar sesión</button></div></header>
    <section className="hero"><div><p className="eyebrow">TU ACTIVIDAD SUBMARINA</p><h1>Bitácora de inmersiones</h1><p>Una vertical tipada consumiendo el contrato estable de DeepLog.</p></div><span className="api-badge">/api/v1 estable</span></section>
    {loading && <p role="status">Cargando tu bitácora...</p>}
    {failed && <p className="error" role="alert">No se pudo cargar la información.</p>}
    {stats.data && <section className="metrics" aria-label="Resumen de inmersiones">
      <article><span>Total</span><strong>{stats.data.totalDives}</strong><small>inmersiones</small></article>
      <article><span>Tiempo</span><strong>{formatMinutes(stats.data.totalMinutes)}</strong><small>acumulado</small></article>
      <article><span>Profundidad</span><strong>{stats.data.maxDepthMeters ?? "—"} m</strong><small>récord personal</small></article>
      <article><span>Más larga</span><strong>{stats.data.longestDurationMinutes ?? "—"} min</strong><small>récord personal</small></article>
    </section>}
    {dives.data && <section className="logbook"><div><p className="eyebrow">LOGBOOK</p><h2>Últimas inmersiones</h2></div><div className="dive-grid">{dives.data.map((dive) => <article key={dive.id} className="dive-card"><time>{formatDate(dive.date)}</time><span>{dive.maxDepthMeters} m</span><h3>{dive.name}</h3><p>{dive.diveCenter || "Centro no indicado"}</p><strong>{dive.durationMinutes} min</strong></article>)}</div></section>}
  </main>;
}
