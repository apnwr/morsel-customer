import React from "react";
import { ChevronRight } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

type TotalBillCardProps = {
    amount: number | string;
    onClick?: () => void;
    disabled?: boolean;
};

const TotalBillCard: React.FC<TotalBillCardProps> = ({
    amount,
    onClick,
    disabled = false,
}) => {
    const {formatPrice} = useLocale();
    return (
        <button
            onClick={onClick}
            className="relative w-[80%] flex items-center justify-center rounded-full border border-gray-500 bg-gray-100 px-5 py-3 shadow-sm transition hover:bg-gray-200"
            disabled={disabled}>
            <div className="flex items-center gap-3">
                <span className="text-[20px] font-medium text-gray-600">
                    Total Bill
                </span>

                <span className="text-[20px] font-bold text-black">
                    {formatPrice(Number(amount))}
                </span>
            </div>

            <ChevronRight className="absolute right-[10px] top-1/2 h-7 w-7 -translate-y-1/2 text-gray-700" />
        </button>
    );
};

export default TotalBillCard;