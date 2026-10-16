import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="flex items-center gap-2 mb-8" aria-label="BusGo — Về trang chủ">
        <svg className="w-9 h-9 text-primary" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
        <span className="text-2xl font-bold text-gray-900">BusGo</span>
      </Link>
      <main className="w-full max-w-md">{children}</main>
      <p className="mt-6 text-sm text-gray-500">
        <Link href="/" className="text-primary hover:underline">
          Về trang chủ
        </Link>
      </p>
    </div>
  );
}
