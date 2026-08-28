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
