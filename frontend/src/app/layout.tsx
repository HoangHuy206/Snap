import type { Metadata, Viewport } from "next";
import {
  Baloo_2,
  Charm,
  Dancing_Script,
  Great_Vibes,
  JetBrains_Mono,
  Oswald,
  Pacifico,
  Playfair_Display,
  Plus_Jakarta_Sans,
} from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans-vn",
  subsets: ["latin", "vietnamese"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const dancingScript = Dancing_Script({
  variable: "--font-script-vn",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700"],
  display: "swap",
});

const charm = Charm({
  variable: "--font-charm-vn",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700"],
  display: "swap",
});

const greatVibes = Great_Vibes({
  variable: "--font-greatvibes-vn",
  subsets: ["latin", "vietnamese"],
  weight: "400",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-serif-vn",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const baloo2 = Baloo_2({
  variable: "--font-cute-vn",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "700", "800"],
  display: "swap",
});

const pacifico = Pacifico({
  variable: "--font-pacifico-vn",
  subsets: ["latin", "vietnamese"],
  weight: "400",
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-poster-vn",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VidQR — Tạo QR Video & File Tùy Biến • Tải Video MXH Không Logo",
  description:
    "Biến video và mọi tệp tin thành mã QR tùy biến nổi bật, hỗ trợ Dynamic QR và tải video/ảnh TikTok, YouTube, Instagram, Facebook không dính logo.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("snapqr_theme");var m=document.querySelector('meta[name="color-scheme"]');if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);if(m)m.setAttribute("content",t);}else{document.documentElement.removeAttribute("data-theme");if(m)m.setAttribute("content","light dark");}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} ${dancingScript.variable} ${charm.variable} ${greatVibes.variable} ${playfairDisplay.variable} ${baloo2.variable} ${pacifico.variable} ${oswald.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-[100dvh] flex flex-col antialiased selection:bg-indigo-600 selection:text-white"
      >
        {children}
      </body>
    </html>
  );
}
