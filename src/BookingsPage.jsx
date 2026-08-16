import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import BookingProfile from './BookingProfile.jsx';

const INK = '#22252b';
const RED = '#d0021b';
const inputStyle = { width: '100%', height: 38, padding: '0 10px', border: '1px solid #e2e2e2', background: '#fff', fontSize: 14, color: INK, outline: 'none', boxSizing: 'border-box' };

const STATUS_COLOR = {
  open: '#999', non_billable: '#999', billable: '#999',
  invoice_ready: '#e08700', invoiced: '#e08700',
  paid: '#1f9d55', payout_pending: '#1f9d55', payout_completed: '#1f9d55',
  closed: '#bbb', cancelled: '#bbb',
};

export default function BookingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [q, setQ] = useState('');
  const [profileId, setProfileId] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error: bErr } = await supabase
      .from('bookings')
      .select('id, description, status, shoot_date, client_name_raw, contacts(name)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (bErr) setError(bErr.message);
    setBookings(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return bookings;
    return bookings.filter(
      (b) =>
        b.description?.toLowerCase().includes(query) ||
        b.contacts?.name?.toLowerCase().includes(query) ||
        b.client_name_raw?.toLowerCase().includes(query)
    );
  }, [bookings, q]);

  if (loading) return <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: '#999' }}>Laden...</div>;

  if (profileId) {
    return <BookingProfile bookingId={profileId} onBack={() => { setProfileId(null); load(); }} />;
  }

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: INK }}>
      <main style={{ padding: '0 40px 140px' }}>
        <div style={{ padding: '56px 0 36px', display: 'flex', alignItems: 'baseline', gap: 24 }}>
          <h1 style={{ margin: 0, fontSize: 44, fontWeight: 300, letterSpacing: '-0.03em' }}>Bookings</h1>
          <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999' }}>
            {filtered.length} of {bookings.length}
          </div>
        </div>

        {error && <div style={{ color: RED, fontSize: 13, marginBottom: 20 }}>Fout: {error}</div>}

        <div style={{ borderTop: `1px solid ${INK}`, borderBottom: '1px solid #ececec', padding: '16px 0', marginBottom: 4 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by description or client" style={{ ...inputStyle, width: 320 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 120px 130px', gap: 20, padding: '14px 0', borderBottom: '1px solid #ececec', fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#aaa' }}>
          <div>Description</div><div>Client</div><div>Shoot date</div><div>Status</div>
        </div>
        {filtered.map((b) => (
          <div
            key={b.id}
            onClick={() => setProfileId(b.id)}
            style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 120px 130px', gap: 20, padding: '13px 0', borderBottom: '1px solid #ececec', fontSize: 13.5, cursor: 'pointer' }}
          >
            <div>{b.description}</div>
            <div style={{ color: '#777' }}>{b.contacts?.name || b.client_name_raw || '—'}</div>
            <div style={{ color: '#999' }}>{b.shoot_date || '—'}</div>
            <div style={{ color: STATUS_COLOR[b.status] || '#999' }}>{b.status}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: '60px 0', textAlign: 'center', color: '#aaa' }}>Geen bookings gevonden.</div>}
      </main>
    </div>
  );
}
