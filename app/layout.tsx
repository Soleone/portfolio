import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme";
import { cn } from "@/lib/utils";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  defaultThemeIsDark,
  themeOptions,
  themeScript,
  themeStyles,
} from "@/components/theme/registry";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});


export const metadata: Metadata = {
  metadataBase: new URL("https://soleone.xyz"),
  title: "Soleone",
  description:
    "Fast, joyful products with taste. Web apps, games and AI agent tooling by Soleone. View selected projects and get in touch.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "https://soleone.xyz",
    siteName: "Soleone Portfolio",
    title: "Soleone",
    description:
      "Fast, joyful products with taste. Web apps, games and AI agent tooling by Soleone. View selected projects and get in touch.",
    type: "website",
  },
};

// Browser chrome starts on the default theme's canvas; the theme provider keeps it in step afterwards.
export const viewport: Viewport = {
  themeColor: themeOptions.find((theme) => theme.name === DEFAULT_THEME)?.canvas,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The server renders the default theme; the script in <head> swaps in the visitor's stored
  // choice before first paint.
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme={DEFAULT_THEME}
      className={cn("font-sans", inter.variable, defaultThemeIsDark && "dark")}
    >
      <head>
        {/* The site ships its own themes. This keeps Dark Reader from restyling them, which would
            also rewrite inline styles before hydration and break it. */}
        <meta name="darkreader-lock" />
        <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className="antialiased"
      >
        <ThemeProvider themes={themeOptions} storageKey={THEME_STORAGE_KEY}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
