'use client';

import { useState, useCallback, useEffect } from 'react';
import { BusMap } from './BusMap';
import type { BusPosition } from '@/types/bus';
import { useBusPositions } from '@/hooks/useBusPositions';
import { LiveIndicator } from './LiveIndicator';
import { BusListSidebar } from './BusListSidebar';
import { BusDetailBottomSheet } from './BusDetailBottomSheet';
import { MapErrorBoundary } from './MapErrorBoundary';

export function MapPageClient() {
  const [selectedBus, setSelectedBus] = useState<BusPosition | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const { buses } = useBusPositions();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsBottomSheetOpen(false);
        setIsSidebarOpen(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleBusClick = useCallback(
    (bus: BusPosition) => {
      setSelectedBus(bus);
      if (window.innerWidth < 768) {
        setIsBottomSheetOpen(true);
      }
    },
    []
  );

  const handleCloseDetails = useCallback(() => {
    setSelectedBus(null);
    setIsBottomSheetOpen(false);
  }, []);

  const mobileContent = (
    <>
      {isBottomSheetOpen && selectedBus && (
        <BusDetailBottomSheet
          bus={selectedBus}
          onClose={handleCloseDetails}
          buses={buses}
          onBusSelect={handleBusClick}
        />
      )}
      {selectedBus && !isBottomSheetOpen && (
        <button
          onClick={() => setIsBottomSheetOpen(true)}
          className="fixed bottom-24 left-4 z-30 p-3 bg-white rounded-full shadow-lg border border-gray-200 flex items-center gap-2 text-sm font-medium text-gray-700"
          aria-label="Mở chi tiết xe buýt"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          </svg>
          <span>{selectedBus.licensePlate}</span>
        </button>
      )}
    </>
  );

  const desktopContent = (
    <BusListSidebar
      buses={buses}
      selectedBus={selectedBus}
      onBusSelect={handleBusClick}
      onClose={handleCloseDetails}
      isOpen={isSidebarOpen}
      onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
    />
  );

  return (
    <MapErrorBoundary>
      <div className="relative h-full w-full flex overflow-hidden">
        <div className="flex-1 min-w-0 h-full">
          <BusMap
            onBusClick={handleBusClick}
            onBusClose={handleCloseDetails}
            selectedBusId={
              isMobile && isBottomSheetOpen ? null : selectedBus?.id ?? null
            }
            showClustering={true}
          />
        </div>
        <LiveIndicator />

        {isMobile ? mobileContent : desktopContent}
      </div>
    </MapErrorBoundary>
  );
}
