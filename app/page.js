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

function PlayerDot({ nombre }) {
  return (
    <div
      style={{
        display: `flex`,
        flexDirection: `column`,
        alignItems: `center`,
        gap: 4,
        maxWidth: 78,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: `50%`,
          background: `var(--surface)`,
          border: `1px solid var(--chalk)`,
        }}
      />
      <span
        style={{
          fontSize: 9.5,
          textAlign: `center`,
          color: `var(--chalk)`,
          fontFamily: `Inter, sans-serif`,
          lineHeight: 1.2,
        }}
      >
        {nombre}
      </span>
    </div>
  );
}

function FilaJugadores({ jugadores }) {
  return (
    <div style={{ display: `flex`, justifyContent: `space-evenly`, alignItems: `flex-start` }}>
      {jugadores.map((p) => (
        <PlayerDot key={p.nombre} nombre={p.nombre} />
      ))}
    </div>
  );
}

function MatchPitch({ homePlayers, awayPlayers, equipoLocal, equipoVisitante }) {
  const homeTitulares = homePlayers.filter((p) => p.titular);
  const awayTitulares = awayPlayers.filter((p) => p.titular);

  if (homeTitulares.length === 0 && awayTitulares.length === 0) {
    return (
      <div className={`error-box`}>
        Aún no hay once titular marcado (columna TITULAR) para este partido.
      </div>
    );
  }

  const homeFilas = agruparPorFila(homeTitulares); // [POR, DEF, CEN, DEL]
  const awayFilas = agruparPorFila(awayTitulares);

  return (
    <div
      style={{
        background: `var(--turf-dim)`,
        border: `1px solid var(--line)`,
        borderRadius: 10,
        overflow: `hidden`,
      }}
    >
      <div style={{ textAlign: `center`, padding: `10px 0 4px`, fontFamily: `Barlow Condensed, sans-serif`, fontSize: 14, color: `var(--chalk)`, fontWeight: 600 }}>
        {equipoVisitante}
      </div>
      {/* Equipo visitante: portero arriba del todo, delanteros hacia el centro */}
      <div style={{ display: `flex`, flexDirection: `column`, gap: 16, padding: `8px 10px 16px` }}>
        <FilaJugadores jugadores={awayFilas[0]} />
        <FilaJugadores jugadores={awayFilas[1]} />
        <FilaJugadores jugadores={awayFilas[2]} />
        <FilaJugadores jugadores={awayFilas[3]} />
      </div>

      {/* Línea de medio campo */}
      <div style={{ position: `relative`, height: 1, background: `var(--line)`, margin: `0 10px` }}>
        <div
          style={{
            position: `absolute`,
            left: `50%`,
            top: `50%`,
            transform: `translate(-50%, -50%)`,
            width: 22,
            height: 22,
            borderRadius: `50%`,
            border: `1px solid var(--line)`,
            background: `var(--turf-dim)`,
          }}
        />
      </div>

      {/* Equipo local: delanteros hacia el centro, portero abajo del todo */}
      <div style={{ display: `flex`, flexDirection: `column`, gap: 16, padding: `16px 10px 8px` }}>
        <FilaJugadores jugadores={homeFilas[3]} />
        <FilaJugadores jugadores={homeFilas[2]} />
        <FilaJugadores jugadores={homeFilas[1]} />
        <FilaJugadores jugadores={homeFilas[0]} />
      </div>
      <div style={{ textAlign: `center`, padding: `4px 0 10px`, fontFamily: `Barlow Condensed, sans-serif`, fontSize: 14, color: `var(--chalk)`, fontWeight: 600 }}>
        {equipoLocal}
      </div>
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
  const tab = searchParams?.tab === `media` ? `media` : searchParams?.tab === `alineacion` ?
