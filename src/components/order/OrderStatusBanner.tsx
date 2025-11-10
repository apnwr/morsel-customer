'use client';

interface OrderStatusBannerProps {
  isEditable: boolean;
  remainingTime: number;
  eta?: number;
}

export default function OrderStatusBanner({ isEditable, remainingTime, eta }: OrderStatusBannerProps) {
  const editMinutes = Math.floor(remainingTime / 60);
  
  // Use different colors based on editable state
  const bgColor = isEditable ? 'bg-green-50' : 'bg-orange-50';
  const borderColor = isEditable ? 'border-green-100' : 'border-orange-100';
  const iconBgColor = isEditable ? 'bg-green-500' : 'bg-orange-500';
  
  return (
    <div className={`p-6 ${bgColor} border-b ${borderColor}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${iconBgColor} rounded-full flex items-center justify-center shrink-0`}>
          <span className="text-white text-xl">{isEditable ? '✓' : '🔒'}</span>
        </div>
        <div>
          <h2 className="font-semibold mb-1">
            {isEditable ? 'Your order is getting prepared!' : 'Order Locked'}
          </h2>
          <p className="text-sm text-gray-600">
            {isEditable ? (
              <>
                You can edit your order within the next {editMinutes} min{editMinutes !== 1 ? 's' : ''}. 
                After that, you can&apos;t cancel it and will receive this order in the next {eta || 20} mins.
              </>
            ) : (
              <>
                Your order is locked and being prepared. You will receive it in approximately {eta || 20} mins.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
