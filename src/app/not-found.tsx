import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="mt-2 text-muted">That page or application doesn&apos;t exist, or it isn&apos;t yours.</p>
      <Link href="/board" className="btn-primary mt-6">
        Go to your board
      </Link>
    </main>
  );
}
