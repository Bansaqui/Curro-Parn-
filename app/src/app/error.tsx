"use client";
import { useEffect } from "react";
import { Button, Card } from "@/components/ui";
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Curro & Parné]", {
      context: "render",
      code: "PAGE_FAILED",
    });
  }, [error]);
  return (
    <main id="main" className="app-main">
      <Card>
        <h1>No hemos podido cargar esta pantalla.</h1>
        <p>Inténtalo de nuevo en un momento.</p>
        <Button onClick={reset}>Volver a intentar</Button>
      </Card>
    </main>
  );
}
