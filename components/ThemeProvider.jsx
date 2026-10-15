"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }) {
  return <NextThemesProvider attribute="class" forcedTheme="light" enableSystem={false}>{children}</NextThemesProvider>;
}
