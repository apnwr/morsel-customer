'use client';

import dynamic from 'next/dynamic';

// Lazy load DebugPanel since it's only needed in development
const DebugPanel = dynamic(() => import('@/components/layout/DebugPanel'), {
  ssr: false,
});

export default function DebugPanelWrapper() {
  return <DebugPanel />;
}
