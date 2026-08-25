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
  return val === null || val === undefined ? "—" : val.toFixed(1);
}

async function PlayerTable({ list, title }) {
  const withAverages = await Promise.all(
    list.map(async (p) => ({
      ...p,
      season: await getPlayerSeasonAverage(p.nombre),
    }))
  );

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
        {title}
      </div>
      <table>
        <thead>
          <tr>
            <th>Jugador</th>
            <th>PJ</th>
            {STAT_ROWS.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {withAverages.map((p) => (
            <tr key={p.nombre}>
              <td>{p.nombre}</td>
              <td>{p.season?.partidosJugados ?? "—"}</td>
              {STAT_ROWS.map((s) => (
                <td key={s.key}>{fmt(p[s.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
        Stats de este partido concreto. PJ = partidos jugados en total en la hoja.
      </div>
    </div>
  );
}

export default async function MatchDetail({ params }) {
  const id = params.id;
  const match = await getMatchDetail(id);

  if (!match) {
    return (
      <div className="wrap">
        <Link href="/" className="back-link">← Volver a partidos</Link>
        <div className="error-box">
          No se ha encontrado este partido en la hoja.
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <Link href="/"
