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

export interface SessionOrder {
  orderId: string;
  sessionUserId: string;
  total: number;
  status: string;
}

export interface SessionOrderQueue {
  sessionUserId: string;
  items: any[];
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
