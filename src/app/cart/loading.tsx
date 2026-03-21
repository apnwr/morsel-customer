export default function CartLoading() {
  return (
    <div className="min-h-screen bg-[#F7F8F8]">
      {/* Header skeleton */}
      <div className="h-[70px] bg-[#F7F8F8] border-b border-gray-100" />

      {/* Cart items skeleton */}
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 p-3 bg-white rounded-xl animate-pulse">
            {/* Image placeholder */}
            <div className="w-[72px] h-[72px] bg-gray-200 rounded-lg shrink-0" />
            {/* Text lines */}
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/4 mt-2" />
            </div>
          </div>
        ))}

        {/* Bill section skeleton */}
        <div className="mt-6 p-4 bg-white rounded-xl animate-pulse space-y-3">
          <div className="flex justify-between">
            <div className="h-3 bg-gray-200 rounded w-20" />
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
          <div className="flex justify-between">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-16" />
            <div className="h-4 bg-gray-200 rounded w-20" />
          </div>
        </div>

        {/* CTA button skeleton */}
        <div className="mt-4 h-[52px] bg-gray-200 rounded-full animate-pulse" />
      </div>
    </div>
  );
}
