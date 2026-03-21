export default function OrdersLoading() {
  return (
    <div className="min-h-screen bg-[#F7F8F8]">
      {/* Header skeleton */}
      <div className="h-[70px] bg-[#F7F8F8] border-b border-gray-100" />

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Order status skeleton */}
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="flex gap-3">
            <div className="h-9 bg-gray-200 rounded-lg w-20" />
            <div className="h-9 bg-gray-300 rounded-full w-16" />
          </div>
        </div>

        {/* Order items skeleton */}
        <div className="animate-pulse space-y-2">
          <div className="h-5 bg-gray-200 rounded w-36 mb-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="w-[47px] h-[47px] bg-gray-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>

        {/* Payment section skeleton */}
        <div className="animate-pulse p-5 bg-white rounded-[20px] border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="h-5 bg-gray-200 rounded w-20" />
            </div>
            <div className="h-10 bg-gray-200 rounded-[20px] w-24" />
          </div>
        </div>

        {/* Browse menu CTA skeleton */}
        <div className="h-[52px] bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
