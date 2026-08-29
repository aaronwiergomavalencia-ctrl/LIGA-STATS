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

function formacion(filas) {
  // filas = [POR, DEF, CEN, DEL]. El sistema no cuenta al portero.
  return [filas[1].length, filas[2].length, filas[3].length]
    .filter((n) => n > 0)
    .join(`-`);
}

function PlayerDot({ nombre, dorsal, color }) {
  return (
    <div
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
          width: 32,
          height: 32,
          borderRadius: `50%`,
          background: `var(--surface)`,
          border: `2px solid ${color}`,
          display: `flex`,
          alignItems: `center`,
          justifyContent: `center`,
          fontFamily: `Roboto Mono, monospace`,
          fontSize: 11,
          fontWeight: 700,
          color: `var(--chalk)`,
        }}
      >
        {dorsal || ``}
      </div>
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

function FilaJugadores({ jugadores, color }) {
  return (
    <div style={{ display: `flex`, justifyContent: `space-evenly`, alignItems: `flex-start` }}>
      {jugadores.map((p) => (
        <PlayerDot key={p.nombre} nombre={p.nombre} dorsal={p.dorsal} color={color} />
      ))}
    </div>
  );
}

function AreaPenalti({ arriba }) {
  return (
    <div
      style={{
        position: `absolute`,
        left: `50%`,
        transform: `translateX(-50%)`,
        [arriba ? `top` : `bottom`]: 0,
        width: `56%`,
        height: 44,
        border: `1px solid rgba(233, 239, 234, 0.25)`,
        borderTop: arriba ? `none` : undefined,
        borderBottom: arriba ? undefined : `none`,
      }}
    />
  );
}
