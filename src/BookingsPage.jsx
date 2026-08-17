import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import BookingProfile from './BookingProfile.jsx';
import Pagination from './Pagination.jsx';

const INK = '#22252b';
const RED = '#d0021b';
const inputStyle = { width: '100%', height: 38, padding: '0 10px', border: '1px solid #e2e2e2', background: '#fff', fontSize: 14, color: INK, outline: 'none', boxSizing: 'border-box' };

const STATUS_COLOR = {
  open: '#999', non_billable: '#999', billable: '#999',
  invoice_ready: '#e08700', invoiced: '#e08700',
  paid: '#1f9d55', payout_pending: '#1f9d55', payout_completed: '#1f9d55',
  closed: '#bbb', cancelled: '#bbb',
};

const STATUS_LABELS = {
  open: 'Open', non_billable: 'Non-billable', billable: 'Billable',
  invoice_ready: 'Invoice ready', invoiced: 'Invoiced',
  paid: 'Paid', payout_pending: 'Payout pending', payout_completed: 'Payout completed',
  closed: 'Closed', cancelled: 'Cancelled',
};

const chipStyle = (on) => ({
  height: 30, padding: '0 13px', border: `1px solid ${on ? INK : '#e2e2e2'}`,
  background: on ? INK : '#fff', color: on ? '#fff' : '#555',
  fontSize: 11.5, cursor: 'pointer',
});

export default function BookingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [q, setQ] = useState('');
  const [profileId, setProfileId] = useState(null);
  const [statusFilter, setStatusFilter] = useState(new Set());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const toggleStatus = (s) => {
    setStatusFilter((cur) => {
      const next = new Set(cur);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const clearFilters = () => {
    setStatusFilter(new Set());
    setDateFrom('');
    setDateTo('');
    setQ('');
  };

  const load = async () => {
    setLoading(true);
    let all = [];
    let from = 0;
    let bErr = null;
    while (true) {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, description, status, shoot_date, created_at, client_name_raw, contacts(name)')
        .order('created_at', { ascending: false })
        .range(from, from + 999);
      if (error) {
        bErr = error;
        break;
      }
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    if (bErr) setError(bErr.message);
    setBookings(all);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return bookings.filter((b) => {
      if (query) {
        const matches =
          b.description?.toLowerCase().includes(query) ||
          b.contacts?.name?.toLowerCase().includes(query) ||
          b.client_name_raw?.toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (statusFilter.size > 0 && !statusFilter.has(b.status)) return false;
      if (dateFrom && (!b.created_at || b.created_at.slice(0, 10) < dateFrom)) return false;
      if (dateTo && (!b.created_at || b.created_at.slice(0, 10) > dateTo)) return false;
      return true;
    });
  }, [bookings, q, statusFilter, dateFrom, dateTo]);

  const activeFilterCount = statusFilter.size + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  useEffect(() => {
    setPage(1);
  }, [q, statusFilter, dateFrom, dateTo, pageSize]);

  const paged = useMemo(() => {
    if (pageSize === 'all') return filtered;
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

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

        <div style={{ borderTop: `1px solid ${INK}`, borderBottom: showFilters ? 'none' : '1px solid #ececec', padding: '16px 0', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by description or client" style={{ ...inputStyle, width: 320 }} />
            <button
              onClick={() => setShowFilters((s) => !s)}
              style={{
                height: 38, padding: '0 20px', border: `1px solid ${INK}`,
                background: showFilters ? INK : '#fff', color: showFilters ? '#fff' : INK,
                fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {showFilters ? 'Close filters' : activeFilterCount ? `Filters · ${activeFilterCount}` : 'Filters'}
            </button>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} style={{ border: 'none', background: 'none', color: '#999', cursor: 'pointer', fontSize: 12.5 }}>Clear all</button>
            )}
          </div>
        </div>

        {showFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '28px 40px', padding: '20px 0 40px', borderBottom: '1px solid #ececec', marginBottom: 4 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 14 }}>Status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <button key={v} onClick={() => toggleStatus(v)} style={chipStyle(statusFilter.has(v))}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 14 }}>Booking date</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...inputStyle, height: 36 }} />
                <span style={{ color: '#999' }}>–</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...inputStyle, height: 36 }} />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 110px 110px 120px', gap: 20, padding: '14px 0', borderBottom: '1px solid #ececec', fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#aaa' }}>
          <div>Description</div><div>Client</div><div>Booking date</div><div>Shoot date</div><div>Status</div>
        </div>
        {paged.map((b) => (
          <div
            key={b.id}
            onClick={() => setProfileId(b.id)}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 110px 110px 120px', gap: 20, padding: '13px 0', borderBottom: '1px solid #ececec', fontSize: 13.5, cursor: 'pointer' }}
          >
            <div>{b.description}</div>
            <div style={{ color: '#777' }}>{b.contacts?.name || b.client_name_raw || '—'}</div>
            <div style={{ color: '#999' }}>{b.created_at ? new Date(b.created_at).toLocaleDateString('nl-NL') : '—'}</div>
            <div style={{ color: '#999' }}>{b.shoot_date || '—'}</div>
            <div style={{ color: STATUS_COLOR[b.status] || '#999' }}>{b.status}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: '60px 0', textAlign: 'center', color: '#aaa' }}>Geen bookings gevonden.</div>}

        {filtered.length > 0 && (
          <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </main>
    </div>
  );
}
