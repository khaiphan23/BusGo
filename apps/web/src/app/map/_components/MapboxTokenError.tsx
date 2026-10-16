'use client';

import { TokenValidationResult } from '@/lib/mapbox';

interface MapboxTokenErrorProps {
  validation: TokenValidationResult;
  onRetry?: () => void;
}

export function MapboxTokenError({ validation, onRetry }: MapboxTokenErrorProps) {
  const isPlaceholder = validation.error?.includes('placeholder') ?? false;
  const isMissing = validation.error?.includes('not set') ?? false;
  const isInvalid = validation.error?.includes('invalid') ?? false;

  const getTitle = () => {
    if (isMissing) return 'Mapbox Token Chưa Cấu Hình';
    if (isPlaceholder) return 'Mapbox Token Chưa Được Cập Nhật';
    if (isInvalid) return 'Mapbox Token Không Hợp Lệ';
    return 'Lỗi Cấu Hình Bản Đồ';
  };

  const getDescription = () => {
    const invalidTokenNote = 'Token Mapbox thường bắt đầu bằng <code>pk.</code> và có độ dài > 20 ký tự';
    if (isMissing) {
      return (
        <div className="space-y-3 text-left">
          <p>Để sử dụng bản đồ theo dõi xe buýt real-time, bạn cần cấu hình Mapbox access token.</p>
          <div className="bg-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <p className="mb-2">Thêm vào <code>.env.local</code>:</p>
            <code>NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxxxxx</code>
          </div>
          <p className="text-sm text-gray-600">Lấy token tại: <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Mapbox Account → Access Tokens</a></p>
        </div>
      );
    }
    if (isPlaceholder) {
      return (
        <div className="space-y-3 text-left">
          <p>Token hiện tại vẫn là giá trị placeholder. Vui lòng thay thế bằng token thật từ Mapbox.</p>
          <div className="bg-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <p className="mb-2">Cập nhật trong <code>.env.local</code>:</p>
            <code>NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxxxxx</code>
          </div>
        </div>
      );
    }
    if (isInvalid) {
      return (
        <div className="space-y-3 text-left">
          <p>Token hiện tại có vẻ không hợp lệ (quá ngắn hoặc sai định dạng).</p>
          <div className="bg-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <p className="mb-2">Kiểm tra lại trong <code>.env.local</code>:</p>
            <code>NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxxxxx</code>
          </div>
          <p className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: invalidTokenNote }} />
        </div>
      );
    }
    return <p>{validation.error || 'Đã xảy ra lỗi không xác định khi khởi tạo bản đồ.'}</p>;
  };

  return (
    <div
      role="alert"
      className="relative h-full w-full flex items-center justify-center bg-gray-50 p-6"
    >
      <div className="max-w-md w-full mx-4 text-center">
        <div className="w-20 h-20 mx-auto mb-4 text-amber-500">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">{getTitle()}</h2>
        <div className="text-gray-600 mb-6">{getDescription()}</div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
            >
              Thử Lại
            </button>
          )}
          <a
            href="https://account.mapbox.com/access-tokens/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Lấy Token Mapbox
          </a>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Tải Lại Trang
          </button>
        </div>
        
        <p className="mt-6 text-xs text-gray-500">
          Lưu ý: Token cần có quyền truy cập công khai (public) và được giới hạn domain nếu cần bảo mật.
        </p>
      </div>
    </div>
  );
}