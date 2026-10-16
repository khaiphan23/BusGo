'use client';

import { useState, useEffect } from 'react';
import type { BusPosition } from '@/types/bus';
import { calculateOccupancyPercentage, getOccupancyColor } from '@/lib/mapbox';

interface BusListSidebarProps {
  buses: BusPosition[];
  selectedBus: BusPosition | null;
  onBusSelect: (bus: BusPosition) => void;
  onClose: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function BusListSidebar({
  buses,
  selectedBus,
  onBusSelect,
  onClose,
  isOpen,
  onToggle,
}: BusListSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'licensePlate' | 'route' | 'occupancy'>('licensePlate');

  const filteredBuses = buses
    .filter((bus) =>
      bus.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bus.route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bus.route.code.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'licensePlate') return a.licensePlate.localeCompare(b.licensePlate);
      if (sortBy === 'route') return a.route.code.localeCompare(b.route.code);
      return calculateOccupancyPercentage(b.currentOccupancy, b.capacity) - calculateOccupancyPercentage(a.currentOccupancy, a.capacity);
    });

  return (
    <>
      <button
        onClick={onToggle}
        className={`fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-lg border border-gray-200 lg:hidden ${
          isOpen ? 'rotate-180' : ''
        }`}
        aria-label={isOpen ? 'Đóng thanh bên' : 'Mở thanh bên'}
        aria-expanded={isOpen}
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-20 w-80 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Danh sách xe buýt"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Xe buýt hoạt động ({buses.length})</h2>
            <button
              onClick={onClose}
              className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
              aria-label="Đóng danh sách"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <input
                type="search"
                placeholder="Tìm biển số, tuyến..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 pl-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                aria-label="Tìm kiếm xe buýt"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              aria-label="Sắp xếp theo"
            >
              <option value="licensePlate">Biển số</option>
              <option value="route">Tuyến</option>
              <option value="occupancy">Mật độ (giảm dần)</option>
            </select>
          </div>

          <ul className="flex-1 overflow-y-auto p-3 space-y-2" aria-label="Danh sách xe buýt">
            {filteredBuses.length === 0 ? (
              <li className="py-8 text-center text-gray-500 text-sm">
                Không tìm thấy xe buýt phù hợp
              </li>
            ) : (
              filteredBuses.map((bus) => {
                const occupancyPercent = calculateOccupancyPercentage(bus.currentOccupancy, bus.capacity);
                const occupancyColor = getOccupancyColor(occupancyPercent);
                const isSelected = selectedBus?.id === bus.id;

                return (
                  <li key={bus.id}>
                    <button
                      onClick={() => onBusSelect(bus)}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary-50 border-primary-200 shadow-sm ring-1 ring-primary-200'
                          : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                      }`}
                      aria-current={isSelected ? 'true' : undefined}
                      aria-label={`${bus.licensePlate}, tuyến ${bus.route.code}, ${occupancyPercent}% chỗ ngồi`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">{bus.licensePlate}</span>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                occupancyPercent >= 90 ? 'bg-red-100 text-red-700' :
                                occupancyPercent >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                occupancyPercent >= 50 ? 'bg-blue-100 text-blue-700' :
                                'bg-green-100 text-green-700'
                              }`}
                            >
                              {occupancyPercent}%
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-500 truncate">
                            {bus.route.code} - {bus.route.name}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                            <span>{bus.currentOccupancy}/{bus.capacity} chỗ</span>
                            {bus.speed !== undefined && bus.speed !== null && (
                              <span>{bus.speed.toFixed(1)} km/h</span>
                            )}
                          </div>
                        </div>
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
                          style={{ backgroundColor: bus.route.color }}
                          aria-hidden="true"
                        />
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
            <p className="text-xs text-gray-500 text-center">
              Cập nhật tự động mỗi vài giây
            </p>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-10 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  );
}