import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata = {
  title: "Uni Manager",
  description: "Manage my university: schedule, tasks, assignments and courses",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}<Toaster /></ThemeProvider>
      </body>
    </html>
  );
}
