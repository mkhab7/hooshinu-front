import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "هوشینو | Hooshinu — AI Platform",
  description:
    "گفتگو با مدل‌های هوش مصنوعی، تولید تصویر و ویدیو، کیف پول اعتباری و اشتراک‌ها. Chat with AI models, generate media, and manage your credit wallet.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className="dark">
      <head>
        {/* Vazirmatn via CDN (avoids build-time font fetch in Docker). */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/vazirmatn@33.003/Vazirmatn-font-face.css"
        />
        {/* Apply stored theme + locale (dir/lang) before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var t=localStorage.getItem('hooshinu.theme');d.classList.toggle('dark', t!=='light');var l=localStorage.getItem('hooshinu.locale')==='en'?'en':'fa';d.lang=l;d.dir=l==='fa'?'rtl':'ltr';}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
