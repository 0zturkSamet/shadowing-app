export default function VideoSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      {/* Thumbnail Skeleton */}
      <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300"></div>

      {/* Content Skeleton */}
      <div className="p-4 space-y-3">
        {/* Title Skeleton */}
        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
        <div className="h-5 bg-gray-200 rounded w-1/2"></div>

        {/* Channel Name Skeleton */}
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>

        {/* Footer Skeleton */}
        <div className="flex items-center justify-between pt-2">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  );
}
