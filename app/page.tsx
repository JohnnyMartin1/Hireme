import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-4">Welcome to HireMe</h1>
      <p className="text-gray-600 mb-6">Connect employers with early-career talent.</p>
      <div className="flex gap-3">
        <Link href="/auth/signup" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Sign up</Link>
        <Link href="/auth/login" className="rounded border px-4 py-2 text-gray-700 hover:bg-gray-50">Log in</Link>
      </div>
    </main>
  );
}
