'use client';

/**
 * Test page for Peach Payments checkout flow.
 * Delete this page before shipping to production.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PeachCheckoutModal } from '@/components/payment/PeachCheckoutModal';
import { paymentService } from '@/services/payment.service';
import { getFromStorage } from '@/mocks/mockStorage';
import { prefetchSDK, resetSDKLoader } from '@/lib/peach-payments/sdk-loader';
import type { CreateEmbeddedCheckoutResponse, VerifyPaymentResponse } from '@/types/api/payment';
import type { PeachCheckoutInitOptions } from '@/lib/peach-payments/types';

type MockScenario = 'none' | 'happy' | 'create-fail' | 'verify-fail' | 'slow-create' | 'slow-verify';

const SCENARIOS: { key: MockScenario; label: string }[] = [
  { key: 'none', label: 'Live' },
  { key: 'happy', label: 'Happy' },
  { key: 'create-fail', label: 'Create Fail' },
  { key: 'verify-fail', label: 'Verify Fail' },
  { key: 'slow-create', label: 'Slow Create' },
  { key: 'slow-verify', label: 'Slow Verify' },
];

const originalCreate = paymentService.createEmbeddedCheckout;
const originalVerify = paymentService.verifyPayment;

/**
 * Install a fake window.Checkout that simulates the Peach SDK widget.
 * On render(), shows a mock payment form and fires onCompleted after a brief delay.
 */
function installFakeSDK() {
  window.Checkout = {
    initiate: (options: PeachCheckoutInitOptions) => {
      let mounted = false;
      let timerId: ReturnType<typeof setTimeout> | null = null;

      return {
        render: (selectorOrElement: string | HTMLElement) => {
          const container =
            typeof selectorOrElement === 'string'
              ? document.querySelector<HTMLElement>(selectorOrElement)
              : selectorOrElement;

          if (!container) return;
          mounted = true;

          // Render a mock payment form UI
          container.innerHTML = `
            <div style="padding:24px;text-align:center;">
              <div style="background:#F3F4F6;border-radius:12px;padding:20px;margin-bottom:16px;">
                <p style="font-size:14px;color:#6B7280;margin-bottom:12px;">Mock Peach Checkout Widget</p>
                <p style="font-size:12px;color:#9CA3AF;">Checkout ID: ${options.checkoutId}</p>
              </div>
              <p style="font-size:13px;color:#6B7280;margin-bottom:16px;">
                Simulating payment — completing in 2 seconds...
              </p>
              <div style="width:24px;height:24px;border:3px solid #E5E7EB;border-top-color:#000;border-radius:50%;margin:0 auto;animation:spin 1s linear infinite;"></div>
            </div>
          `;

          // Auto-complete after 2s
          timerId = setTimeout(() => {
            if (!mounted) return;
            options.eventHandlers?.onCompleted?.({
              id: `mock-payment-${Date.now()}`,
              amount: 150,
              checkoutId: options.checkoutId,
              currency: 'EUR',
              merchantTransactionId: `mock-mtxn-${Date.now()}`,
              paymentType: 'DB',
              result: { code: '000.100.110', description: 'Request successfully processed' },
              signature: 'mock-sig',
              timestamp: new Date(),
              merchant: { name: 'Mock Merchant' },
              paymentBrand: 'VISA',
              resultDetails: {
                AcquirerResponse: 'mock',
                ConnectorTxID1: 'mock',
                ExtendedDescription: 'mock',
              },
            });
          }, 2000);
        },
        unmount: () => {
          mounted = false;
          if (timerId) clearTimeout(timerId);
        },
      };
    },
  };
}

function removeFakeSDK() {
  // Only remove if it's our fake
  if (window.Checkout && 'initiate' in window.Checkout) {
    delete (window as unknown as Record<string, unknown>).Checkout;
  }
}

