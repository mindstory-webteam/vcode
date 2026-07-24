import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <h1 className="text-4xl font-bold text-gray-800">404</h1>
      <p className="mt-2 text-base text-gray-600">Page not found</p>
      <Link
        href="/"
        className="mt-6 rounded px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-opacity"
        style={{ background: "#853a8c" }}
      >
        Back to Home
      </Link>
    </div>
  );
}
