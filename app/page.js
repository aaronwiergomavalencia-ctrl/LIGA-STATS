import Link from "next/link";
import { getFixtures } from "@/lib/api-football";

function formatDate(iso) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(fixture) {
  const status = fixture.fixture.status;
  if (status.short === "1H" || status.short === "2H" || status.short === "HT") {
    return { text: `En juego · ${status.elapsed}'`, live: true };
  }
  if (status.short === "FT") {
    return { text: "Finalizado", live: false };
  }
  return { text: "Por jugar", live: false };
}

export default async function Home() {
  let fixtures = [];
  let error = null;

  try {
    fixtures = await getFixtures();
  } catch (e) {
    error = e.message;
  }

  return (
    <div className="wrap">
      <div className="title">La Liga · últimos partidos (temporada 2023)</div>
      <div className="subtitle">Datos de API-Football · se actualizan automáticamente</div>

      <div className="divider">
        <span>Partidos</span>
        <div className="line" />
      </div>

      {error && (
        <div className="error-box">
          No se han podido cargar los partidos: {error}
        </div>
      )}

      {!error && fixtures.length === 0 && (
        <div className="error-box">
          No hay partidos próximos disponibles ahora mismo.
        </div>
      )}

      {fixtures.map((f) => {
        const st = statusLabel(f);
        return (
          <Link key={f.fixture.id} href={`/partido/${f.fixture.id}`} className="match-card">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="team-row">
                <div className="badge">{f.teams.home.name.slice(0, 3).toUpperCase()}</div>
                <span>{f.teams.home.name}</span>
              </div>
              <span style={{ color: "var(--text-muted)", fontFamily: "Roboto Mono, monospace", fontSize: 12 }}>
                vs
              </span>
              <div className="team-row">
                <div className="badge">{f.teams.away.name.slice(0, 3).toUpperCase()}</div>
                <span>{f.teams.away.name}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className={st.live ? "status-live" : "status-upcoming"} style={{ fontFamily: "Roboto Mono, monospace", fontSize: 12 }}>
                {st.text}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {formatDate(f.fixture.date)}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
