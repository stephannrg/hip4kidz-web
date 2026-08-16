import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';

const INK = '#22252b';
const RED = '#d0021b';
const inputStyle = { width: '100%', height: 38, padding: '0 10px', border: '1px solid #e2e2e2', background: '#fff', fontSize: 14, color: INK, outline: 'none', boxSizing: 'border-box' };
const labelStyle = { fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 9 };
const fieldWrap = { marginBottom: 20 };

const Field = ({ label, value, onChange, type = 'text' }) => (
  <div style={fieldWrap}>
    <div style={labelStyle}>{label}</div>
    <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
  </div>
);

const TYPE_LABELS = { agency: 'Agency', brand: 'Brand', magazine: 'Magazine', producer: 'Producer', office: 'Office' };

export default function ContactsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

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

  const openContact = async (id) => {
    setDetail({ loading: true });
    setSaveMsg('');
    const { data, error: dErr } = await supabase.from('contacts').select('*').eq('id', id).single();
    if (dErr) {
      setDetail({ error: dErr.message });
      return;
    }
    setDetail({ contact: data });
  };

  const updateField = (field, value) => {
    setDetail((d) => ({ ...d, contact: { ...d.contact, [field]: value } }));
  };

  const save = async () => {
    setSaving(true);
    const c = detail.contact;
    const { error: uErr } = await supabase
      .from('contacts')
      .update({
        name: c.name,
        type: c.type,
        email: c.email,
        phone: c.phone,
        billing_address: c.billing_address,
        country: c.country,
        vat_number: c.vat_number,
        default_commission_pct: c.default_commission_pct,
        payment_terms_days: c.payment_terms_days,
      })
      .eq('id', c.id);
    setSaving(false);
    if (uErr) {
      setError(uErr.message);
      return;
    }
    setSaveMsg('Opgeslagen');
    setTimeout(() => setSaveMsg(''), 2000);
    load();
  };

  if (loading) return <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: '#999' }}>Laden...</div>;

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
        {filtered.map((c) => (
          <div
            key={c.id}
            onClick={() => openContact(c.id)}
            style={{ display: 'grid', gridTemplateColumns: '2fr 120px 1.5fr 1fr', gap: 20, padding: '13px 0', borderBottom: '1px solid #ececec', fontSize: 13.5, cursor: 'pointer' }}
          >
            <div>{c.name}</div>
            <div style={{ color: '#999' }}>{TYPE_LABELS[c.type] || '—'}</div>
            <div style={{ color: '#777' }}>{c.email || '—'}</div>
            <div style={{ color: '#777' }}>{c.phone || '—'}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: '60px 0', textAlign: 'center', color: '#aaa' }}>Geen contacten gevonden.</div>}
      </main>

      {detail && (
        <>
          <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(3px)', zIndex: 50 }} />
          <aside style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 560, background: '#fff', zIndex: 51, borderLeft: '1px solid #e2e2e2', boxShadow: '-40px 0 80px rgba(0,0,0,0.06)', overflowY: 'auto', padding: 48 }}>
            <button onClick={() => setDetail(null)} style={{ position: 'absolute', top: 40, right: 40, width: 34, height: 34, border: '1px solid #e2e2e2', background: '#fff', fontSize: 16, lineHeight: 1, color: '#666', cursor: 'pointer' }}>×</button>

            {detail.loading && <div style={{ color: '#aaa', fontSize: 13 }}>Laden...</div>}
            {detail.error && <div style={{ color: RED, fontSize: 13 }}>Fout: {detail.error}</div>}

            {detail.contact && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 32 }}>
                  <div style={{ fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#aaa' }}>Contact</div>
                  {saveMsg && <div style={{ fontSize: 12, color: '#1f9d55' }}>{saveMsg}</div>}
                </div>

                <Field label="Name" value={detail.contact.name} onChange={(v) => updateField('name', v)} />

                <div style={fieldWrap}>
                  <div style={labelStyle}>Type</div>
                  <select value={detail.contact.type || ''} onChange={(e) => updateField('type', e.target.value)} style={inputStyle}>
                    <option value="">—</option>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>

                <Field label="Email" value={detail.contact.email} onChange={(v) => updateField('email', v)} />
                <Field label="Phone" value={detail.contact.phone} onChange={(v) => updateField('phone', v)} />
                <Field label="Billing address" value={detail.contact.billing_address} onChange={(v) => updateField('billing_address', v)} />
                <Field label="Country" value={detail.contact.country} onChange={(v) => updateField('country', v)} />
                <Field label="VAT number" value={detail.contact.vat_number} onChange={(v) => updateField('vat_number', v)} />
                <Field label="Default commission (%)" value={detail.contact.default_commission_pct} onChange={(v) => updateField('default_commission_pct', v)} type="number" />
                <Field label="Payment terms (days)" value={detail.contact.payment_terms_days} onChange={(v) => updateField('payment_terms_days', v)} type="number" />

                <button
                  onClick={save}
                  disabled={saving}
                  style={{ height: 46, padding: '0 26px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  {saving ? 'Opslaan...' : 'Save changes'}
                </button>
              </>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
