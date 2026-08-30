import Link from "next/link";
import { getMatches, inicialesDeEquipo } from "@/lib/sheet-data";

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

// De todas las jornadas que ya tienen partidos metidos, elige la que esté
// más cerca de hoy (por fecha media de sus partidos). Así la web siempre
// abre mostrando lo relevante, sin tener que cambiarlo a mano cada semana.
function jornadaActualPorFecha(matches) {
  const porJornada = new Map();

  matches.forEach((m) => {
    if (!m.jornada) return;
    const fecha = new Date(m.fecha);
    if (isNaN(fecha)) return;
    if (!porJornada.has(m.jornada)) porJornada.set(m.jornada, []);
    porJornada.get(m.jornada).push(fecha.getTime());
  });

  if (porJornada.size === 0) return null;

  const hoy = Date.now();
  let mejorJornada = null;
  let mejorDiferencia = Infinity;

  porJornada.forEach((tiempos, jornada) => {
    const media = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
    const diferencia = Math.abs(media - hoy);
    if (diferencia < mejorDiferencia) {
      mejorDiferencia = diferencia;
      mejorJornada = jornada;
    }
  });

  return mejorJornada;
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

  const jornadaPorDefecto = jornadaActualPorFecha(matches) || jornadas[0];
  const jornadaActiva = searchParams?.jornada || jornadaPorDefecto;

  const matchesFiltrados = jornadaActiva
    ? matches.filter((m) => String(m.jornada) === String(jornadaActiva))
    : matches;

  return (
    <div className={`wrap`}>
      <div className={`title`}>La Liga · partidos (temporada 2026-27)</div>
      <div className={`subtitle`}>Datos introducidos manualmente, basados en fuentes públicas</div>
<Link href={`/clasificacion`} style={{ display: `inline-block`, marginTop: 10, fontSize: 13, color: `var(--turf)`, textDecoration: `none`, border: `1px solid var(--line)`, borderRadius: 8, padding: `6px 12px` }}>Ver clasificación →</Link>
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

      {matchesFiltrados.map((m) => {
        const tieneResultado = m.golesLocal !== null && m.golesVisitante !== null;
        return (
          <Link
            key={m.id}
            href={`/partido/${m.id}`}
            style={{
              display: `block`,
              textDecoration: `none`,
              color: `inherit`,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                background: `var(--surface)`,
                border: `1px solid var(--line)`,
                borderRadius: 10,
                padding: `16px 0`,
                position: `relative`,
                display: `flex`,
                alignItems: `center`,
              }}
            >
              <div style={{ flex: 1, display: `flex`, flexDirection: `column`, alignItems: `center`, gap: 6 }}>
                <div className={`badge`} style={{ display: `flex`, alignItems: `center`, justifyContent: `center`, textAlign: `center` }}>
                  {inicialesDeEquipo(m.equipoLocal)}
                </div>
                <span style={{ fontSize: 13, textAlign: `center` }}>{m.equipoLocal}</span>
              </div>

              <div style={{ position: `absolute`, left: `50%`, top: 0, bottom: 0, width: 1, background: `var(--line)` }} />

              <div
                style={{
                  position: `absolute`,
                  left: `50%`,
                  top: `50%`,
                  transform: `translate(-50%, -50%)`,
                  background: `var(--bg)`,
                  border: `1px solid var(--line)`,
                  borderRadius: 20,
                  padding: `4px 14px`,
                  fontFamily: `Barlow Condensed, sans-serif`,
                  fontSize: 16,
                  fontWeight: 700,
                  color: `var(--turf)`,
                  whiteSpace: `nowrap`,
                }}
              >
                {tieneResultado ? `${m.golesLocal} - ${m.golesVisitante}` : `vs`}
              </div>

              <div style={{ flex: 1, display: `flex`, flexDirection: `column`, alignItems: `center`, gap: 6 }}>
                <div className={`badge`} style={{ display: `flex`, alignItems: `center`, justifyContent: `center`, textAlign: `center` }}>
                  {inicialesDeEquipo(m.equipoVisitante)}
                </div>
                <span style={{ fontSize: 13, textAlign: `center` }}>{m.equipoVisitante}</span>
              </div>
            </div>
            <div style={{ textAlign: `center`, fontSize: 11, color: `var(--text-muted)`, fontFamily: `Roboto Mono, monospace`, marginTop: 6 }}>
              {m.jornada && `Jornada ${m.jornada} · `}{formatDate(m.fecha)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
