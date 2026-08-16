import "./globals.css";

export const metadata = {
  title: "Estadísticas La Liga",
  description: "Estadísticas de jugadores y equipos de La Liga",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
