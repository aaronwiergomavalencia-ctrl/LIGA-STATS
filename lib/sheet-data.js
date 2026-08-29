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
    posicion: (row.POSICION || "").toUpperCase(),
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
      });
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

  const players = matchRows.map(rowToPlayer);

  return {
    id,
    fecha,
    jornada,
    equipoLocal,
    equipoVisitante,
    homePlayers: players.filter((p) => p.equipo === equipoLocal),
    awayPlayers: players.filter((p) => p.equipo === equipoVisitante),
  };
}

export async function getPlayerSeasonAverage(playerName) {
  const rows = await getAllRows();
  const playerRows = rows.filter((row) => row.JUGADOR === playerName);

  if (playerRows.length === 0) return null;

  const totalMinutos = playerRows.reduce(
    (acc, row) => acc + (toNumber(row.MINUTOS) || 0),
    0
  );

  const sum = (key) =>
    playerRows.reduce((acc, row) => acc + (toNumber(row[key]) || 0), 0);

  const per90 = (key) => {
    if (!totalMinutos) return null;
    return (sum(key) / totalMinutos) * 90;
  };

  return {
    partidosJugados: playerRows.length,
    minutosJugados: totalMinutos,
    remates: per90("REMATES"),
    rematesPuerta: per90("REMATE A PUERTA"),
    entradas: per90("ENTRADAS"),
    faltasCometidas: per90("FALTAS COMETIDAS"),
    faltasRecibidas: per90("FALTAS RECIBIDAS"),
    paradas: per90("PARADAS"),
  };
}
