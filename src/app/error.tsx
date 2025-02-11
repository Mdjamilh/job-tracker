"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted">The error was logged on the server. You can try again.</p>
      <button type="button" onClick={reset} className="btn-primary mt-6">
        Try again
      </button>
    </main>
  );
}
