import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Stesso carattere del gestionale: grottesco, pesante nei titoli.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"] });

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
    { media: "(prefers-color-scheme: light)", color: "#f2f2f2" },
    { media: "(prefers-color-scheme: dark)", color: "#161616" },
  ],
};

// Applica il tema prima del primo disegno, per evitare il lampo bianco.
const scriptTema = `try{var t=localStorage.getItem("tema");if(t==="scuro"||(t!=="chiaro"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${archivo.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
