export function MapSkeleton() {
  return (
    <div
      data-testid="map-skeleton"
      className="relative h-full w-full overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-gray-200"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
      </div>
      <div
        className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none"
        aria-hidden="true"
      >
        <div className="h-8 w-48 bg-gray-300 rounded animate-pulse" />
        <div className="h-8 w-32 bg-gray-300 rounded animate-pulse" />
      </div>
      <div
        className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none"
        aria-hidden="true"
      >
        <div className="h-6 w-40 bg-gray-300 rounded animate-pulse" />
        <div className="h-6 w-24 bg-gray-300 rounded animate-pulse" />
      </div>
      <div
        className="absolute right-4 top-20 h-32 w-64 bg-gray-300 rounded-lg animate-pulse"
        aria-hidden="true"
      />
    </div>
  );
}