import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import ContactProfile from './ContactProfile.jsx';
import Pagination from './Pagination.jsx';

const INK = '#22252b';
const RED = '#d0021b';
const inputStyle = { width: '100%', height: 38, padding: '0 10px', border: '1px solid #e2e2e2', background: '#fff', fontSize: 14, color: INK, outline: 'none', boxSizing: 'border-box' };

const TYPE_LABELS = { agency: 'Agency', brand: 'Brand', magazine: 'Magazine', producer: 'Producer', office: 'Office' };

export default function ContactsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [profileId, setProfileId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    setPage(1);
  }, [q, typeFilter, pageSize]);

  const load = async () => {
    setLoading(true);
    const { data, error: cErr } = await supabase
      .from('contacts')
      .select('id, name, type, email, phone, country')
      .order('name');
    if (cErr) setError(cErr.message);
    setContacts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return contacts.filter((c) => {
      if (typeFilter && c.type !== typeFilter) return false;
      if (query && !c.name.toLowerCase().includes(query) && !(c.email || '').toLowerCase().includes(query)) return false;
      return true;
    });
  }, [contacts, q, typeFilter]);

  const paged = useMemo(() => {
    if (pageSize === 'all') return filtered;
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  if (loading) return <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: '#999' }}>Laden...</div>;

  if (profileId) {
    return <ContactProfile contactId={profileId} onBack={() => { setProfileId(null); load(); }} />;
  }

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: INK }}>
      <main style={{ padding: '0 40px 140px' }}>
        <div style={{ padding: '56px 0 36px', display: 'flex', alignItems: 'baseline', gap: 24 }}>
          <h1 style={{ margin: 0, fontSize: 44, fontWeight: 300, letterSpacing: '-0.03em' }}>Contacts</h1>
          <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999' }}>
            {filtered.length} of {contacts.length}
          </div>
        </div>

        {error && <div style={{ color: RED, fontSize: 13, marginBottom: 20 }}>Fout: {error}</div>}

        <div style={{ display: 'flex', gap: 20, alignItems: 'center', borderTop: `1px solid ${INK}`, borderBottom: '1px solid #ececec', padding: '16px 0', marginBottom: 4 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" style={{ ...inputStyle, width: 280 }} />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ ...inputStyle, width: 180 }}>
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 120px 1.5fr 1fr', gap: 20, padding: '14px 0', borderBottom: '1px solid #ececec', fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#aaa' }}>
          <div>Name</div><div>Type</div><div>Email</div><div>Phone</div>
        </div>
        {paged.map((c) => (
          <div
            key={c.id}
            onClick={() => setProfileId(c.id)}
            style={{ display: 'grid', gridTemplateColumns: '2fr 120px 1.5fr 1fr', gap: 20, padding: '13px 0', borderBottom: '1px solid #ececec', fontSize: 13.5, cursor: 'pointer' }}
          >
            <div>{c.name}</div>
            <div style={{ color: '#999' }}>{TYPE_LABELS[c.type] || '—'}</div>
            <div style={{ color: '#777' }}>{c.email || '—'}</div>
            <div style={{ color: '#777' }}>{c.phone || '—'}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: '60px 0', textAlign: 'center', color: '#aaa' }}>Geen contacten gevonden.</div>}

        {filtered.length > 0 && (
          <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </main>
    </div>
  );
}
