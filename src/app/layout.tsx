import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const display = Barlow_Condensed({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "Instagram Studio",
  description: "Piano editoriale e promemoria per @ernestwhoo e @ernestwhoo.creative",
  appleWebApp: { capable: true, title: "Studio", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f12" },
  ],
};

// Applica il tema prima del primo disegno, per evitare il lampo bianco.
const scriptTema = `try{var t=localStorage.getItem("tema");if(t==="scuro"||(t!=="chiaro"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${inter.variable} ${display.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
