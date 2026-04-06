/**
 * API Endpoints
 * Centralized endpoint definitions
 */

export const endpoints = {
  orderingSession: {
    getBySpaceId: (spaceId: string) => `/ordering-session/space/${spaceId}`,
    getBySessionId: (sessionId: string) => `/ordering-session/session/${sessionId}`,
    start: () => `/ordering-session/start`,
    end: (sessionId: string) => `/ordering-session/session/${sessionId}/end`,
  },
  menu: {
    getByBusinessId: (businessId: string) => `/business/menus/active/${businessId}`,
  },
  items: {
    getByBusinessId: (businessId: string) => `/items/business/${businessId}`,
  },
  queue: {
    update: (sessionId: string) => `/ordering-session/session/${sessionId}/queue`,
    confirm: (sessionId: string) => `/ordering-session/session/${sessionId}/queue/confirm`,
  },
  bill: {
    getBySessionId: (sessionId: string) => `/ordering-session/session/${sessionId}/bill`,
  },
  split: {
    calculate: (sessionId: string) => `/ordering-session/session/${sessionId}/split`,
  },
  area: {
    startSession: () => `/ordering-session/session/area-single-order`,
  },
  // Add more endpoint groups as we integrate more APIs
} as const;
