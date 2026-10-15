"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return <div><h1 className="mb-7 text-3xl font-bold tracking-tight">Settings</h1><Card className="max-w-2xl"><CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Choose the display that feels best for studying.</CardDescription></CardHeader><CardContent className="flex items-center justify-between gap-4"><div><p className="font-medium">Dark mode</p><p className="text-sm text-muted-foreground">Switch between light and dark appearance.</p></div><Button variant="outline" onClick={() => setTheme(isDark ? "light" : "dark")}>{isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{isDark ? "Light" : "Dark"}</Button></CardContent></Card></div>;
}
