// app/not-found.tsx
"use client";
import React from "react";
export default function NotFound() {
    return (<div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="mb-8 text-lg">Sorry, the page you are looking for does not exist.</p>
      <a href="/" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80 transition">Go Home</a>
    </div>);
}
