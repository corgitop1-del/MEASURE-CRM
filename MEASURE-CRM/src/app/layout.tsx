import type { ReactNode } from "react";
export const metadata = { title: "STRUCTURA MEASURE", description: "Розкладка підлоги" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk">
      <body style={{ margin: 0, background: "#0A0A0A", color: "#f2f2f2", fontFamily: "system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
