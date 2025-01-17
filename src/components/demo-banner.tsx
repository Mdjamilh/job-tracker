export function DemoBanner() {
  return (
    <div role="note" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950">
      <strong className="font-semibold">Demo mode:</strong> data lives in memory and resets when the server
      restarts. Don&apos;t enter anything you want to keep.
    </div>
  );
}
