// Un enlace por cada pestaña/jornada que hayas publicado en Google Sheets.
// Para añadir una jornada nueva: publica esa pestaña (Archivo > Compartir >
// Publicar en la Web, eligiendo esa pestaña en concreto y formato CSV),
// y añade el enlace aquí abajo, dentro de este array, como una línea nueva.
const SHEET_CSV_URLS = [
  `https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0HZRcKYCHl-MwPP0TWvJl2_BvCwYpRqA9vQvVOiVx76r1ypSLxsfCqNXgpCV_mRoWUh2Iesnf9bje/pub?output=csv`,
  `https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0HZRcKYCHl-MwPP0TWvJl2_BvCwYpRqA9vQvVOiVx76r1ypSLxsfCqNXgpCV_mRoWUh2Iesnf9bje/pub?gid=1801452787&single=true&output=csv`,
  `https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0HZRcKYCHl-MwPP0TWvJl2_BvCwYpRqA9vQvVOiVx76r1ypSLxsfCqNXgpCV_mRoWUh2Iesnf9bje/pub?gid=908071889&single=true&output=csv`,
];

const REVALIDATE_SECONDS = 60;

const MINUTOS_MINIMOS_PARA_MEDIA = 90;

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === `"`) {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

function toNumber(val) {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

async function fetchOneSheet(url) {
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    throw new Error(
      `No se ha podido leer una de las hojas de datos. Revisa que esté publicada correctamente.`
    );
  }

  const text = await res.text();
  return parseCSV(text);
}

async function getAllRows() {
  const results = await Promise.all(SHEET_CSV_URLS.map(fetchOneSheet));
  return results.flat();
}

function matchId(row) {
  return encodeURIComponent(
    `${row.FECHA}|${row["EQUIPO LOCAL"]}|${row["EQUIPO VISITANTE"]}`
  );
}

function rowToPlayer(row) {
  return {
    nombre: row.JUGADOR,
    equipo: row.EQUIPO,
    minutos: toNumber(row.MINUTOS),
    titular: ["SI", "SÍ"].includes((row.TITULAR || "").toUpperCase()),
    confirmado: ["SI", "SÍ"].includes((row.CONFIRMADO || "").toUpperCase()),
    posicion: (row.POSICION || row["POSICIÓN"] || "").toUpperCase(),
    dorsal: row.DORSAL || "",
    remates: toNumber(row.REMATES),
    rematesPuerta: toNumber(row["REMATE A PUERTA"]),
    entradas: toNumber(row.ENTRADAS),
    faltasCometidas: toNumber(row["FALTAS COMETIDAS"]),
    faltasRecibidas: toNumber(row["FALTAS RECIBIDAS"]),
    paradas: toNumber(row.PARADAS),
  };
}

export async function getMatches() {
  const rows = await getAllRows();
  const seen = new Map();

  for (const row of rows) {
    if (!row.FECHA || !row["EQUIPO LOCAL"] || !row["EQUIPO VISITANTE"]) continue;
    const id = matchId(row);
    if (!seen.has(id)) {
      seen.set(id, {
        id,
        fecha: row.FECHA,
        jornada: row.JORNADA,
        equipoLocal: row["EQUIPO LOCAL"],
        equipoVisitante: row["EQUIPO VISITANTE"],
        golesLocal: null,
        golesVisitante: null,
      });
    }
    const gl = toNumber(row.GOLES_LOCAL);
    const gv = toNumber(row.GOLES_VISITANTE);
    if (gl !== null || gv !== null) {
      const m = seen.get(id);
      if (gl !== null) m.golesLocal = gl;
      if (gv !== null) m.golesVisitante = gv;
    }
  }

  return Array.from(seen.values()).sort(
    (a, b) => new Date(a.fecha) - new Date(b.fecha)
  );
}

export async function getMatchDetail(id) {
  const rows = await getAllRows();
  const matchRows = rows.filter((row) => matchId(row) === id);

  if (matchRows.length === 0) return null;

  const { FECHA: fecha, JORNADA: jornada } = matchRows[0];
  const equipoLocal = matchRows[0]["EQUIPO LOCAL"];
  const equipoVisitante = matchRows[0]["EQUIPO VISITANTE"];

  let golesLocal = null;
  let golesVisitante = null;
  for (const row of matchRows) {
    const gl = toNumber(row.GOLES_LOCAL);
    const gv = toNumber(row.GOLES_VISITANTE);
    if (gl !== null) golesLocal = gl;
    if (gv !== null) golesVisitante = gv;
  }

  const players = matchRows.map(rowToPlayer);

  return {
    id,
    fecha,
    jornada,
    equipoLocal,
    equipoVisitante,
    golesLocal,
    golesVisitante,
    homePlayers: players.filter((p) => p.equipo === equipoLocal),
    awayPlayers: players.filter((p) => p.equipo === equipoVisitante),
  };
}

function tieneEstadisticas(row) {
  const campos = [
    "REMATES",
    "REMATE A PUERTA",
    "ENTRADAS",
    "FALTAS COMETIDAS",
    "FALTAS RECIBIDAS",
    "PARADAS",
  ];
  return campos.some((c) => toNumber(row[c]) !== null);
}

function minutosDeFila(row) {
  const m = toNumber(row.MINUTOS);
  if (m !== null) return m;
  return tieneEstadisticas(row) ? 90 : 0;
}

// Lista de estadísticas que se comparan por equipo. Cuando añadas columnas
// nuevas a la hoja (córners, tarjetas...), añade aquí una línea más con el
// mismo formato y aparecerán solas en las tres comparativas de equipo.
const STAT_KEYS = [
  { key: "remates", col: "REMATES" },
  { key: "rematesPuerta", col: "REMATE A PUERTA" },
  { key: "entradas", col: "ENTRADAS" },
  { key: "faltasCometidas", col: "FALTAS COMETIDAS" },
  { key: "faltasRecibidas", col: "FALTAS RECIBIDAS" },
  { key: "paradas", col: "PARADAS" },
];

export const TEAM_COMPARISON_STATS = [
  { key: "remates", label: "Remates" },
  { key: "rematesPuerta", label: "A puerta" },
];

function mediaPor90(rows) {
  const totalMinutos = rows.reduce((acc, row) => acc + minutosDeFila(row), 0);
  if (!totalMinutos) return null;

  const sum = (col) =>
    rows.reduce((acc, row) => acc + (toNumber(row[col]) || 0), 0);

  const result = {};
  STAT_KEYS.forEach(({ key, col }) => {
    result[key] = (sum(col) / totalMinutos) * 90;
  });
  result._totalMinutos = totalMinutos;
  return result;
}

export async function getPlayerSeasonAverage(playerName) {
  const rows = await getAllRows();
  const playerRows = rows.filter((row) => row.JUGADOR === playerName);

  if (playerRows.length === 0) return null;

  const totalMinutos = playerRows.reduce(
    (acc, row) => acc + minutosDeFila(row),
    0
  );

  const partidosJugados = playerRows.filter(
    (row) => minutosDeFila(row) > 0
  ).length;

  const muestraSuficiente = totalMinutos >= MINUTOS_MINIMOS_PARA_MEDIA;

  const medias = muestraSuficiente ? mediaPor90(playerRows) : null;

  return {
    partidosJugados,
    minutosJugados: totalMinutos,
    muestraSuficiente,
    remates: medias?.remates ?? null,
    rematesPuerta: medias?.rematesPuerta ?? null,
    entradas: medias?.entradas ?? null,
    faltasCometidas: medias?.faltasCometidas ?? null,
    faltasRecibidas: medias?.faltasRecibidas ?? null,
    paradas: medias?.paradas ?? null,
  };
}

// Media "por jugador cada 90 minutos" del equipo entero. No representa el
// total real del equipo por partido — se usa solo como referencia interna
// para comparar el ESTILO del rival frente a la liga (proporción, no cifra
// absoluta). Para mostrar cifras reales de equipo, usa getTeamMatchAverage.
export async function getTeamSeasonAverage(teamName) {
  const rows = await getAllRows();
  const teamRows = rows.filter((row) => row.EQUIPO === teamName);
  if (teamRows.length === 0) return null;
  return mediaPor90(teamRows);
}

// Media REAL del equipo por partido (todos los jugadores sumados en cada
// partido, promediado entre los partidos jugados).
export async function getTeamMatchAverage(teamName) {
  const rows = await getAllRows();
  const teamRows = rows.filter((row) => row.EQUIPO === teamName);
  if (teamRows.length === 0) return null;

  const porPartido = new Map();
  teamRows.forEach((row) => {
    const id = matchId(row);
    if (!porPartido.has(id)) porPartido.set(id, {});
    const entry = porPartido.get(id);
    STAT_KEYS.forEach(({ key, col }) => {
      entry[key] = (entry[key] || 0) + (toNumber(row[col]) || 0);
    });
  });

  const partidos = Array.from(porPartido.values());
  const numPartidos = partidos.length;
  if (numPartidos === 0) return null;

  const result = {};
  STAT_KEYS.forEach(({ key }) => {
    result[key] = partidos.reduce((acc, p) => acc + (p[key] || 0), 0) / numPartidos;
  });
  result._numPartidos = numPartidos;
  return result;
}

export async function getLeagueAverage() {
  const rows = await getAllRows();
  return mediaPor90(rows);
}

const CONTEXTO = {
  remates: { proxy: "entradas", inversa: true },
  rematesPuerta: { proxy: "entradas", inversa: true },
  entradas: { proxy: "remates", inversa: false },
  faltasCometidas: { proxy: "faltasRecibidas", inversa: false },
  faltasRecibidas: { proxy: "faltasCometidas", inversa: false },
  paradas: { proxy: "rematesPuerta", inversa: false },
};

const AJUSTE_MIN = 0.6;
const AJUSTE_MAX = 1.6;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

async function ajustarPorRival(base, rivalTeamName) {
  if (!base) {
    return { base, ajustado: null, sinAjuste: true };
  }

  const rival = await getTeamSeasonAverage(rivalTeamName);
  const liga = await getLeagueAverage();

  if (!rival || !liga || rival._totalMinutos < MINUTOS_MINIMOS_PARA_MEDIA * 2) {
    return { base, ajustado: null, sinAjuste: true };
  }

  const ajustado = {};
  STAT_KEYS.forEach(({ key }) => {
    const valorBase = base[key];
    if (valorBase === null || valorBase === undefined) {
      ajustado[key] = null;
      return;
    }
    const { proxy, inversa } = CONTEXTO[key];
    const rivalVal = rival[proxy];
    const ligaVal = liga[proxy];
    if (!rivalVal || !ligaVal) {
      ajustado[key] = valorBase;
      return;
    }
    let multiplicador = inversa ? ligaVal / rivalVal : rivalVal / ligaVal;
    multiplicador = clamp(multiplicador, AJUSTE_MIN, AJUSTE_MAX);
    ajustado[key] = valorBase * multiplicador;
  });

  return { base, ajustado, sinAjuste: false };
}

export async function getContextualPrediction(playerName, rivalTeamName) {
  const base = await getPlayerSeasonAverage(playerName);
  if (!base || !base.muestraSuficiente) {
    return { base, ajustado: null, sinAjuste: true };
  }
  return ajustarPorRival(base, rivalTeamName);
}

export async function getTeamContextualPrediction(teamName, rivalTeamName) {
  const base = await getTeamMatchAverage(teamName);
  return ajustarPorRival(base, rivalTeamName);
}

export async function getTeamRoster(teamName) {
  const rows = await getAllRows();
  const teamRows = rows.filter((row) => row.EQUIPO === teamName && row.JUGADOR);

  const porJugador = new Map();
  teamRows.forEach((row) => {
    if (!porJugador.has(row.JUGADOR)) {
      porJugador.set(row.JUGADOR, { partidos: 0, titular: 0 });
    }
    const entry = porJugador.get(row.JUGADOR);
    if (minutosDeFila(row) > 0) {
      entry.partidos += 1;
      if (["SI", "SÍ"].includes((row.TITULAR || "").toUpperCase())) {
        entry.titular += 1;
      }
    }
  });

  return Array.from(porJugador.entries()).map(([nombre, { partidos, titular }]) => ({
    nombre,
    esTitularHabitual: partidos > 0 && titular / partidos >= 0.5,
  }));
}

const PALETA_EQUIPOS = [
  "#3FA66B", "#C9A24B", "#5C8FB0", "#B0755C",
  "#7A9E7E", "#A8946E", "#6B93A0", "#94805C",
];

export function colorDeEquipo(nombre) {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETA_EQUIPOS.length;
  return PALETA_EQUIPOS[index];
}

export function inicialesDeEquipo(nombre) {
  const palabras = nombre.trim().split(/\s+/);
  if (palabras.length >= 2) {
    return (palabras[0][0] + palabras[1].slice(0, 2)).toUpperCase();
  }
  return nombre.slice(0, 3).toUpperCase();
}

// Clasificación de la liga, calculada a partir de getMatches(). Se
// recalcula sola cada vez que la hoja tenga más resultados (goles
// rellenados), sin que haya que tocar nada aquí.
export async function getClasificacion() {
  const matches = await getMatches();
  const equipos = new Map();

  function equipoDe(nombre) {
    if (!equipos.has(nombre)) {
      equipos.set(nombre, {
        equipo: nombre,
        pj: 0,
        pg: 0,
        pe: 0,
        pp: 0,
        gf: 0,
        gc: 0,
        resultados: [],
      });
    }
    return equipos.get(nombre);
  }

  matches.forEach((m) => {
    equipoDe(m.equipoLocal);
    equipoDe(m.equipoVisitante);
  });

  const jugados = matches
    .filter((m) => m.golesLocal !== null && m.golesVisitante !== null)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  jugados.forEach((m) => {
    const local = equipoDe(m.equipoLocal);
    const visit = equipoDe(m.equipoVisitante);

    local.pj += 1;
    visit.pj += 1;
    local.gf += m.golesLocal;
    local.gc += m.golesVisitante;
    visit.gf += m.golesVisitante;
    visit.gc += m.golesLocal;

    if (m.golesLocal > m.golesVisitante) {
      local.pg += 1;
      visit.pp += 1;
      local.resultados.push(`G`);
      visit.resultados.push(`P`);
    } else if (m.golesLocal < m.golesVisitante) {
      local.pp += 1;
      visit.pg += 1;
      local.resultados.push(`P`);
      visit.resultados.push(`G`);
    } else {
      local.pe += 1;
      visit.pe += 1;
      local.resultados.push(`E`);
      visit.resultados.push(`E`);
    }
  });

  const tabla = Array.from(equipos.values()).map((e) => ({
    ...e,
    dg: e.gf - e.gc,
    puntos: e.pg * 3 + e.pe,
    ultimos5: e.resultados.slice(-5),
  }));

  tabla.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.equipo.localeCompare(b.equipo);
  });

  return tabla;
}
