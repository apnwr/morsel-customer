import { useSession } from "@/contexts";
import { useSessionBill } from "./useSessionBill";
import { useMemo } from "react";

function usePaymentInfo() {
    const { sessionData } = useSession();
    const { bill } = useSessionBill();


    const isPaymentDone = useMemo(() => {
        let _paymentDone = false;

        const noOfParticipants = sessionData?.participantsCount;
        if (noOfParticipants === 1) {
            if (sessionData?.session?.payments.find(i => i.amount === bill?.total && i.status === "success")) {
                _paymentDone = true;
            }
        } else {
            if (sessionData?.session?.remainingTotal === 0) {
                _paymentDone = true
            }
        }
        return _paymentDone;
    }, [sessionData?.session?.payments, bill, sessionData?.participantsCount, sessionData?.session?.remainingTotal])
    return { isPaymentDone }
}

export default usePaymentInfo;