"use client";
import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
export function DarkModeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => {
        setMounted(true);
    }, []);
    // Always render the same structure to prevent hydration mismatch
    return (<div className="fixed top-4 right-4 z-50">
      <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-md bg-background border border-border hover:bg-accent transition-colors" aria-label="Toggle theme" disabled={!mounted}>
        {mounted ? (theme === "dark" ? (<Sun className="h-4 w-4"/>) : (<Moon className="h-4 w-4"/>)) : (<div className="h-4 w-4"/>)}
      </button>
    </div>);
}
