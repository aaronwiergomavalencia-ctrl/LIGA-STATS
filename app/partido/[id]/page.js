import Link from "next/link";
import {
  getFixtures,
  getFixtureTeamStats,
  getTeamPlayerAverages,
} from "@/lib/api-football";

const STAT_LABELS = {
  "Shots on Goal": "Remates a puerta",
  "Total Shots": "Remates",
  "Yellow Cards": "Tarjetas amarillas",
  "Red Cards": "Tarjetas rojas",
  "Corner Kicks": "Córners",
  Fouls: "Faltas",
};

function average(totalStats, key, played) {
  if (!played) return null;
  const val = totalStats?.[key];
  if (val === undefined || val === null) return null;
  return (val / played).toFixed(1);
}

export default async function MatchDetail({ params, searchParams }) {
  const fixtureId = params.id;
  const tab = searchParams?.tab === "jugadores" ? "jugadores" : "equipo";

  const fixtures = await getFixtures();
  const fixture = fixtures.find((f) => String(f.fixture.id) === String(fixtureId));

  if (!fixture) {
    return (
      <div className="wrap">
        <Link href="/" className="back-link">← Volver a partidos</Link>
        <div className="error-box">
          No se ha encontrado este partido (puede que ya no esté entre los próximos 10).
        </div>
      </div>
    );
  }

  let teamStats = null;
  let teamStatsError = null;
  try {
    teamStats = await getFixtureTeamStats(fixture.fixture.id);
  } catch (e) {
    teamStatsError = e.message;
  }

  let homePlayers = [];
  let awayPlayers = [];
  let playersError = null;
  if (tab === "jugadores") {
    try {
      const [homeRes, awayRes] = await Promise.all([
        getTeamPlayerAverages(fixture.teams.home.id),
        getTeamPlayerAverages(fixture.teams.away.id),
      ]);
      homePlayers = homeRes;
      awayPlayers = awayRes;
    } catch (e) {
      playersError = e.message;
    }
  }

  return (
    <div className="wrap">
      <Link href="/" className="back-link">← Volver a partidos</Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 6 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 110 }}>
          <div className="badge badge-lg">{fixture.teams.home.name.slice(0, 3).toUpperCase()}</div>
          <span style={{ fontSize: 13, textAlign: "center" }}>{fixture.teams.home.name}</span>
        </div>
        <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 28, color: "var(--text-muted)", fontWeight: 600 }}>
          vs
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 110 }}>
          <div className="badge badge-lg">{fixture.teams.away.name.slice(0, 3).toUpperCase()}</div>
          <span style={{ fontSize: 13, textAlign: "center" }}>{fixture.teams.away.name}</span>
        </div>
      </div>

      <div className="tabs">
        <Link href={`/partido/${fixtureId}?tab=equipo`} className={`tab ${tab === "equipo" ? "active" : ""}`}>
          Resumen equipo
        </Link>
        <Link href={`/partido/${fixtureId}?tab=jugadores`} className={`tab ${tab === "jugadores" ? "active" : ""}`}>
          Jugadores
        </Link>
      </div>

      {tab === "equipo" && (
        <div>
          <div className="divider"><span>Comparativa de equipo</span><div className="line" /></div>
          {teamStatsError && <div className="error-box">No se han podido cargar las estadísticas: {teamStatsError}</div>}
          {teamStats && (
            <table>
              <thead>
                <tr>
                  <th>Estadística</th>
                  <th>{fixture.teams.home.name}</th>
                  <th>{fixture.teams.away.name}</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(STAT_LABELS).map((key) => {
                  const home = teamStats[0]?.statistics.find((s) => s.type === key)?.value ?? "—";
                  const away = teamStats[1]?.statistics.find((s) => s.type === key)?.value ?? "—";
                  return (
                    <tr key={key}>
                      <td>{STAT_LABELS[key]}</td>
                      <td>{home}</td>
                      <td>{away}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "jugadores" && (
        <div>
          <div className="divider"><span>Medias por partido · temporada</span><div className="line" /></div>
          {playersError && <div className="error-box">No se han podido cargar los jugadores: {playersError}</div>}
          {[
            { label: fixture.teams.home.name, list: homePlayers },
            { label: fixture.teams.away.name, list: awayPlayers },
          ].map(({ label, list }) => (
            <div key={label} style={{ marginBottom: 22 }}>
              <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                {label}
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Jugador</th>
                    <th>Remates</th>
                    <th>A puerta</th>
                    <th>Entradas</th>
                    <th>Faltas com.</th>
                    <th>Faltas rec.</th>
                    <th>Paradas</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    const s = p.statistics?.[0];
                    const played = s?.games?.appearences || 0;
                    return (
                      <tr key={p.player.id}>
                        <td>{p.player.name}</td>
                        <td>{average(s?.shots, "total", played) ?? "—"}</td>
                        <td>{average(s?.shots, "on", played) ?? "—"}</td>
                        <td>{average(s?.tackles, "total", played) ?? "—"}</td>
                        <td>{average(s?.fouls, "committed", played) ?? "—"}</td>
                        <td>{average(s?.fouls, "drawn", played) ?? "—"}</td>
                        <td>{average(s?.goals, "saves", played) ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
