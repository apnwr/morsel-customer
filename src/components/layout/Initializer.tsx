"use client";
import { INACTIVE_SESSION_STATUS, useSession } from "@/contexts";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react"
import toast, { Toaster } from 'react-hot-toast';


function Initializer() {
    const { clearSession, sessionData } = useSession();
    const ref = useRef<boolean>(false);
    const router = useRouter();
    useEffect(() => {
        if (sessionData?.session?.status && INACTIVE_SESSION_STATUS.includes(sessionData?.session?.status as any)) {
            if (!ref.current) {
                ref.current = true;
                setTimeout(() => {
                    clearSession();
                    localStorage.clear();
                    toast.success('Session ended!', { duration: 5000, position: "top-center" });
                    router.push("/");
                }, 5000);
            }
        }
    }, [sessionData?.session?.status]);
    return (
        <Toaster />
    )
}

export default Initializer;