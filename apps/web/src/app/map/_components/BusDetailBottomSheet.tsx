'use client';

import { useEffect, useRef, useState } from 'react';
import type { BusPosition } from '@/types/bus';
import { calculateOccupancyPercentage, getOccupancyColor, getOccupancyTextColor } from '@/lib/mapbox';

interface BusDetailBottomSheetProps {
  bus: BusPosition;
  onClose: () => void;
  buses: BusPosition[];
  onBusSelect: (bus: BusPosition) => void;
}

export function BusDetailBottomSheet({ bus, onClose, buses, onBusSelect }: BusDetailBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(320);
  const [dragStart, setDragStart] = useState<number | null>(null);

  const occupancyPercent = calculateOccupancyPercentage(bus.currentOccupancy, bus.capacity);
  const occupancyColor = getOccupancyColor(occupancyPercent);
  const occupancyTextColor = getOccupancyTextColor(occupancyPercent);

  // Modal dialog behaviour: move focus in on open, restore it on close, Escape dismisses.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (dragStart === null) return;
      const deltaY = dragStart - e.touches[0].clientY;
      const newHeight = Math.max(200, Math.min(window.innerHeight - 80, 320 + deltaY));
      setHeight(newHeight);
    };

    const handleTouchEnd = () => {
      setDragStart(null);
      if (height < 250) {
        onClose();
      } else {
        setHeight(320);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (dragStart === null) return;
      const deltaY = dragStart - e.clientY;
      const newHeight = Math.max(200, Math.min(window.innerHeight - 80, 320 + deltaY));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setDragStart(null);
      if (height < 250) {
        onClose();
      } else {
        setHeight(320);
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragStart, height, onClose]);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart(clientY);
  };

  const otherBuses = buses.filter((b) => b.id !== bus.id).slice(0, 5);

  return (
    <div
      ref={sheetRef}
      className="fixed inset-x-0 bottom-0 z-40 focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết xe ${bus.licensePlate}`}
      tabIndex={-1}
    >
      <div
        data-testid="backdrop"
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative bg-white rounded-t-2xl shadow-xl"
        style={{ height: `${height}px`, maxHeight: `${window.innerHeight - 80}px` }}
        onTouchStart={handleDragStart}
        onMouseDown={handleDragStart}
      >
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 rounded-full" aria-hidden="true" />

        <div className="p-4 pt-8 h-full overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{bus.licensePlate}</h2>
              <p className="text-sm text-gray-500 mt-1">Tuyến {bus.route.code} - {bus.route.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Đóng chi tiết"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div
            className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4"
            role="progressbar"
            aria-valuenow={occupancyPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Mật độ chỗ ngồi ${occupancyPercent}%`}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${occupancyPercent}%`, backgroundColor: occupancyColor }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Chỗ ngồi</p>
              <p className="text-2xl font-bold text-gray-900">{bus.currentOccupancy} / {bus.capacity}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Mật độ</p>
              <p className="text-2xl font-bold" style={{ color: occupancyTextColor }}>{occupancyPercent}%</p>
            </div>
            {bus.heading !== undefined && bus.heading !== null && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Hướng</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(bus.heading)}°</p>
              </div>
            )}
            {bus.speed !== undefined && bus.speed !== null && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Tốc độ</p>
                <p className="text-2xl font-bold text-gray-900">{bus.speed.toFixed(1)} km/h</p>
              </div>
            )}
          </div>

          <div className="mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Thông tin tuyến</p>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: bus.route.color }}
              >
                {bus.route.code}
              </div>
              <div>
                <p className="font-medium text-gray-900">{bus.route.name}</p>
                <p className="text-sm text-gray-500">Mã tuyến: {bus.route.code}</p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Xe khác trên tuyến này</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {otherBuses.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Không có xe khác</p>
              ) : (
                otherBuses.map((otherBus) => {
                  const otherOccupancy = calculateOccupancyPercentage(otherBus.currentOccupancy, otherBus.capacity);
                  return (
                    <button
                      key={otherBus.id}
                      onClick={() => onBusSelect(otherBus)}
                      className="w-full text-left p-3 bg-gray-50 rounded-lg flex items-center justify-between gap-3 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: otherBus.route.color }}
                        >
                          {otherBus.route.code}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{otherBus.licensePlate}</p>
                          <p className="text-xs text-gray-500">{otherOccupancy}% chỗ</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Cập nhật: {new Date(bus.updatedAt).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}