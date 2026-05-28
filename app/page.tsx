'use client';

import { useState } from 'react';
import ReturningMemberPrompt from '@/components/ReturningMemberPrompt';

interface FieldErrors {
  name?: string;
  membershipNumber?: string;
  phoneNumber?: string;
  partySize?: string;
  isPrivate?: string;
  [key: string]: string | undefined;
}

interface AlreadyCheckedInState {
  sessionId: string;
  membershipNumber: string;
}

export default function CheckInPage() {
  // Form field state
  const [name, setName] = useState('');
  const [membershipNumber, setMembershipNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [memberCount, setMemberCount] = useState<number>(1);
  const [guestCount, setGuestCount] = useState<number>(0);
  const [isPrivate, setIsPrivate] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState<AlreadyCheckedInState | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Reset UI state before submitting
    setError(null);
    setFieldErrors({});
    setSuccess(false);
    setAlreadyCheckedIn(null);
    setLoading(true);

    try {
      const response = await fetch('/api/sessions/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          membershipNumber,
          phoneNumber,
          partySize: memberCount + guestCount,
          isPrivate,
        }),
      });

      if (response.status === 201) {
        setSuccess(true);
        // Reset form fields on success
        setName('');
        setMembershipNumber('');
        setPhoneNumber('');
        setMemberCount(1);
        setGuestCount(0);
        setIsPrivate(false);
        return;
      }

      const data = await response.json();

      if (response.status === 409 && data.status === 'already_checked_in') {
        setAlreadyCheckedIn({
          sessionId: data.sessionId,
          membershipNumber,
        });
        return;
      }

      if (response.status === 400 && data.fields) {
        setFieldErrors(data.fields as FieldErrors);
        return;
      }

      // HTTP 500 or any other unexpected error
      setError('Something went wrong. Please try again.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main style={styles.main}>
        <div style={styles.card}>
          <h1 style={styles.heading}>Pool Check-In</h1>
          <div style={styles.successBox} role="status" aria-live="polite">
            <p style={styles.successText}>You&apos;re checked in!</p>
            <button
              style={styles.button}
              onClick={() => setSuccess(false)}
            >
              Check In Another Member
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (alreadyCheckedIn) {
    return (
      <>
        <main style={styles.main}>
          <div style={styles.card}>
            <h1 style={styles.heading}>Pool Check-In</h1>
          </div>
        </main>
        <ReturningMemberPrompt
          membershipNumber={alreadyCheckedIn.membershipNumber}
          onDismiss={() => setAlreadyCheckedIn(null)}
          onCheckedOut={() => {
            setAlreadyCheckedIn(null);
            setSuccess(true);
          }}
        />
      </>
    );
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Pool Check-In</h1>

        {error && (
          <div style={styles.errorBox} role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div style={styles.fieldGroup}>
            <label htmlFor="name" style={styles.label}>
              Full Name <span style={styles.required} aria-hidden="true">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              aria-required="true"
              aria-describedby={fieldErrors.name ? 'name-error' : undefined}
              aria-invalid={!!fieldErrors.name}
              style={{
                ...styles.input,
                ...(fieldErrors.name ? styles.inputError : {}),
              }}
              placeholder="Jane Smith"
            />
            {fieldErrors.name && (
              <span id="name-error" style={styles.fieldError} role="alert">
                {fieldErrors.name}
              </span>
            )}
          </div>

          {/* Membership Number */}
          <div style={styles.fieldGroup}>
            <label htmlFor="membershipNumber" style={styles.label}>
              Membership Number <span style={styles.required} aria-hidden="true">*</span>
            </label>
            <input
              id="membershipNumber"
              type="text"
              value={membershipNumber}
              onChange={(e) => setMembershipNumber(e.target.value)}
              required
              disabled={loading}
              aria-required="true"
              aria-describedby={fieldErrors.membershipNumber ? 'membershipNumber-error' : undefined}
              aria-invalid={!!fieldErrors.membershipNumber}
              style={{
                ...styles.input,
                ...(fieldErrors.membershipNumber ? styles.inputError : {}),
              }}
              placeholder="123456"
              inputMode="numeric"
            />
            {fieldErrors.membershipNumber && (
              <span id="membershipNumber-error" style={styles.fieldError} role="alert">
                {fieldErrors.membershipNumber}
              </span>
            )}
          </div>

          {/* Phone Number */}
          <div style={styles.fieldGroup}>
            <label htmlFor="phoneNumber" style={styles.label}>
              Phone Number
            </label>
            <input
              id="phoneNumber"
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={loading}
              aria-describedby="phoneNumber-description phoneNumber-error"
              aria-invalid={!!fieldErrors.phoneNumber}
              style={{
                ...styles.input,
                ...(fieldErrors.phoneNumber ? styles.inputError : {}),
              }}
              placeholder="5551234567"
              inputMode="numeric"
              maxLength={10}
            />
            <span id="phoneNumber-description" style={styles.fieldDescription}>
              Please input phone to gain access to beverage specials and pool experience polls!
            </span>
            {fieldErrors.phoneNumber && (
              <span id="phoneNumber-error" style={styles.fieldError} role="alert">
                {fieldErrors.phoneNumber}
              </span>
            )}
          </div>

          {/* Party Size */}
          <fieldset style={{ ...styles.fieldGroup, border: 'none', padding: 0, margin: '0 0 1.25rem' }}>
            <legend style={styles.label}>
              Party Size <span style={styles.required} aria-hidden="true">*</span>
            </legend>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="memberCount" style={{ ...styles.label, fontSize: '0.8125rem' }}>
                  Members
                </label>
                <input
                  id="memberCount"
                  type="number"
                  value={memberCount}
                  onChange={(e) => setMemberCount(Number(e.target.value))}
                  required
                  min={1}
                  max={20}
                  disabled={loading}
                  aria-required="true"
                  aria-describedby={fieldErrors.partySize ? 'partySize-error' : undefined}
                  aria-invalid={!!fieldErrors.partySize}
                  style={{
                    ...styles.input,
                    ...styles.inputNarrow,
                    ...(fieldErrors.partySize ? styles.inputError : {}),
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="guestCount" style={{ ...styles.label, fontSize: '0.8125rem' }}>
                  Guests
                </label>
                <input
                  id="guestCount"
                  type="number"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  min={0}
                  max={20}
                  disabled={loading}
                  aria-describedby={fieldErrors.partySize ? 'partySize-error' : undefined}
                  aria-invalid={!!fieldErrors.partySize}
                  style={{
                    ...styles.input,
                    ...styles.inputNarrow,
                    ...(fieldErrors.partySize ? styles.inputError : {}),
                  }}
                />
              </div>
            </div>
            {fieldErrors.partySize && (
              <span id="partySize-error" style={styles.fieldError} role="alert">
                {fieldErrors.partySize}
              </span>
            )}
          </fieldset>

          {/* Private Session */}
          <div style={styles.checkboxGroup}>
            <input
              id="isPrivate"
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              disabled={loading}
              style={styles.checkbox}
            />
            <label htmlFor="isPrivate" style={styles.checkboxLabel}>
              Make my session private
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
            aria-busy={loading}
          >
            {loading ? (
              <span>
                <span style={styles.spinner} aria-hidden="true" /> Checking in&hellip;
              </span>
            ) : (
              'Check In'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '2rem 1rem',
    backgroundColor: '#f0f4f8',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    padding: '2rem',
    width: '100%',
    maxWidth: '480px',
  },
  heading: {
    margin: '0 0 1.5rem',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1a202c',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '1.25rem',
  },
  label: {
    marginBottom: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#2d3748',
  },
  required: {
    color: '#e53e3e',
    marginLeft: '2px',
  },
  input: {
    padding: '0.5rem 0.75rem',
    fontSize: '1rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#cbd5e0',
    borderRadius: '4px',
    outline: 'none',
    transition: 'border-color 0.15s',
    color: '#1a202c',
    backgroundColor: '#fff',
  },
  inputNarrow: {
    width: '6rem',
  },
  inputError: {
    borderColor: '#e53e3e',
  },
  fieldError: {
    marginTop: '0.25rem',
    fontSize: '0.8125rem',
    color: '#e53e3e',
  },
  fieldDescription: {
    marginTop: '0.375rem',
    fontSize: '0.8125rem',
    color: '#718096',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
  checkbox: {
    width: '1rem',
    height: '1rem',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '0.9375rem',
    color: '#2d3748',
    cursor: 'pointer',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#3182ce',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#90cdf4',
    cursor: 'not-allowed',
  },
  errorBox: {
    padding: '0.75rem 1rem',
    marginBottom: '1.25rem',
    backgroundColor: '#fff5f5',
    border: '1px solid #feb2b2',
    borderRadius: '4px',
    color: '#c53030',
    fontSize: '0.9375rem',
  },
  successBox: {
    padding: '1.25rem',
    backgroundColor: '#f0fff4',
    border: '1px solid #9ae6b4',
    borderRadius: '4px',
    textAlign: 'center',
  },
  successText: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#276749',
    marginBottom: '1rem',
  },
  infoBox: {
    padding: '1.25rem',
    backgroundColor: '#ebf8ff',
    border: '1px solid #90cdf4',
    borderRadius: '4px',
  },
  smallText: {
    fontSize: '0.8125rem',
    color: '#4a5568',
    marginBottom: '1rem',
  },
  spinner: {
    display: 'inline-block',
    width: '0.875rem',
    height: '0.875rem',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.4)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
};
