import Link from "next/link";
import { getMatchDetail, getPlayerSeasonAverage, getContextualPrediction, getTeamRoster } from "@/lib/sheet-data";

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
      }}
    />
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

  const homeFilas = agruparPorFila(homeTitulares);
  const awayFilas = agruparPorFila(awayTitulares);
  const HOME_COLOR = `var(--turf)`;
  const AWAY_COLOR = `var(--amber)`;

  return (
    <div
      style={{
        position: `relative`,
        background: `var(--turf-dim)`,
        border: `2px solid rgba(233, 239, 234, 0.35)`,
        borderRadius: 10,
        overflow: `hidden`,
      }}
    >
      <div style={{ textAlign: `center`, padding: `10px 0 0` }}>
        <div style={{ fontFamily: `Roboto Mono, monospace`, fontSize: 11, color: AWAY_COLOR, fontWeight: 700 }}>
          {formacion(awayFilas)}
        </div>
        <div style={{ fontFamily: `Barlow Condensed, sans-serif`, fontSize: 14, color: `var(--chalk)`, fontWeight: 600 }}>
          {equipoVisitante}
        </div>
      </div>

      <div style={{ position: `relative`, padding: `10px 10px 22px` }}>
        <AreaPenalti arriba />
        <div style={{ display: `flex`, flexDirection: `column`, gap: 20 }}>
          <FilaJugadores jugadores={awayFilas[0]} color={AWAY_COLOR} />
          <FilaJugadores jugadores={awayFilas[1]} color={AWAY_COLOR} />
          <FilaJugadores jugadores={awayFilas[2]} color={AWAY_COLOR} />
          <FilaJugadores jugadores={awayFilas[3]} color={AWAY_COLOR} />
        </div>
      </div>

      <div style={{ position: `relative`, height: 1, background: `rgba(233, 239, 234, 0.35)`, margin: `0 10px` }}>
        <div
          style={{
            position: `absolute`,
            left: `50%`,
            top: `50%`,
            transform: `translate(-50%, -50%)`,
            width: 34,
            height: 34,
            borderRadius: `50%`,
            border: `1px solid rgba(233, 239, 234, 0.35)`,
            background: `var(--turf-dim)`,
          }}
        />
      </div>

      <div style={{ position: `relative`, padding: `22px 10px 10px` }}>
        <div style={{ display: `flex`, flexDirection: `column`, gap: 20 }}>
          <FilaJugadores jugadores={homeFilas[3]} color={HOME_COLOR} />
          <FilaJugadores jugadores={homeFilas[2]} color={HOME_COLOR} />
          <FilaJugadores jugadores={homeFilas[1]} color={HOME_COLOR} />
          <FilaJugadores jugadores={homeFilas[0]} color={HOME_COLOR} />
        </div>
        <AreaPenalti />
      </div>

      <div style={{ textAlign: `center`, padding: `0 0 10px` }}>
        <div style={{ fontFamily: `Barlow Condensed, sans-serif`, fontSize: 14, color: `var(--chalk)`, fontWeight: 600 }}>
          {equipoLocal}
        </div>
        <div style={{ fontFamily: `Roboto Mono, monospace`, fontSize: 11, color: HOME_COLOR, fontWeight: 700 }}>
          {formacion(homeFilas)}
        </div>
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

function flechaCambio(base, ajustado) {
  if (base === null || ajustado === null || base === undefined || ajustado === undefined) return ``;
  const diff = ajustado - base;
  if (Math.abs(diff) < 0.05) return `→`;
  return diff > 0 ? `↑` : `↓`;
}

function colorCambio(base, ajustado) {
  if (base === null || ajustado === null) return `var(--text-muted)`;
  const diff = ajustado - base;
  if (Math.abs(diff) < 0.05) return `var(--text-sec)`;
  return diff > 0 ? `var(--turf)` : `var(--brick, #C6553F)`;
}

function TablaJugadoresProbabilidad({ jugadores, subtitulo }) {
  if (jugadores.length === 0) {
    return (
      <div style={{ fontSize: 12, color: `var(--text-muted)`, marginBottom: 12 }}>
        Sin jugadores en este grupo todavía.
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: `Inter, sans-serif`, fontSize: 12, color: `var(--text-sec)`, marginBottom: 6, textTransform: `uppercase`, letterSpacing: `0.04em` }}>
        {subtitulo}
      </div>
      <table>
        <thead>
          <tr>
            <th>Jugador</th>
            {STAT_ROWS.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jugadores.map((p) => (
            <tr key={p.nombre}>
              <td>{p.nombre}</td>
              {STAT_ROWS.map((s) => {
                const base = p.pred?.base?.[s.key];
                const ajustado = p.pred?.sinAjuste ? base : p.pred?.ajustado?.[s.key];
                return (
                  <td key={s.key}>
                    {ajustado === null || ajustado === undefined ? (
                      `—`
                    ) : (
                      <span>
                        {ajustado.toFixed(2)}{` `}
                        <span style={{ color: colorCambio(base, ajustado), fontSize: 10 }}>
                          {flechaCambio(base, ajustado)}
                        </span>
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function ContextualTable({ teamName, title, rivalName }) {
  const roster = await getTeamRoster(teamName);

  const withPredictions = await Promise.all(
    roster.map(async (j) => ({
      ...j,
      pred: await getContextualPrediction(j.nombre, rivalName),
    }))
  );

  const titulares = withPredictions.filter((p) => p.esTitularHabitual);
  const suplentes = withPredictions.filter((p) => !p.esTitularHabitual);

  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontFamily: `Barlow Condensed, sans-serif`, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
        {title} <span style={{ fontSize: 12, color: `var(--text-muted)`, fontWeight: 400 }}>vs {rivalName}</span>
      </div>
      <TablaJugadoresProbabilidad jugadores={titulares} subtitulo={`Titulares habituales`} />
      <TablaJugadoresProbabilidad jugadores={suplentes} subtitulo={`Suplentes`} />
      <div style={{ fontFamily: `Inter, sans-serif`, fontSize: 11, color: `var(--text-muted)`, marginTop: 4 }}>
        "Titular" = ha empezado la mitad o más de los partidos que jugó esta temporada. Media ajustada según el estilo del rival comparado con la liga.
      </div>
    </div>
  );
}

export default async function MatchDetail({ params, searchParams }) {
  const id = params.id;
  const tabParam = searchParams?.tab;
  const tab =
    tabParam === `media` ? `media` :
    tabParam === `alineacion` ? `alineacion` :
    tabParam === `probabilidad` ? `probabilidad` :
    `partido`;
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

  const algunoSinConfirmar = [...match.homePlayers, ...match.awayPlayers]
    .filter((p) => p.titular)
    .some((p) => !p.confirmado);

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

      <div className={`tabs`} style={{ flexWrap: `wrap` }}>
        <Link href={`/partido/${id}?tab=alineacion`} className={`tab ${tab === "alineacion" ? "active" : ""}`}>
          Alineación
        </Link>
        <Link href={`/partido/${id}?tab=partido`} className={`tab ${tab === "partido" ? "active" : ""}`}>
          Este partido
        </Link>
        <Link href={`/partido/${id}?tab=media`} className={`tab ${tab === "media" ? "active" : ""}`}>
          Media temporada
        </Link>
        <Link href={`/partido/${id}?tab=probabilidad`} className={`tab ${tab === "probabilidad" ? "active" : ""}`}>
          Probabilidad
        </Link>
      </div>

      {tab === `alineacion` && (
        <div>
          <div className={`divider`}><span>Once titular</span><div className={`line`} /></div>
          {algunoSinConfirmar && (
            <div style={{ background: `rgba(217, 164, 65, 0.12)`, border: `1px solid var(--amber)`, borderRadius: 8, padding: `8px 12px`, marginBottom: 12, fontSize: 12, color: `var(--amber)` }}>
              ⚠ Once probable, aún sin confirmar oficialmente
            </div>
          )}
          <MatchPitch
            homePlayers={match.homePlayers}
            awayPlayers={match.awayPlayers}
            equipoLocal={match.equipoLocal}
            equipoVisitante={match.equipoVisitante}
          />
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

      {tab === `probabilidad` && (
        <div>
          <div className={`divider`}><span>Probabilidad ajustada por rival</span><div className={`line`} /></div>
          <ContextualTable teamName={match.equipoLocal} title={match.equipoLocal} rivalName={match.equipoVisitante} />
          <ContextualTable teamName={match.equipoVisitante} title={match.equipoVisitante} rivalName={match.equipoLocal} />
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

function flechaCambio(base, ajustado) {
  if (base === null || ajustado === null || base === undefined || ajustado === undefined) return ``;
  const diff = ajustado - base;
  if (Math.abs(diff) < 0.05) return `→`;
  return diff > 0 ? `↑` : `↓`;
}

function colorCambio(base, ajustado) {
  if (base === null || ajustado === null) return `var(--text-muted)`;
  const diff = ajustado - base;
  if (Math.abs(diff) < 0.05) return `var(--text-sec)`;
  return diff > 0 ? `var(--turf)` : `var(--brick, #C6553F)`;
}

function TablaJugadoresProbabilidad({ jugadores, subtitulo }) {
  if (jugadores.length === 0) {
    return (
      <div style={{ fontSize: 12, color: `var(--text-muted)`, marginBottom: 12 }}>
        Sin jugadores en este grupo todavía.
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: `Inter, sans-serif`, fontSize: 12, color: `var(--text-sec)`, marginBottom: 6, textTransform: `uppercase`, letterSpacing: `0.04em` }}>
        {subtitulo}
      </div>
      <table>
        <thead>
          <tr>
            <th>Jugador</th>
            {STAT_ROWS.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jugadores.map((p) => (
            <tr key={p.nombre}>
              <td>{p.nombre}</td>
              {STAT_ROWS.map((s) => {
                const base = p.pred?.base?.[s.key];
                const ajustado = p.pred?.sinAjuste ? base : p.pred?.ajustado?.[s.key];
                return (
                  <td key={s.key}>
                    {ajustado === null || ajustado === undefined ? (
                      `—`
                    ) : (
                      <span>
                        {ajustado.toFixed(2)}{` `}
                        <span style={{ color: colorCambio(base, ajustado), fontSize: 10 }}>
                          {flechaCambio(base, ajustado)}
                        </span>
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function ContextualTable({ teamName, title, rivalName, matchPlayers }) {
  const roster = await getTeamRoster(teamName);
  const enEstePartido = new Map(matchPlayers.map((p) => [p.nombre, p.titular]));

  const withPredictions = await Promise.all(
    roster.map(async (j) => {
      const esTitular = enEstePartido.has(j.nombre)
        ? enEstePartido.get(j.nombre)
        : j.esTitularHabitual;
      return {
        ...j,
        esTitular,
        pred: await getContextualPrediction(j.nombre, rivalName),
      };
    })
  );

  const titulares = withPredictions.filter((p) => p.esTitular);
  const suplentes = withPredictions.filter((p) => !p.esTitular);

  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontFamily: `Barlow Condensed, sans-serif`, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
        {title} <span style={{ fontSize: 12, color: `var(--text-muted)`, fontWeight: 400 }}>vs {rivalName}</span>
      </div>
      <TablaJugadoresProbabilidad jugadores={titulares} subtitulo={`Titulares`} />
      <TablaJugadoresProbabilidad jugadores={suplentes} subtitulo={`Suplentes`} />
      <div style={{ fontFamily: `Inter, sans-serif`, fontSize: 11, color: `var(--text-muted)`, marginTop: 4 }}>
        Si el jugador tiene TITULAR marcado en este partido, se usa ese dato. Si no aparece en este partido, se usa si suele ser titular en el resto de la temporada.
      </div>
    </div>
  );
}

export default async function MatchDetail({ params, searchParams }) {
  const id = params.id;
  const tabParam = searchParams?.tab;
  const tab =
    tabParam === `media` ? `media` :
    tabParam === `alineacion` ? `alineacion` :
    tabParam === `probabilidad` ? `probabilidad` :
    `partido`;
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

  const algunoSinConfirmar = [...match.homePlayers, ...match.awayPlayers]
    .filter((p) => p.titular)
    .some((p) => !p.confirmado);

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

      <div className={`tabs`} style={{ flexWrap: `wrap` }}>
        <Link href={`/partido/${id}?tab=alineacion`} className={`tab ${tab === "alineacion" ? "active" : ""}`}>
          Alineación
        </Link>
        <Link href={`/partido/${id}?tab=partido`} className={`tab ${tab === "partido" ? "active" : ""}`}>
          Este partido
        </Link>
        <Link href={`/partido/${id}?tab=media`} className={`tab ${tab === "media" ? "active" : ""}`}>
          Media temporada
        </Link>
        <Link href={`/partido/${id}?tab=probabilidad`} className={`tab ${tab === "probabilidad" ? "active" : ""}`}>
          Probabilidad
        </Link>
      </div>

      {tab === `alineacion` && (
        <div>
          <div className={`divider`}><span>Once titular</span><div className={`line`} /></div>
          {algunoSinConfirmar && (
            <div style={{ background: `rgba(217, 164, 65, 0.12)`, border: `1px solid var(--amber)`, borderRadius: 8, padding: `8px 12px`, marginBottom: 12, fontSize: 12, color: `var(--amber)` }}>
              ⚠ Once probable, aún sin confirmar oficialmente
            </div>
          )}
          <MatchPitch
            homePlayers={match.homePlayers}
            awayPlayers={match.awayPlayers}
            equipoLocal={match.equipoLocal}
            equipoVisitante={match.equipoVisitante}
          />
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

      {tab === `probabilidad` && (
        <div>
          <div className={`divider`}><span>Probabilidad ajustada por rival</span><div className={`line`} /></div>
          <ContextualTable teamName={match.equipoLocal} title={match.equipoLocal} rivalName={match.equipoVisitante} matchPlayers={match.homePlayers} />
          <ContextualTable teamName={match.equipoVisitante} title={match.equipoVisitante} rivalName={match.equipoLocal} matchPlayers={match.awayPlayers} />
        </div>
      )}
    </div>
  );
}
