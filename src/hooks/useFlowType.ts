import { getFromStorage } from '@/mocks/mockStorage';
import { STORAGE_KEYS } from '@/lib/storage-keys';

export type FlowType = 'space' | 'area';

/**
 * Returns the current ordering flow type.
 * 'area' when customer entered via /area/[areaId] (single participant, no split).
 * 'space' for the default table/space flow.
 */
export function useFlowType(): FlowType {
  return getFromStorage<string>(STORAGE_KEYS.FLOW_TYPE) === 'area' ? 'area' : 'space';
}
