import Link from "next/link";
import { getAllPlayerNames } from "@/lib/sheet-data";

export default async function Jugadores({ searchParams }) {
  const q = (searchParams?.q || ``).toLowerCase();
  const nombres = await getAllPlayerNames();
  const filtrados = q ? nombres.filter((n) => n.toLowerCase().includes(q)) : nombres;

  return (
    <div className={`wrap`}>
      <Link href={`/`} className={`back-link`}>Volver a partidos</Link>
      <div className={`title`}>Jugadores</div>
      <div className={`subtitle`}>Busca un jugador para ver su ficha completa</div>

      <form action={`/jugadores`} method="GET" style={{ marginTop: 16, marginBottom: 20 }}>
        <input
          type="text"
          name="q"
          defaultValue={searchParams?.q || ``}
          placeholder="Buscar jugador..."
          style={{
            width: `100%`,
            boxSizing: `border-box`,
            padding: `10px 14px`,
            borderRadius: 8,
            border: `1px solid var(--line)`,
            background: `var(--surface)`,
            color: `var(--chalk)`,
            fontSize: 14,
            fontFamily: `Inter, sans-serif`,
          }}
        />
      </form>

      <div style={{ display: `flex`, flexDirection: `column`, gap: 8 }}>
        {filtrados.map((nombre) => (
          <Link
            key={nombre}
            href={`/jugador/${encodeURIComponent(nombre)}`}
            style={{
              display: `block`,
              padding: `12px 16px`,
              background: `var(--surface)`,
              border: `1px solid var(--line)`,
              borderRadius: 8,
              color: `var(--chalk)`,
              textDecoration: `none`,
              fontSize: 14,
            }}
          >
            {nombre}
          </Link>
        ))}
        {filtrados.length === 0 && (
          <div className={`error-box`}>No se ha encontrado ningún jugador con ese nombre.</div>
        )}
      </div>
    </div>
  );
}
