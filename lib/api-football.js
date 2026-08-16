const BASE_URL = "https://v3.football.api-sports.io";
const LALIGA_ID = 140;
const SEASON = 2026;

// Cuántos segundos se guardan los datos antes de volver a pedirlos a la API.
// 900 segundos = 15 minutos. Súbelo si quieres gastar menos peticiones,
// bájalo si quieres datos más frescos (pero ojo al límite de 100/día).
const REVALIDATE_SECONDS = 900;

async function callApi(path) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    throw new Error(
      "Falta la variable de entorno API_FOOTBALL_KEY. Revisa la configuración en Vercel."
    );
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "x-apisports-key": key,
    },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    throw new Error(`Error llamando a API-Football (${path}): ${res.status}`);
  }

  const data = await res.json();
  return data.response;
}

// Lista de próximos partidos y en juego de La Liga.
export async function getFixtures() {
  const next = await callApi(
    `/fixtures?league=${LALIGA_ID}&season=${SEASON}&next=10`
  );
  const live = await callApi(
    `/fixtures?league=${LALIGA_ID}&season=${SEASON}&live=all`
  );

  const liveIds = new Set(live.map((f) => f.fixture.id));
  const merged = [
    ...live,
    ...next.filter((f) => !liveIds.has(f.fixture.id)),
  ];

  return merged.sort(
    (a, b) => new Date(a.fixture.date) - new Date(b.fixture.date)
  );
}

// Estadísticas de equipo (remates, tarjetas, córners...) para un partido concreto.
export async function getFixtureTeamStats(fixtureId) {
  return callApi(`/fixtures/statistics?fixture=${fixtureId}`);
}

// Estadísticas por jugador dentro de ese partido concreto (si ya se está jugando o ha terminado).
export async function getFixturePlayerStats(fixtureId) {
  return callApi(`/fixtures/players?fixture=${fixtureId}`);
}

// Medias de temporada de los jugadores de un equipo (para partidos que aún no han empezado).
export async function getTeamPlayerAverages(teamId) {
  return callApi(
    `/players?team=${teamId}&season=${SEASON}&league=${LALIGA_ID}`
  );
}
