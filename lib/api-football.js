const BASE_URL = "https://v3.football.api-sports.io";
const LALIGA_ID = 140;
const SEASON = 2023;

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

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(
      `API-Football devolvió un aviso: ${JSON.stringify(data.errors)}`
    );
  }

  return data.response;
}

// Nota: el plan gratuito solo da acceso a temporadas 2022-2024 (ya finalizadas),
// así que aquí mostramos los ÚLTIMOS partidos jugados de esa temporada,
// no "próximos" partidos (no puede haberlos en una temporada ya terminada).
export async function getFixtures() {
  const fixtures = await callApi(
    `/fixtures?league=${LALIGA_ID}&season=${SEASON}&last=10`
  );

  return fixtures.sort(
    (a, b) => new Date(b.fixture.date) - new Date(a.fixture.date)
  );
}

export async function getFixtureTeamStats(fixtureId) {
  return callApi(`/fixtures/statistics?fixture=${fixtureId}`);
}

export async function getFixturePlayerStats(fixtureId) {
  return callApi(`/fixtures/players?fixture=${fixtureId}`);
}

export async function getTeamPlayerAverages(teamId) {
  return callApi(
    `/players?team=${teamId}&season=${SEASON}&league=${LALIGA_ID}`
  );
}
