import Link from "next/link";
import { getMatches } from "@/lib/sheet-data";

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(`es-ES`, {
    weekday: `short`,
    day: `2-digit`,
    month: `short`,
    year: `numeric`,
  });
}

export default async function Home({ searchParams }) {
  let matches = [];
  let error = null;

  try {
    matches = await getMatches();
  } catch (e) {
    error = e.message;
  }

  const jornadas = Array.from(
    new Set(matches.map((m) => m.jornada).filter(Boolean))
  ).sort((a, b) => Number(a) - Number(b));

  const jornadaActiva = searchParams?.jornada || jornadas[0] || null;

  const matchesFiltrados = jornadaActiva
    ? matches.filter((m) => String(m.jornada) === String(jornadaActiva))
    : matches;

  return (
    <div className={`wrap`}>
      <div className={`title`}>La Liga · partidos (temporada 2026-27)</div>
      <div className={`subtitle`}>Datos introducidos manualmente, basados en fuentes públicas</div>

      {jornadas.length > 0 && (
        <div
          style={{
            display: `flex`,
            gap: 8,
            overflowX: `auto`,
            padding: `16px 0 4px`,
            marginBottom: 4,
          }}
        >
          {jornadas.map((j) => (
            <Link
              key={j}
              href={`/?jornada=${j}`}
              className={`tab ${String(j) === String(jornadaActiva) ? "active" : ""}`}
              style={{ flexShrink: 0 }}
            >
              Jornada {j}
            </Link>
          ))}
        </div>
      )}

      <div className={`divider`}>
        <span>Partidos</span>
        <div className={`line`} />
      </div>

      {error && (
        <div className={`error-box`}>
          No se han podido cargar los partidos: {error}
        </div>
      )}

      {!error && matchesFiltrados.length === 0 && (
        <div className={`error-box`}>
          No hay partidos cargados para esta jornada todavía.
        </div>
      )}

      {matchesFiltrados.map((m) => (
        <Link key={m.id} href={`/partido/${m.id}`} className={`match-card`}>
          <div style={{ display: `flex`, alignItems: `center`, gap: 12 }}>
            <div className={`team-row`}>
              <div className={`badge`}>{m.equipoLocal.slice(0, 3).toUpperCase()}</div>
              <span>{m.equipoLocal}</span>
            </div>
            <span style={{ color: `var(--text-muted)`, fontFamily: `Roboto Mono, monospace`, fontSize: 12 }}>
              vs
            </span>
            <div className={`team-row`}>
              <div className={`badge`}>{m.equipoVisitante.slice(0, 3).toUpperCase()}</div>
              <span>{m.equipoVisitante}</span>
            </div>
          </div>
          <div style={{ textAlign: `right` }}>
            {m.jornada && (
              <div style={{ fontFamily: `Roboto Mono, monospace`, fontSize: 12, color: `var(--text-sec)` }}>
                Jornada {m.jornada}
              </div>
            )}
            <div style={{ fontSize: 12, color: `var(--text-muted)`, marginTop: 2 }}>
              {formatDate(m.fecha)}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
