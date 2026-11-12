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
import { getSiteUrl, SITE_INFO } from "@/lib/site";

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

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_INFO.name} — ${SITE_INFO.tagline}`,
    template: `%s | ${SITE_INFO.name}`,
  },
  description: SITE_INFO.description,
  applicationName: SITE_INFO.fullName,
  alternates: {
    canonical: "/",
  },
  keywords: [
    "VidQR",
    "VidQR Studio",
    "tạo mã QR video",
    "tạo QR động",
    "dynamic QR code",
    "đưa video thành mã QR",
    "tải video TikTok không logo",
    "tải video YouTube Shorts",
    "tải video Instagram Reels",
    "tải video Facebook",
    "tạo mã QR có khung viền",
    "xuất QR SVG PNG",
  ],
  openGraph: {
    type: "website",
    locale: SITE_INFO.locale,
    url: siteUrl,
    siteName: SITE_INFO.fullName,
    title: `${SITE_INFO.name} — ${SITE_INFO.tagline}`,
    description: SITE_INFO.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_INFO.name} — ${SITE_INFO.tagline}`,
    description: SITE_INFO.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: "m5coQsYKy0TSp1gTbsLylOVhq5OdHe_dohaiFqbQy0k",
    other: {
      "msvalidate.01": "ADA3569C6B7F9CC483268E79D56EBE32",
    },
  },
};

const GLOBAL_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: SITE_INFO.fullName,
      alternateName: SITE_INFO.name,
      inLanguage: "vi",
      description: SITE_INFO.description,
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#webapp`,
      name: SITE_INFO.fullName,
      url: siteUrl,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "All",
      browserRequirements: "Requires JavaScript. Supports modern desktop and mobile browsers.",
      inLanguage: "vi",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "VND",
      },
      featureList: [
        "Tạo mã QR Động cho Video (MP4, MOV, WebM), PDF, Ảnh HD, Audio và ZIP tối đa 200 MB",
        "Đổi tệp đính kèm bên trong mã QR mà không cần in lại QR mới",
        "Tùy biến kiểu chấm, phối màu Gradient, gắn logo giữa tâm và khung viền chủ đề",
        "Xuất mã QR PNG độ phân giải cao và Vector SVG sắc nét",
        "Tải video và ảnh TikTok, Douyin, YouTube Shorts, Instagram Reels, Facebook, X không dính logo",
      ],
    },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(GLOBAL_STRUCTURED_DATA),
          }}
        />
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
