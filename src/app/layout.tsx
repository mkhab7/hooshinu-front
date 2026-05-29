import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "هوشینو | پلتفرم هوش مصنوعی",
  description:
    "گفتگو با مدل‌های هوش مصنوعی، تولید تصویر و ویدیو، کیف پول اعتباری و اشتراک‌ها.",
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
        {/* Apply stored theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('hooshinu.theme');document.documentElement.classList.toggle('dark', t!== 'light');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
