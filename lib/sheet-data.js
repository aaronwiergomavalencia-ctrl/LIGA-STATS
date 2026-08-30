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
    titular: (row.TITULAR || "").toUpperCase() === "SI",
    confirmado: (row.CONFIRMADO || "").toUpperCase() === "SI",
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

const STAT_KEYS = [
  { key: "remates", col: "REMATES" },
  { key: "rematesPuerta", col: "REMATE A PUERTA" },
  { key: "entradas", col: "ENTRADAS" },
  { key: "faltasCometidas", col: "FALTAS COMETIDAS" },
  { key: "faltasRecibidas", col: "FALTAS RECIBIDAS" },
  { key: "paradas", col: "PARADAS" },
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

export async function getTeamSeasonAverage(teamName) {
  const rows = await getAllRows();
  const teamRows = rows.filter((row) => row.EQUIPO === teamName);
  if (teamRows.length === 0) return null;
  return mediaPor90(teamRows);
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

export async function getContextualPrediction(playerName, rivalTeamName) {
  const base = await getPlayerSeasonAverage(playerName);
  if (!base || !base.muestraSuficiente) {
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
      if ((row.TITULAR || "").toUpperCase() === "SI") {
        entry.titular += 1;
      }
    }
  });

  return Array.from(porJugador.entries()).map(([nombre, { partidos, titular }]) => ({
    nombre,
    esTitularHabitual: partidos > 0 && titular / partidos >= 0.5,
  }));
}

// Genera un color consistente para un equipo a partir de su nombre
// (el mismo equipo siempre da el mismo color, sin necesidad de guardarlo).
const PALETA_EQUIPOS = [
  "#2F9E63", "#D9A441", "#5B8AC9", "#C6553F",
  "#8E6BC9", "#4AAFA0", "#C9598E", "#9AA84E",
];

export function colorDeEquipo(nombre) {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETA_EQUIPOS.length;
  return PALETA_EQUIPOS[index];
}
