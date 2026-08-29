import Link from "next/link";
import { getMatchDetail, getPlayerSeasonAverage } from "@/lib/sheet-data";

function statRow(label, key) {
  return { label, key };
}

const STAT_ROWS = [
  statRow("Remates", "remates"),
  statRow("A puerta", "rematesPuerta"),
  statRow("Entradas", "entradas"),
  statRow("Faltas com.", "faltasCometidas"),
  statRow("Faltas rec.", "faltasRecibidas"),
  statRow("Paradas", "paradas"),
];

function fmt(val) {
  return val === null || val === undefined ? "—" : val;
}

function fmtAvg(val) {
  return val === null || val === undefined ? "—" : val.toFixed(2);
}

// Fila (0 = portero, 1 = defensas, 2 = centrocampistas, 3 = delanteros)
// y orden de izquierda a derecha dentro de esa fila.
const POSITION_MAP = {
  POR: { row: 0, order: 0 },
  LI: { row: 1, order: 1 },
  DFC: { row: 1, order: 2.5 },
  LD: { row: 1, order: 4 },
  DEF: { row: 1, order: 2.5 },
  MCD: { row: 2, order: 1 },
  MI: { row: 2, order: 1.5 },
  MC: { row: 2, order: 2.5 },
  MCO: { row: 2, order: 3 },
  MD: { row: 2, order: 3.5 },
  CEN: { row: 2, order: 2.5 },
  EI: { row: 3, order: 1 },
  DC: { row: 3, order: 2 },
  ED: { row: 3, order: 3 },
  DEL: { row: 3, order: 2 },
};

function agruparPorFila(titulares) {
  const filas = [[], [], [], []];
  titulares.forEach((p) => {
    const info = POSITION_MAP[p.posicion] || { row: 2, order: 2.5 };
    filas[info.row].push({ ...p, _order: info.order });
  });
  filas.forEach((fila) => fila.sort((a, b) => a._order - b._order));
  return filas;
}

