import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import NotesTasksAttachments from './NotesTasksAttachments.jsx';

const INK = '#22252b';
const RED = '#d0021b';
const inputStyle = { width: '100%', height: 38, padding: '0 10px', border: '1px solid #e2e2e2', background: '#fff', fontSize: 14, color: INK, outline: 'none', boxSizing: 'border-box' };
const labelStyle = { fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 9 };
const fieldWrap = { marginBottom: 20 };
const sectionTitle = { fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', padding: '0 0 14px', borderBottom: `1px solid ${INK}`, marginBottom: 28 };

const Field = ({ label, value, onChange, type = 'text' }) => (
  <div style={fieldWrap}>
    <div style={labelStyle}>{label}</div>
    <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
  </div>
);

const TYPE_LABELS = { agency: 'Agency', brand: 'Brand', magazine: 'Magazine', producer: 'Producer', office: 'Office' };
const TABS = ['Details', 'Staff', 'Bookings', 'Packages', 'Notes & Tasks'];

export default function ContactProfile({ contactId, onBack }) {
  const [tab, setTab] = useState('Details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [contact, setContact] = useState(null);
  const [staff, setStaff] = useState([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: c, error: cErr } = await supabase.from('contacts').select('*').eq('id', contactId).single();
      if (cErr) throw cErr;
      setContact(c);

      const { data: s } = await supabase.from('contact_people').select('*').eq('contact_id', contactId).order('is_primary', { ascending: false });
      setStaff(s || []);

      const { data: b } = await supabase
        .from('bookings')
        .select('id, description, status, shoot_date')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(50);
      setBookings(b || []);

      const { data: p } = await supabase
        .from('packages')
        .select('id, title, created_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(50);
      setPackages(p || []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  const updateField = (field, value) => setContact((c) => ({ ...c, [field]: value }));

  const save = async () => {
    setSaving(true);
    const { error: uErr } = await supabase
      .from('contacts')
      .update({
        name: contact.name,
        type: contact.type,
        email: contact.email,
        phone: contact.phone,
        billing_address: contact.billing_address,
        country: contact.country,
        vat_number: contact.vat_number,
        default_commission_pct: contact.default_commission_pct,
        payment_terms_days: contact.payment_terms_days,
      })
      .eq('id', contact.id);
    setSaving(false);
    if (uErr) {
      setError(uErr.message);
      return;
    }
    setSaveMsg('Opgeslagen');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const addStaff = async () => {
    if (!newStaffName.trim()) return;
    const { data, error: iErr } = await supabase
      .from('contact_people')
      .insert({ contact_id: contactId, name: newStaffName.trim(), email: newStaffEmail.trim() || null, is_primary: staff.length === 0 })
      .select()
      .single();
    if (iErr) {
      setError(iErr.message);
      return;
    }
    setStaff((s) => [...s, data]);
    setNewStaffName('');
    setNewStaffEmail('');
  };

  const removeStaff = async (id) => {
    await supabase.from('contact_people').delete().eq('id', id);
    setStaff((s) => s.filter((p) => p.id !== id));
  };

  if (loading) return <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: '#999' }}>Laden...</div>;
  if (error) return <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: RED }}>Fout: {error}</div>;
  if (!contact) return null;

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: INK }}>
      <div style={{ padding: '40px 40px 0' }}>
        <button
          onClick={onBack}
          style={{ height: 34, padding: '0 16px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 28 }}
        >
          ← Back to Contacts
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, paddingBottom: 24, borderBottom: '1px solid #ececec' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 40, fontWeight: 300, letterSpacing: '-0.03em' }}>{contact.name}</h1>
            <div style={{ fontSize: 13, color: '#777', marginTop: 10 }}>{TYPE_LABELS[contact.type] || '—'}</div>
          </div>
          {saveMsg && <div style={{ fontSize: 12, color: '#1f9d55' }}>{saveMsg}</div>}
        </div>

        <div style={{ display: 'flex', gap: 32, marginTop: 24 }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                border: 'none', background: 'none', padding: '0 0 12px', fontSize: 13.5, letterSpacing: '0.02em', cursor: 'pointer',
                color: tab === t ? INK : '#8e8e8e', borderBottom: `1px solid ${tab === t ? INK : 'transparent'}`,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 40, maxWidth: 640 }}>
        {tab === 'Details' && (
          <div>
            <div style={sectionTitle}>Details — bewerkbaar</div>
            <Field label="Name" value={contact.name} onChange={(v) => updateField('name', v)} />
            <div style={fieldWrap}>
              <div style={labelStyle}>Type</div>
              <select value={contact.type || ''} onChange={(e) => updateField('type', e.target.value)} style={inputStyle}>
                <option value="">—</option>
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <Field label="Email" value={contact.email} onChange={(v) => updateField('email', v)} />
            <Field label="Phone" value={contact.phone} onChange={(v) => updateField('phone', v)} />
            <Field label="Billing address" value={contact.billing_address} onChange={(v) => updateField('billing_address', v)} />
            <Field label="Country" value={contact.country} onChange={(v) => updateField('country', v)} />
            <Field label="VAT number" value={contact.vat_number} onChange={(v) => updateField('vat_number', v)} />
            <Field label="Default commission (%)" value={contact.default_commission_pct} onChange={(v) => updateField('default_commission_pct', v)} type="number" />
            <Field label="Payment terms (days)" value={contact.payment_terms_days} onChange={(v) => updateField('payment_terms_days', v)} type="number" />
            <button
              onClick={save}
              disabled={saving}
              style={{ height: 44, padding: '0 26px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              {saving ? 'Opslaan...' : 'Save changes'}
            </button>
          </div>
        )}

        {tab === 'Staff' && (
          <div>
            <div style={sectionTitle}>Staff — contactpersonen bij dit bedrijf</div>
            {staff.length === 0 && <div style={{ color: '#aaa', fontSize: 13, marginBottom: 24 }}>Nog geen contactpersonen.</div>}
            <div style={{ marginBottom: 32 }}>
              {staff.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #ececec' }}>
                  <div>
                    <div style={{ fontSize: 14 }}>{p.name} {p.is_primary && <span style={{ fontSize: 10, color: '#1f9d55', marginLeft: 8 }}>PRIMARY</span>}</div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 3 }}>{p.email || '—'} {p.phone ? `· ${p.phone}` : ''}</div>
                  </div>
                  <button onClick={() => removeStaff(p.id)} style={{ border: 'none', background: 'none', color: '#999', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                </div>
              ))}
            </div>
            <div style={labelStyle}>Add a staff member</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <input value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="Naam" style={inputStyle} />
              <input value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} placeholder="E-mail (optioneel)" style={inputStyle} />
            </div>
            <button
              onClick={addStaff}
              style={{ height: 40, padding: '0 22px', border: `1px solid ${INK}`, background: '#fff', color: INK, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              Add staff
            </button>
          </div>
        )}

        {tab === 'Bookings' && (
          <div>
            <div style={sectionTitle}>Bookings ({bookings.length})</div>
            {bookings.length === 0 && <div style={{ color: '#aaa', fontSize: 13 }}>Geen bookings voor dit contact.</div>}
            {bookings.map((b) => (
              <div key={b.id} style={{ padding: '14px 0', borderBottom: '1px solid #ececec' }}>
                <div style={{ fontSize: 14 }}>{b.description}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{b.status} · {b.shoot_date || '—'}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Packages' && (
          <div>
            <div style={sectionTitle}>Packages ({packages.length})</div>
            {packages.length === 0 && <div style={{ color: '#aaa', fontSize: 13 }}>Geen packages voor dit contact.</div>}
            {packages.map((p) => (
              <div key={p.id} style={{ padding: '14px 0', borderBottom: '1px solid #ececec' }}>
                <div style={{ fontSize: 14 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{new Date(p.created_at).toLocaleDateString('nl-NL')}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Notes & Tasks' && <NotesTasksAttachments entityType="contact" entityId={contactId} />}
      </div>
    </div>
  );
}
