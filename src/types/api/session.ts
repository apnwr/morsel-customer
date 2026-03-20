/**
 * API Types for Ordering Session
 */

export interface Timestamp {
  _seconds: number;
  _nanoseconds: number;
}

export interface Space {
  id: string;
  name: string;
  type: 'counter' | 'table' | string;
  number: number;
  capacity: number;
  customField: string;
  businessId: string;
  areaId: string;
  status: 'available' | 'occupied' | string;
  qrIdentifier: string;
  qrCodeUrl: string;
  currentOrders: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Subscription {
  tier: string;
  startDate: Timestamp;
  expiryDate: Timestamp;
}

export interface Business {
  id: string;
  email: string;
  businessDes: string;
  displayName: string;
  businessName: string;
  businessType: string;
  businessPhone: string;
  selectedPlanGroup: string;
  selectedPlanGroupId: string;
  selectedPlanId: string;
  selectedPlanName: string;
  status: 'active' | 'inactive' | string;
  businessId: string;
  name: string;
  type: string;
  adminId: string;
  subscription: Subscription;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Firebase Storage URL for business logo (publicly accessible) */
  logo?: string;
}

export interface SessionParticipant {
  sessionUserId: string;
  guestName: string;
  patronId?: string;
  joinedAt?: Timestamp;
}

export interface Session {
  id: string;
  spaceId: string;
  businessId: string;
  status: 'active' | 'completed' | 'cancelled' | string;
  participants: SessionParticipant[];
  orders: string[];
  createdAt?: Timestamp;
  expiresAt?: string;
}

export interface OrderingSessionData {
  space: Space;
  business: Business;
  session: Session | null;
  participantsCount: number;
}

export interface OrderingSessionResponse {
  data: OrderingSessionData;
}

export interface StartSessionRequest {
  spaceId: string;
  guestName: string;
  patronId?: string;
}

export interface StartSessionResponse {
  data: Session;
}

/** Item shape in orders from API/Real-time DB when orders include full details */
export interface SessionOrderItem {
  itemId: string;
  name: string;
  quantity: number;
  itemTotal: number;
  unitPrice: number;
  variantIndex: number;
  variantPrice: number;
  addonsTotalPrice?: number;
}

export interface SessionOrder {
  orderId: string;
  sessionUserId: string;
  total: number;
  status: string;
  /** When present, enables PostOrderView for all participants (not just the placer) */
  items?: SessionOrderItem[];
}

export interface SessionQueueItem {
  itemId: string;
  name: string;
  quantity: number;
  variantIndex: number;
  variantName: string;
  variantPrice: number;
  spiceLevel?: string; // Selected spice level (e.g., "Mild", "Hot")
  addOns?: Array<{
    addonIndex: number;
    addonName: string;
    selectedOptions?: Array<{
      name: string;
      price: number;
    }>;
    optionsTotalPrice: number;
  }>;
  addonsTotalPrice?: number;
  unitPrice: number;
  itemTotal: number;
}

export interface SessionOrderQueue {
  sessionUserId: string;
  items: SessionQueueItem[];
  updatedAt: Timestamp;
}

export interface SessionDetail {
  id: string;
  spaceId: string;
  spaceName: string;
  businessId: string;
  branchId: string;
  branchName: string;
  areaId: string;
  areaName: string;
  /** ISO 4217 currency code from branch settings, e.g. "MUR" */
  currency?: string;
  /** IANA timezone string from branch settings, e.g. "Indian/Mauritius" */
  timezone?: string;
  status: 'active' | 'completed' | 'cancelled' | string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  participants: SessionParticipant[];
  orders: SessionOrder[];
  orderQueue: SessionOrderQueue[];
  updatedAt: Timestamp;
}

export interface SessionDetailResponse {
  data: SessionDetail;
}

/**
 * End Session Request
 * Payload for ending an active session
 * PUT /session/{sessionId}/end
 */
export interface EndSessionRequest {
  sessionUserId: string;
  reason?: 'completed' | 'timeout' | 'left' | 'cancelled';
}

/**
 * End Session Response
 * Response after ending a session
 */
export interface EndSessionResponse {
  message: string;
  session: {
    id: string;
    status: 'completed' | 'cancelled' | string;
    endedAt: Timestamp;
  };
}
