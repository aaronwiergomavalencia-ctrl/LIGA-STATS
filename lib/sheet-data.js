const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0HZRcKYCHl-MwPP0TWvJl2_BvCwYpRqA9vQvVOiVx76r1ypSLxsfCqNXgpCV_mRoWUh2Iesnf9bje/pub?output=csv";

// Cada cuántos segundos se vuelve a leer la hoja. 60 = 1 minuto.
const REVALIDATE_SECONDS = 60;

// Parser sencillo de CSV (soporta comillas por si algún equipo lleva comas).
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
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

async function getAllRows() {
  const res = await fetch(SHEET_CSV_URL, {
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    throw new Error(
      "No se ha podido leer la hoja de datos. Revisa que esté publicada correctamente."
    );
  }

  const text = await res.text();
  return parseCSV(text);
}

function matchId(row) {
  return encodeURIComponent(
    `${row.FECHA}|${row["EQUIPO LOCAL"]}|${row["EQUIPO VISITANTE"]}`
  );
}

// Lista de partidos únicos, ordenados de más antiguo a más reciente.
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

// Detalle de un partido: jugadores de cada equipo con sus stats de ESE partido.
export async function getMatchDetail(id) {
  const rows = await getAllRows();
  const matchRows = rows.filter((row) => matchId(row) === id);

  if (matchRows.length === 0) return null;

  const { FECHA: fecha, JORNADA: jornada } = matchRows[0];
  const equipoLocal = matchRows[0]["EQUIPO LOCAL"];
  const equipoVisitante = matchRows[0]["EQUIPO VISITANTE"];

  const players = matchRows.map((row) => ({
    nombre: row.JUGADOR,
    equipo: row.EQUIPO,
    remates: toNumber(row.REMATES),
    rematesPuerta: toNumber(row["REMATE A PUERTA"]),
    entradas: toNumber(row.ENTRADAS),
    faltasCometidas: toNumber(row["FALTAS COMETIDAS"]),
    faltasRecibidas: toNumber(row["FALTAS RECIBIDAS"]),
    paradas: toNumber(row.PARADAS),
  }));

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

// Medias de temporada de un jugador, calculadas sobre todos sus partidos en la hoja.
export async function getPlayerSeasonAverage(playerName) {
  const rows = await getAllRows();
  const playerRows = rows.filter((row) => row.JUGADOR === playerName);

  if (playerRows.length === 0) return null;

  const sum = (key) =>
    playerRows.reduce((acc, row) => acc + (toNumber(row[key]) || 0), 0);

  const played = playerRows.length;

  return {
    partidosJugados: played,
    remates: sum("REMATES") / played,
    rematesPuerta: sum("REMATE A PUERTA") / played,
    entradas: sum("ENTRADAS") / played,
    faltasCometidas: sum("FALTAS COMETIDAS") / played,
    faltasRecibidas: sum("FALTAS RECIBIDAS") / played,
    paradas: sum("PARADAS") / played,
  };
}
