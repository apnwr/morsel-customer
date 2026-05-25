"use client";
import { INACTIVE_SESSION_STATUS, useSession } from "@/contexts";
import { useRouter } from "next/navigation";
import { useEffect } from "react"
import toast, { Toaster } from 'react-hot-toast';


function Initializer() {
    const { clearSession, sessionData } = useSession();
    const router = useRouter();
    useEffect(() => {
        if (sessionData?.session?.status && INACTIVE_SESSION_STATUS.includes(sessionData?.session?.status as any)) {
            clearSession();
            localStorage.clear();
            toast.success('Session ended!', { duration: 5000, position: "top-center" });
            router.push("/");
        }
    }, [sessionData?.session?.status]);
    return (
        <Toaster />
    )
}

export default Initializer;