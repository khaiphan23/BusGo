'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-primary text-2xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span className="text-xl font-bold text-gray-900">BusGo</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/map" className="text-gray-600 hover:text-primary font-medium">
                Bản đồ
              </Link>
              <Link href="/routes" className="text-gray-600 hover:text-primary font-medium">
                Tuyến xe
              </Link>
              <Link href="/booking" className="text-gray-600 hover:text-primary font-medium">
                Đặt chỗ
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-600 hover:text-primary font-medium">
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
              >
                Đăng ký
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Đi xe buýt dễ dàng,<br />
            <span className="text-primary">thông minh</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Theo dõi xe buýt real-time, đặt chỗ ngồi trước, khai báo thân danh thay thế quét QR,
            và tìm đường đi tối ưu — tất cả trong một ứng dụng.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-primary-hover transition-colors shadow-lg shadow-primary/25"
            >
              Bắt đầu miễn phí
            </Link>
            <Link
              href="/map"
              className="w-full sm:w-auto px-8 py-4 border-2 border-gray-300 text-gray-700 text-lg font-semibold rounded-xl hover:border-primary hover:text-primary transition-colors"
            >
              Xem bản đồ trực tiếp
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            title="Theo dõi Real-time"
            description="Xem vị trí xe buýt đang chạy trên bản đồ, cập nhật liên tục mỗi vài giây. Biết chính xác xe đến trạm khi nào."
          />
          <FeatureCard
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
            title="Đặt chỗ thông minh"
            description="Chọn chỗ ngồi trống trên xe, giữ chỗ trước khi lên xe. Hệ thống tự động giải phóng chỗ nếu quá hạn."
          />
          <FeatureCard
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
            title="Khai báo thân danh"
            description="Nhập thông tin CCCD/VNeID thay vì quét QR. An toàn, nhanh chóng, tuân thủ quy định giao thông."
          />
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Sẵn sàng trải nghiệm?</h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Đăng ký ngay hôm nay để được ưu đãi thành viên đầu tiên và trải nghiệm đi xe buýt hiện đại.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-primary-hover transition-colors"
          >
            Đăng ký tài khoản
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <span className="text-xl font-bold text-white">BusGo</span>
              </div>
              <p className="text-sm">Hệ thống giao thông xe buýt thông minh Việt Nam.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Tính năng</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/map" className="hover:text-white">Theo dõi xe real-time</Link></li>
                <li><Link href="/booking" className="hover:text-white">Đặt chỗ ngồi</Link></li>
                <li><Link href="/routes" className="hover:text-white">Tìm tuyến xe</Link></li>
                <li><Link href="/id-declaration" className="hover:text-white">Khai báo thân danh</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Hỗ trợ</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/help" className="hover:text-white">Trung tâm trợ giúp</Link></li>
                <li><Link href="/faq" className="hover:text-white">Câu hỏi thường gặp</Link></li>
                <li><Link href="/contact" className="hover:text-white">Liên hệ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Pháp lý</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white">Chính sách bảo mật</Link></li>
                <li><Link href="/terms" className="hover:text-white">Điều khoản sử dụng</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            © 2024 BusGo. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}