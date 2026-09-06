import Link from "next/link";
import { getPlayerSeasonAverage, getPlayerMatchHistory } from "@/lib/sheet-data";

function fmt(val) {
  return val === null || val === undefined ? "—" : val;
}

function fmtAvg(val) {
  return val === null || val === undefined ? "—" : val.toFixed(2);
}

export default async function FichaJugador({ params }) {
  const nombre = decodeURIComponent(params.nombre);

  const [season, historial] = await Promise.all([
    getPlayerSeasonAverage(nombre),
    getPlayerMatchHistory(nombre),
  ]);

  if (!season && historial.length === 0) {
    return (
      <div className={`wrap`}>
        <Link href={`/jugadores`} className={`back-link`}>Volver a jugadores</Link>
        <div className={`error-box`}>No se ha encontrado a este jugador en la hoja.</div>
      </div>
    );
  }

  return (
    <div className={`wrap`}>
      <Link href={`/jugadores`} className={`back-link`}>Volver a jugadores</Link>
      <div className={`title`}>{nombre}</div>
      <div className={`subtitle`}>
        {season?.partidosJugados ?? 0} partidos jugados · {season?.minutosJugados ?? 0} minutos totales
      </div>

      <div className={`divider`}><span>Media por 90 minutos (temporada)</span><div className={`line`} /></div>
      {season?.muestraSuficiente ? (
        <table>
          <thead>
            <tr>
              <th>Remates</th>
              <th>A puerta</th>
              <th>Entradas</th>
              <th>Faltas com.</th>
              <th>Faltas rec.</th>
              <th>Paradas</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{fmtAvg(season.remates)}</td>
              <td>{fmtAvg(season.rematesPuerta)}</td>
              <td>{fmtAvg(season.entradas)}</td>
              <td>{fmtAvg(season.faltasCometidas)}</td>
              <td>{fmtAvg(season.faltasRecibidas)}</td>
              <td>{fmtAvg(season.paradas)}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <div className={`error-box`}>
          Aún no ha jugado los minutos suficientes (mínimo 90) para tener una media fiable.
        </div>
      )}

      <div className={`divider`}><span>Partido a partido</span><div className={`line`} /></div>
      <div style={{ overflowX: `auto` }}>
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: `left` }}>Partido</th>
              <th>Min.</th>
              <th>Remates</th>
              <th>A puerta</th>
              <th>Entradas</th>
              <th>Faltas com.</th>
              <th>Faltas rec.</th>
              <th>Paradas</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((h) => (
              <tr key={h.id}>
                <td style={{ textAlign: `left` }}>
                  <Link href={`/partido/${h.id}`} style={{ color: `inherit`, textDecoration: `none` }}>
                    <span style={{ color: `var(--text-muted)` }}>J{h.jornada}</span> {h.esLocal ? `vs` : `@`} {h.rival}
                  </Link>
                </td>
                <td>{fmt(h.minutos)}</td>
                <td>{fmt(h.remates)}</td>
                <td>{fmt(h.rematesPuerta)}</td>
                <td>{fmt(h.entradas)}</td>
                <td>{fmt(h.faltasCometidas)}</td>
                <td>{fmt(h.faltasRecibidas)}</td>
                <td>{fmt(h.paradas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
