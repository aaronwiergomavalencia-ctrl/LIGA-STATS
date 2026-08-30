import Link from "next/link";
import { getMatches, colorDeEquipo } from "@/lib/sheet-data";

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

  const jornadas = Array.from({ length: 38 }, (_, i) => String(i + 1));

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
              <div
                className={`badge`}
                style={{ borderColor: colorDeEquipo(m.equipoLocal), color: colorDeEquipo(m.equipoLocal) }}
              >
                {m.equipoLocal.slice(0, 3).toUpperCase()}
              </div>
              <span>{m.equipoLocal}</span>
            </div>
            <span style={{ color: `var(--turf)`, fontFamily: `Roboto Mono, monospace`, fontSize: 15, fontWeight: 700, minWidth: 36, textAlign: `center` }}>
              {m.golesLocal !== null && m.golesVisitante !== null
                ? `${m.golesLocal} - ${m.golesVisitante}`
                : `vs`}
            </span>
            <div className={`team-row`}>
              <div
                className={`badge`}
                style={{ borderColor: colorDeEquipo(m.equipoVisitante), color: colorDeEquipo(m.equipoVisitante) }}
              >
                {m.equipoVisitante.slice(0, 3).toUpperCase()}
              </div>
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
