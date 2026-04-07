/**
 * Peach Payments SDK Type Declarations
 * Types for the global Checkout object exposed by the Peach Payments SDK script
 */

export interface PeachCheckoutInstance {
  render: (selectorOrElement: string | HTMLElement) => void;
  unmount: () => void;
}

export interface PeachCheckoutEventData {
  amount: number;
  checkoutId: string;
  currency: string;
  merchantTransactionId: string;
  paymentType: 'DB' | 'PA';
  result: { code: string; description: string };
  signature: string;
  timestamp: Date;
}

export interface PeachCompletedEventData extends PeachCheckoutEventData {
  id: string;
  merchant: { name: string };
  paymentBrand: string;
  resultDetails: {
    AcquirerResponse: string;
    ConnectorTxID1: string;
    ExtendedDescription: string;
  };
}

export interface PeachCheckoutInitOptions {
  checkoutId: string;
  key?: string;
  options?: {
    ordering?: Record<string, number>;
    paymentMethods?: {
      include?: string[];
      exclude?: string[];
    };
  };
  eventHandlers?: {
    onCompleted?: (event: PeachCompletedEventData) => void;
    onCancelled?: (event: PeachCheckoutEventData) => void;
    onExpired?: (event: PeachCheckoutEventData) => void;
    onError?: (event: PeachCheckoutEventData) => void;
    onBeforePayment?: () => true | Promise<true> | void;
    onRemoveCard?: (token: string) => boolean | Promise<boolean> | void;
  };
  customisations?: {
    showCancelButton?: boolean;
    showAmountField?: boolean;
    theme?: {
      fontFamily?: string;
      brand?: { primary?: string; secondary?: string };
      cards?: { background?: string; backgroundHover?: string };
    };
    card?: {
      submitButtonText?: string;
      showCardIcon?: boolean;
      enableAddCard?: boolean;
      headingText?: string | { default?: string; savedCards?: string };
      brands?: string[];
      showBillingFields?: boolean;
      registrations?: {
        requireCvv?: boolean;
        showStoredCardsText?: string;
      };
    };
  };
}

// Augment the global Window interface
declare global {
  interface Window {
    Checkout?: {
      initiate: (options: PeachCheckoutInitOptions) => PeachCheckoutInstance;
    };
  }
}
