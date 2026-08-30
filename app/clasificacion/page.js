import Link from "next/link";
import { getClasificacion, inicialesDeEquipo } from "@/lib/sheet-data";

function CirculosForma({ resultados }) {
  const ultimos = resultados.slice(-5);
  const relleno = Array(5 - ultimos.length).fill(null);
  const padded = [...relleno, ...ultimos];

  const colorFor = (r) => {
    if (r === `G`) return `var(--turf)`;
    if (r === `P`) return `#C6553F`;
    if (r === `E`) return `#8fa096`;
    return `#1c2921`;
  };

  return (
    <div style={{ display: `flex`, gap: 4, justifyContent: `center` }}>
      {padded.map((r, i) => (
        <div
          key={i}
          title={r === `G` ? `Ganado` : r === `P` ? `Perdido` : r === `E` ? `Empate` : `Sin partido`}
          style={{
            width: 12,
            height: 12,
            borderRadius: `50%`,
            background: colorFor(r),
            border: r ? `none` : `1px solid var(--line)`,
          }}
        />
      ))}
    </div>
  );
}

export default async function Clasificacion() {
  let tabla = [];
  let error = null;

  try {
    tabla = await getClasificacion();
  } catch (e) {
    error = e.message;
  }

  return (
    <div className={`wrap`}>
      <Link href={`/`} className={`back-link`}>Volver a partidos</Link>
      <div className={`title`}>Clasificación</div>
      <div className={`subtitle`}>Se actualiza sola según vayas metiendo resultados</div>

      {error && (
        <div className={`error-box`}>
          No se ha podido cargar la clasificación: {error}
        </div>
      )}

      {!error && (
        <div style={{ overflowX: `auto`, marginTop: 20 }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th style={{ textAlign: `left` }}>Equipo</th>
                <th>PJ</th>
                <th>PG</th>
                <th>PE</th>
                <th>PP</th>
                <th>GF</th>
                <th>GC</th>
                <th>DG</th>
                <th>Pts</th>
                <th>Últimos 5</th>
              </tr>
            </thead>
            <tbody>
              {tabla.map((e, i) => (
                <tr key={e.equipo}>
                  <td>{i + 1}</td>
                  <td style={{ textAlign: `left` }}>
                    <div style={{ display: `flex`, alignItems: `center`, gap: 8 }}>
                      <div className={`badge`} style={{ width: 22, height: 22, fontSize: 9 }}>
                        {inicialesDeEquipo(e.equipo)}
                      </div>
                      {e.equipo}
                    </div>
                  </td>
                  <td>{e.pj}</td>
                  <td>{e.pg}</td>
                  <td>{e.pe}</td>
                  <td>{e.pp}</td>
                  <td>{e.gf}</td>
                  <td>{e.gc}</td>
                  <td>{e.dg > 0 ? `+${e.dg}` : e.dg}</td>
                  <td style={{ fontWeight: 700, color: `var(--turf)` }}>{e.puntos}</td>
                  <td><CirculosForma resultados={e.ultimos5} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
