import { Suspense } from 'react';
import { MapPageClient } from './_components/MapPageClient';
import { MapSkeleton } from './_components/MapSkeleton';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Bản đồ xe buýt real-time | BusGo',
  description: 'Theo dõi vị trí xe buýt trực tuyến trên bản đồ, cập nhật real-time',
};

export default function MapPage() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-100">
      <Suspense fallback={<MapSkeleton />}>
        <MapPageClient />
      </Suspense>
    </div>
  );
}