function applyMock(scenario: MockScenario) {
  paymentService.createEmbeddedCheckout = originalCreate;
  paymentService.verifyPayment = originalVerify;
  removeFakeSDK();
  resetSDKLoader();

  if (scenario === 'none') return;

  // Install fake SDK for all mock scenarios (except create-fail which errors before SDK)
  if (scenario !== 'create-fail') {
    installFakeSDK();
  }

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
  const fakeCheckout: CreateEmbeddedCheckoutResponse = {
    checkout: { checkoutId: `mock-${Date.now()}`, checkoutUrl: '' },
    transactionId: `txn-${Date.now()}`,
  };
  const okVerify: VerifyPaymentResponse = {
    success: true, status: 'success', verification: {}, transactionId: fakeCheckout.transactionId,
  };
  const badVerify: VerifyPaymentResponse = {
    success: false, status: 'failed', verification: { reason: 'Insufficient funds' }, transactionId: fakeCheckout.transactionId,
  };

  switch (scenario) {
    case 'happy':
      paymentService.createEmbeddedCheckout = async () => fakeCheckout;
      paymentService.verifyPayment = async () => okVerify;
      break;
    case 'create-fail':
      paymentService.createEmbeddedCheckout = async () => { throw new Error('Server 500'); };
      break;
    case 'verify-fail':
      paymentService.createEmbeddedCheckout = async () => fakeCheckout;
      paymentService.verifyPayment = async () => badVerify;
      break;
    case 'slow-create':
      paymentService.createEmbeddedCheckout = async () => { await delay(4000); return fakeCheckout; };
      paymentService.verifyPayment = async () => okVerify;
      break;
    case 'slow-verify':
      paymentService.createEmbeddedCheckout = async () => fakeCheckout;
      paymentService.verifyPayment = async () => { await delay(4000); return okVerify; };
      break;
  }
}

export default function TestPaymentPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scenario, setScenario] = useState<MockScenario>('happy');
  const [results, setResults] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [sessionUserId, setSessionUserId] = useState('');
  const [amount, setAmount] = useState(150);
  // Key to force remount of modal on each open (ensures fresh checkoutId)
  const modalKeyRef = useRef(0);

  useEffect(() => {
    const stored = getFromStorage<{ session?: { id?: string } }>('morsel_session_data');
    if (stored?.session?.id) setSessionId(stored.session.id);
    const userId = getFromStorage<string>('morsel_session_user_id');
    if (userId) setSessionUserId(userId);
    prefetchSDK();
  }, []);

  const log = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setResults(prev => [`[${ts}] ${msg}`, ...prev.slice(0, 19)]);
  }, []);

  const handleOpen = () => {
    applyMock(scenario);
    modalKeyRef.current += 1;
    log(`Open — ${scenario}`);
    setIsModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8F8', padding: '16px', paddingBottom: '120px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Payment Test</h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
          Test Peach checkout modal in isolation
        </p>

        {/* Session inputs */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '12px', marginBottom: '12px', border: '1px solid #E5E7EB' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Session</p>
          <input
            type="text"
            value={sessionId}
            onChange={e => setSessionId(e.target.value)}
            placeholder="Session ID"
            style={{ display: 'block', width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px', marginBottom: '8px', boxSizing: 'border-box' }}
          />
          <input
            type="text"
            value={sessionUserId}
            onChange={e => setSessionUserId(e.target.value)}
            placeholder="User ID (optional)"
            style={{ display: 'block', width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px', marginBottom: '8px', boxSizing: 'border-box' }}
          />
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            placeholder="Amount"
            style={{ display: 'block', width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        {/* Scenario picker */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '12px', marginBottom: '12px', border: '1px solid #E5E7EB' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Scenario</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {SCENARIOS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setScenario(key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: scenario === key ? 600 : 400,
                  border: 'none',
                  cursor: 'pointer',
                  background: scenario === key ? '#000' : '#F3F4F6',
                  color: scenario === key ? '#fff' : '#374151',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Open button */}
        <button
          onClick={handleOpen}
          disabled={!sessionId && scenario === 'none'}
          style={{
            display: 'block',
            width: '100%',
            height: '48px',
            background: (!sessionId && scenario === 'none') ? '#9CA3AF' : '#000',
            color: '#fff',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 700,
            border: 'none',
            cursor: (!sessionId && scenario === 'none') ? 'not-allowed' : 'pointer',
            marginBottom: '12px',
          }}
        >
          Open Payment Modal
        </button>

        {scenario === 'none' && !sessionId && (
          <p style={{ fontSize: '12px', color: '#D97706', textAlign: 'center', marginBottom: '12px' }}>
            Live mode needs a session ID
          </p>
        )}

        {/* Event log */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '12px', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600 }}>Log</p>
            {results.length > 0 && (
              <button onClick={() => setResults([])} style={{ fontSize: '12px', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>
          {results.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#9CA3AF' }}>No events yet</p>
          ) : (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {results.map((msg, i) => (
                <p key={i} style={{ fontSize: '11px', color: '#4B5563', fontFamily: 'monospace', margin: '2px 0' }}>{msg}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      <PeachCheckoutModal
        key={modalKeyRef.current}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); log('Closed'); }}
        onPaymentResult={(result, txnId) => { setIsModalOpen(false); log(`Result: ${result}${txnId ? ` (${txnId})` : ''}`); }}
        sessionId={sessionId}
        sessionUserId={sessionUserId || undefined}
        amount={amount}
      />
    </div>
  );
}
