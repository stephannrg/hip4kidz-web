import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import BookingProfile from './BookingProfile.jsx';

const INK = '#22252b';
const RED = '#d0021b';
const inputStyle = { width: '100%', height: 38, padding: '0 10px', border: '1px solid #e2e2e2', background: '#fff', fontSize: 14, color: INK, outline: 'none', boxSizing: 'border-box' };

const STATUS_LABELS = { draft: 'Draft', sent: 'Sent', invoiced: 'Invoiced', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled' };
const STATUS_COLOR = { draft: '#999', sent: '#e08700', invoiced: '#e08700', paid: '#1f9d55', overdue: '#d0021b', cancelled: '#bbb' };

const chipStyle = (on) => ({
  height: 30, padding: '0 13px', border: `1px solid ${on ? INK : '#e2e2e2'}`,
  background: on ? INK : '#fff', color: on ? '#fff' : '#555',
  fontSize: 11.5, cursor: 'pointer',
});

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [profileBookingId, setProfileBookingId] = useState(null);

  const load = async () => {
    setLoading(true);
    let all = [];
    let from = 0;
    let iErr = null;
    while (true) {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total_amount, vat_amount, currency, due_date, created_at, booking_id, bookings(id, description), contacts(name)')
        .order('created_at', { ascending: false })
        .range(from, from + 999);
      if (error) {
        iErr = error;
        break;
      }
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    if (iErr) setError(iErr.message);
    setInvoices(all);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleStatus = (s) => {
    setStatusFilter((cur) => {
      const next = new Set(cur);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (query) {
        const matches =
          inv.invoice_number?.toLowerCase().includes(query) ||
          inv.bookings?.description?.toLowerCase().includes(query) ||
          inv.contacts?.name?.toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (statusFilter.size > 0 && !statusFilter.has(inv.status)) return false;
      return true;
    });
  }, [invoices, q, statusFilter]);

  const totalOutstanding = filtered
    .filter((i) => ['sent', 'invoiced', 'overdue'].includes(i.status))
    .reduce((s, i) => s + (parseFloat(i.total_amount) || 0), 0);

  if (loading) return <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: '#999' }}>Laden...</div>;

  if (profileBookingId) {
    return <BookingProfile bookingId={profileBookingId} onBack={() => { setProfileBookingId(null); load(); }} />;
  }

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: INK }}>
      <main style={{ padding: '0 40px 140px' }}>
        <div style={{ padding: '56px 0 36px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
            <h1 style={{ margin: 0, fontSize: 44, fontWeight: 300, letterSpacing: '-0.03em' }}>Invoices</h1>
            <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999' }}>
              {filtered.length} of {invoices.length}
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#777' }}>
            Openstaand: <span style={{ color: INK, fontWeight: 600 }}>€ {totalOutstanding.toFixed(2)}</span>
          </div>
        </div>

        {error && <div style={{ color: RED, fontSize: 13, marginBottom: 20 }}>Fout: {error}</div>}

        <div style={{ borderTop: `1px solid ${INK}`, borderBottom: showFilters ? 'none' : '1px solid #ececec', padding: '16px 0', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by invoice number, booking or client" style={{ ...inputStyle, width: 340 }} />
            <button
              onClick={() => setShowFilters((s) => !s)}
              style={{
                height: 38, padding: '0 20px', border: `1px solid ${INK}`,
                background: showFilters ? INK : '#fff', color: showFilters ? '#fff' : INK,
                fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {showFilters ? 'Close filters' : statusFilter.size ? `Filters · ${statusFilter.size}` : 'Filters'}
            </button>
          </div>
        </div>

        {showFilters && (
          <div style={{ padding: '20px 0 40px', borderBottom: '1px solid #ececec', marginBottom: 4 }}>
            <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 14 }}>Status</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <button key={v} onClick={() => toggleStatus(v)} style={chipStyle(statusFilter.has(v))}>{l}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '110px 2fr 1.3fr 110px 110px 110px', gap: 20, padding: '14px 0', borderBottom: '1px solid #ececec', fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#aaa' }}>
          <div>Number</div><div>Booking</div><div>Client</div><div>Due date</div><div>Amount</div><div>Status</div>
        </div>
        {filtered.map((inv) => (
          <div
            key={inv.id}
            onClick={() => setProfileBookingId(inv.booking_id)}
            style={{ display: 'grid', gridTemplateColumns: '110px 2fr 1.3fr 110px 110px 110px', gap: 20, padding: '13px 0', borderBottom: '1px solid #ececec', fontSize: 13.5, cursor: 'pointer' }}
          >
            <div>{inv.invoice_number || '—'}</div>
            <div>{inv.bookings?.description || '—'}</div>
            <div style={{ color: '#777' }}>{inv.contacts?.name || '—'}</div>
            <div style={{ color: '#999' }}>{inv.due_date || '—'}</div>
            <div>{inv.currency === 'EUR' ? '€' : inv.currency || ''} {parseFloat(inv.total_amount || 0).toFixed(2)}</div>
            <div style={{ color: STATUS_COLOR[inv.status] || '#999' }}>{STATUS_LABELS[inv.status] || inv.status}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: '60px 0', textAlign: 'center', color: '#aaa' }}>Geen facturen gevonden.</div>}
      </main>
    </div>
  );
}
