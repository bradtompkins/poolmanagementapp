'use client';

import { useState } from 'react';

type UIState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'checked_out' }
  | { phase: 'not_found' }
  | { phase: 'validation_error'; message: string }
  | { phase: 'error'; message: string };

export default function CheckOutPage() {
  const [membershipNumber, setMembershipNumber] = useState('');
  const [ui, setUi] = useState<UIState>({ phase: 'idle' });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUi({ phase: 'loading' });

    try {
      const response = await fetch('/api/sessions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipNumber }),
      });

      if (response.ok) {
        setUi({ phase: 'checked_out' });
        return;
      }

      if (response.status === 404) {
        setUi({ phase: 'not_found' });
        return;
      }

      if (response.status === 400) {
        let message = 'Invalid input. Please check your membership number.';
        try {
          const data = (await response.json()) as { fields?: Record<string, string> };
          if (data.fields) {
            const fieldMessages = Object.values(data.fields).filter(Boolean);
            if (fieldMessages.length > 0) {
              message = fieldMessages.join(' ');
            }
          }
        } catch {
          // use default message
        }
        setUi({ phase: 'validation_error', message });
        return;
      }

      // HTTP 500 or any other unexpected status
      setUi({ phase: 'error', message: 'Something went wrong. Please try again.' });
    } catch {
      setUi({ phase: 'error', message: 'Something went wrong. Please try again.' });
    }
  }

  const isLoading = ui.phase === 'loading';

  return (
    <main style={{ maxWidth: '480px', margin: '48px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '24px' }}>Check Out</h1>

      {ui.phase === 'checked_out' ? (
        <p
          role="status"
          style={{
            padding: '16px',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
            color: '#155724',
          }}
        >
          You&apos;ve been checked out. See you next time!
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="membershipNumber" style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
              Membership Number
            </label>
            <input
              id="membershipNumber"
              type="text"
              required
              value={membershipNumber}
              onChange={(e) => setMembershipNumber(e.target.value)}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: '16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {ui.phase === 'not_found' && (
            <p
              role="status"
              style={{
                padding: '12px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeeba',
                borderRadius: '4px',
                color: '#856404',
                marginBottom: '16px',
              }}
            >
              No active session found for that membership number.
            </p>
          )}

          {ui.phase === 'validation_error' && (
            <p
              role="alert"
              style={{
                padding: '12px',
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: '4px',
                color: '#721c24',
                marginBottom: '16px',
              }}
            >
              {ui.message}
            </p>
          )}

          {ui.phase === 'error' && (
            <p
              role="alert"
              style={{
                padding: '12px',
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: '4px',
                color: '#721c24',
                marginBottom: '16px',
              }}
            >
              {ui.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: isLoading ? '#6c757d' : '#0070f3',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? 'Checking out…' : 'Check Out'}
          </button>
        </form>
      )}
    </main>
  );
}
