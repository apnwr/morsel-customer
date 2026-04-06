import { getFromStorage } from '@/mocks/mockStorage';

export type FlowType = 'space' | 'area';

/**
 * Returns the current ordering flow type.
 * 'area' when customer entered via /area/[areaId] (single participant, no split).
 * 'space' for the default table/space flow.
 */
export function useFlowType(): FlowType {
  return getFromStorage<string>('morsel_flow_type') === 'area' ? 'area' : 'space';
}
