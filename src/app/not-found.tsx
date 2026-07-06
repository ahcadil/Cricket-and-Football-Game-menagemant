import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-center py-24">
      <p className="text-7xl font-display text-gold-400">404</p>
      <p className="mt-3 text-xl text-slate-300">That play isn't on the field.</p>
      <Link href="/" className="btn-primary mt-6 inline-flex">Back to Home</Link>
    </div>
  );
}
