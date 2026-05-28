'use client';

import { useState, useEffect } from 'react';

interface ReturningMemberPromptProps {
  membershipNumber: string;
  onDismiss: () => void;
  onCheckedOut: () => void;
}

export default function ReturningMemberPrompt({
  membershipNumber,
  onDismiss,
  onCheckedOut,
}: ReturningMemberPromptProps) {
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onDismiss]);

  function handleContinueSession() {
    onDismiss();
  }

  async function handleCheckOut() {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/sessions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipNumber }),
      });

      if (response.ok) {
        onCheckedOut();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to check out. Please try again.');
      }
    } catch {
      setError('Failed to check out. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="returning-member-title">
      <div style={styles.card}>
        <h2 id="returning-member-title" style={styles.heading}>
          Already Checked In
        </h2>

        <p style={styles.message}>
          You&apos;re already checked in with membership number <strong>{membershipNumber}</strong>.
        </p>

        <p style={styles.countdown} aria-live="polite">
          Auto-dismissing in <strong>{countdown}</strong> second{countdown !== 1 ? 's' : ''}
        </p>

        {error && (
          <div style={styles.errorBox} role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        <div style={styles.buttonGroup}>
          <button
            style={{
              ...styles.button,
              ...styles.continueButton,
              ...(loading ? styles.buttonDisabled : {}),
            }}
            onClick={handleContinueSession}
            disabled={loading}
          >
            Continue Session
          </button>
          <button
            style={{
              ...styles.button,
              ...styles.checkOutButton,
              ...(loading ? styles.buttonDisabled : {}),
            }}
            onClick={handleCheckOut}
            disabled={loading}
          >
            {loading ? (
              <span>
                <span style={styles.spinner} aria-hidden="true" /> Checking out&hellip;
              </span>
            ) : (
              'Check Out'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    padding: '2rem',
    width: '100%',
    maxWidth: '420px',
  },
  heading: {
    margin: '0 0 1rem',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1a202c',
  },
  message: {
    fontSize: '1rem',
    color: '#2d3748',
    marginBottom: '0.75rem',
    lineHeight: 1.5,
  },
  countdown: {
    fontSize: '0.875rem',
    color: '#4a5568',
    marginBottom: '1.25rem',
  },
  errorBox: {
    padding: '0.75rem 1rem',
    marginBottom: '1rem',
    backgroundColor: '#fff5f5',
    border: '1px solid #feb2b2',
    borderRadius: '4px',
    color: '#c53030',
    fontSize: '0.875rem',
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.75rem',
  },
  button: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1rem',
    fontSize: '0.9375rem',
    fontWeight: 600,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  continueButton: {
    backgroundColor: '#edf2f7',
    color: '#2d3748',
  },
  checkOutButton: {
    backgroundColor: '#e53e3e',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  spinner: {
    display: 'inline-block',
    width: '0.875rem',
    height: '0.875rem',
    border: '2px solid rgba(255,255,255,0.4)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
};