function Pitch({ players, title }) {
  const titulares = players.filter((p) => p.titular);
  const filas = agruparPorFila(titulares);
  // De arriba a abajo: delanteros, centrocampistas, defensas, portero.
  const ordenVisual = [filas[3], filas[2], filas[1], filas[0]];

  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontFamily: `Barlow Condensed, sans-serif`, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
        {title}
      </div>
      {titulares.length === 0 ? (
        <div className={`error-box`}>
          Aún no hay once titular marcado (columna TITULAR) para este equipo en este partido.
        </div>
      ) : (
        <div
          style={{
            background: `var(--turf-dim)`,
            border: `1px solid var(--line)`,
            borderRadius: 10,
            padding: `20px 10px`,
            display: `flex`,
            flexDirection: `column`,
            gap: 18,
          }}
        >
          {ordenVisual.map((fila, i) => (
            <div
              key={i}
              style={{
                display: `flex`,
                justifyContent: `space-evenly`,
                alignItems: `flex-start`,
              }}
            >
              {fila.map((p) => (
                <div
                  key={p.nombre}
                  style={{
                    display: `flex`,
                    flexDirection: `column`,
                    alignItems: `center`,
                    gap: 4,
                    maxWidth: 80,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: `50%`,
                      background: `var(--surface)`,
                      border: `1px solid var(--chalk)`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      textAlign: `center`,
                      color: `var(--chalk)`,
                      fontFamily: `Inter, sans-serif`,
                      lineHeight: 1.2,
                    }}
                  >
                    {p.nombre}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchStatsTable({ list, title }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: `Barlow Condensed, sans-serif`, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
        {title}
      </div>
      <table>
        <thead>
          <tr>
            <th>Jugador</th>
            <th>Min.</th>
            {STAT_ROWS.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.nombre}>
              <td>{p.nombre}</td>
              <td>{fmt(p.minutos)}</td>
              {STAT_ROWS.map((s) => (
                <td key={s.key}>{fmt(p[s.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function SeasonAverageTable({ list, title }) {
  const withAverages = await Promise.all(
    list.map(async (p) => ({
      ...p,
      season: await getPlayerSeasonAverage(p.nombre),
    }))
  );

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: `Barlow Condensed, sans-serif`, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
        {title}
      </div>
      <table>
        <thead>
          <tr>
            <th>Jugador</th>
            <th>PJ</th>
            <th>Min. tot.</th>
            {STAT_ROWS.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {withAverages.map((p) => (
            <tr key={p.nombre}>
              <td>{p.nombre}</td>
              <td>{p.season?.partidosJugados ?? `—`}</td>
              <td>{p.season?.minutosJugados ?? `—`}</td>
              {STAT_ROWS.map((s) => (
                <td key={s.key}>{fmtAvg(p.season?.[s.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontFamily: `Inter, sans-serif`, fontSize: 11, color: `var(--text-muted)`, marginTop: 4 }}>
        Media calculada por 90 minutos jugados, sobre todo el histórico metido en la hoja.
      </div>
    </div>
  );
}

export default async function MatchDetail({ params, searchParams }) {
  const id = params.id;
  const tab = searchParams?.tab === `media` ? `media` : searchParams?.tab === `alineacion` ? `alineacion` : `partido`;
  const match = await getMatchDetail(id);

  if (!match) {
    return (
      <div className={`wrap`}>
        <Link href={`/`} className={`back-link`}>Volver a partidos</Link>
        <div className={`error-box`}>
          No se ha encontrado este partido en la hoja.
        </div>
      </div>
    );
  }

  return (
    <div className={`wrap`}>
      <Link href={`/`} className={`back-link`}>Volver a partidos</Link>

      <div style={{ display: `flex`, alignItems: `center`, justifyContent: `center`, gap: 20, marginBottom: 6 }}>
        <div style={{ display: `flex`, flexDirection: `column`, alignItems: `center`, gap: 8, width: 130 }}>
          <div className={`badge badge-lg`}>{match.equipoLocal.slice(0, 3).toUpperCase()}</div>
          <span style={{ fontSize: 13, textAlign: `center` }}>{match.equipoLocal}</span>
        </div>
        <div style={{ fontFamily: `Barlow Condensed, sans-serif`, fontSize: 28, color: `var(--turf)`, fontWeight: 700 }}>
          {match.golesLocal !== null && match.golesVisitante !== null
            ? `${match.golesLocal} - ${match.golesVisitante}`
            : `vs`}
        </div>
        <div style={{ display: `flex`, flexDirection: `column`, alignItems: `center`, gap: 8, width: 130 }}>
          <div className={`badge badge-lg`}>{match.equipoVisitante.slice(0, 3).toUpperCase()}</div>
          <span style={{ fontSize: 13, textAlign: `center` }}>{match.equipoVisitante}</span>
        </div>
      </div>
      <div style={{ textAlign: `center`, fontSize: 12, color: `var(--text-muted)`, marginBottom: 8 }}>
        {match.jornada && `Jornada ${match.jornada} · `}{match.fecha}
      </div>

      <div className={`tabs`}>
        <Link href={`/partido/${id}?tab=alineacion`} className={`tab ${tab === "alineacion" ? "active" : ""}`}>
          Alineación
        </Link>
        <Link href={`/partido/${id}?tab=partido`} className={`tab ${tab === "partido" ? "active" : ""}`}>
          Este partido
        </Link>
        <Link href={`/partido/${id}?tab=media`} className={`tab ${tab === "media" ? "active" : ""}`}>
          Media temporada
        </Link>
      </div>

      {tab === `alineacion` && (
        <div>
          <div className={`divider`}><span>Once titular</span><div className={`line`} /></div>
          <Pitch players={match.homePlayers} title={match.equipoLocal} />
          <Pitch players={match.awayPlayers} title={match.equipoVisitante} />
        </div>
      )}

      {tab === `partido` && (
        <div>
          <div className={`divider`}><span>Estadísticas de este partido</span><div className={`line`} /></div>
          <MatchStatsTable list={match.homePlayers} title={match.equipoLocal} />
          <MatchStatsTable list={match.awayPlayers} title={match.equipoVisitante} />
        </div>
      )}

      {tab === `media` && (
        <div>
          <div className={`divider`}><span>Media por 90 minutos (temporada)</span><div className={`line`} /></div>
          <SeasonAverageTable list={match.homePlayers} title={match.equipoLocal} />
          <SeasonAverageTable list={match.awayPlayers} title={match.equipoVisitante} />
        </div>
      )}
    </div>
  );
}
