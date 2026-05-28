'use client';

import { useEffect, useState } from 'react';

interface SessionData {
  id: string;
  name: string;
  membershipNumber: string;
  phoneNumber?: string;
  partySize: number;
  isPrivate: boolean;
  checkedInAt: string;
}

interface SSEPayload {
  totalOccupancy: number;
  sessions: SessionData[];
  timestamp: string;
}

export default function StatusPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [totalOccupancy, setTotalOccupancy] = useState<number>(0);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    // Fetch initial session data
    async function fetchInitialData() {
      try {
        const response = await fetch('/api/sessions');
        if (response.ok) {
          const data: SessionData[] = await response.json();
          if (isMounted) {
            setSessions(data);
            setTotalOccupancy(data.reduce((sum, s) => sum + s.partySize, 0));
          }
        }
      } catch {
        // Silently handle fetch errors — SSE will provide data shortly
      }
    }

    function connectSSE() {
      if (!isMounted) return;

      eventSource = new EventSource('/api/sse');

      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const payload: SSEPayload = JSON.parse(event.data);
          if (isMounted) {
            setSessions(payload.sessions);
            setTotalOccupancy(payload.totalOccupancy);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      eventSource.onerror = () => {
        // Close the current connection and reconnect after 3 seconds
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (isMounted) {
          reconnectTimeout = setTimeout(() => {
            connectSSE();
          }, 3000);
        }
      };
    }

    fetchInitialData();
    connectSSE();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    };
  }, []);

  const membersCheckedIn = sessions.length;
  const hasPhoneColumn = sessions.some((s) => s.phoneNumber !== undefined);

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Pool Status</h1>

      <section style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{
          padding: '1.5rem',
          border: '1px solid #ddd',
          borderRadius: '8px',
          textAlign: 'center',
          flex: 1,
        }}>
          <p style={{ fontSize: '0.875rem', color: '#666', margin: '0 0 0.5rem' }}>Current Occupancy</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0 }}>{totalOccupancy}</p>
        </div>
        <div style={{
          padding: '1.5rem',
          border: '1px solid #ddd',
          borderRadius: '8px',
          textAlign: 'center',
          flex: 1,
        }}>
          <p style={{ fontSize: '0.875rem', color: '#666', margin: '0 0 0.5rem' }}>Members Checked In</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0 }}>{membersCheckedIn}</p>
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: '1rem' }}>Active Sessions</h2>
        {sessions.length === 0 ? (
          <p style={{ color: '#666' }}>No active sessions.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #333' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>Party Size</th>
                {hasPhoneColumn && (
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>Phone Number</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session.id}
                  style={{
                    borderBottom: '1px solid #eee',
                    backgroundColor: session.isPrivate ? '#f9f5ff' : 'transparent',
                  }}
                >
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    {session.name}
                    {session.isPrivate && (
                      <span style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.75rem',
                        backgroundColor: '#7c3aed',
                        color: '#fff',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '4px',
                        fontWeight: 500,
                      }}>
                        (Private)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{session.partySize}</td>
                  {hasPhoneColumn && (
                    <td style={{ padding: '0.75rem 0.5rem' }}>{session.phoneNumber ?? '—'}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
