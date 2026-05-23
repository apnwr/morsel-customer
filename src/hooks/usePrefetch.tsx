'use client';

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type usePrefetchProps = {
    route: string;
}
function usePrefetch({ route }: usePrefetchProps) {
    const router = useRouter();
    useEffect(() => {
        router.prefetch(route);
    }, []);
}
export default usePrefetch;