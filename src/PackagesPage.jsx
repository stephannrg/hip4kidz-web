import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import PackageProfile from './PackageProfile.jsx';
import Pagination from './Pagination.jsx';

const INK = '#22252b';
const RED = '#d0021b';
const inputStyle = { width: '100%', height: 38, padding: '0 10px', border: '1px solid #e2e2e2', background: '#fff', fontSize: 14, color: INK, outline: 'none', boxSizing: 'border-box' };
const labelStyle = { fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 9 };

export default function PackagesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [packages, setPackages] = useState([]);
  const [profileId, setProfileId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const paged = useMemo(() => {
    if (pageSize === 'all') return packages;
    const start = (page - 1) * pageSize;
    return packages.slice(start, start + pageSize);
  }, [packages, page, pageSize]);

  const load = async () => {
    setLoading(true);
    let all = [];
    let from = 0;
    let pErr = null;
    while (true) {
      const { data, error } = await supabase
        .from('packages')
        .select('id, title, created_at, contacts(name), package_items(id, client_selected)')
        .order('created_at', { ascending: false })
        .range(from, from + 999);
      if (error) {
        pErr = error;
        break;
      }
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    if (pErr) setError(pErr.message);
    setPackages(all);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: '#999' }}>Laden...</div>;

  if (profileId) {
    return <PackageProfile packageId={profileId} onBack={() => { setProfileId(null); load(); }} />;
  }

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: INK }}>
      <main style={{ padding: '0 40px 140px' }}>
        <div style={{ padding: '56px 0 36px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: 44, fontWeight: 300, letterSpacing: '-0.03em' }}>Packages</h1>
          <button
            onClick={() => setCreating(true)}
            style={{ height: 40, padding: '0 22px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            New package
          </button>
        </div>

        {error && <div style={{ color: RED, fontSize: 13, marginBottom: 20 }}>Fout: {error}</div>}

        <div style={{ borderTop: `1px solid ${INK}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 100px 100px 140px', gap: 20, padding: '14px 0', borderBottom: '1px solid #ececec', fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#aaa' }}>
            <div>Description</div><div>Client</div><div>Talent</div><div>Selected</div><div>Created</div>
          </div>
          {paged.map((p) => (
            <div
              key={p.id}
              onClick={() => setProfileId(p.id)}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 100px 100px 140px', gap: 20, padding: '14px 0', borderBottom: '1px solid #ececec', fontSize: 13.5, cursor: 'pointer' }}
            >
              <div>{p.title}</div>
              <div style={{ color: '#777' }}>{p.contacts?.name || '—'}</div>
              <div>{p.package_items?.length || 0}</div>
              <div>{(p.package_items || []).filter((m) => m.client_selected).length}</div>
              <div style={{ color: '#999' }}>{new Date(p.created_at).toLocaleDateString('nl-NL')}</div>
            </div>
          ))}
          {packages.length === 0 && <div style={{ padding: '60px 0', textAlign: 'center', color: '#aaa' }}>Nog geen packages.</div>}
        </div>

        {packages.length > 0 && (
          <Pagination page={page} pageSize={pageSize} total={packages.length} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
        )}
      </main>

      {creating && (
        <NewPackageForm
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); load(); }}
        />
      )}
    </div>
  );
}

function NewPackageForm({ onClose, onCreated }) {
  const [description, setDescription] = useState('');
  const [contacts, setContacts] = useState([]);
  const [contactId, setContactId] = useState('');
  const [talentQuery, setTalentQuery] = useState('');
  const [talentResults, setTalentResults] = useState([]);
  const [selectedTalent, setSelectedTalent] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.from('contacts').select('id, name').order('name').limit(500).then(({ data }) => setContacts(data || []));
  }, []);

  const searchTalent = async (q) => {
    setTalentQuery(q);
    if (!q.trim()) {
      setTalentResults([]);
      return;
    }
    const { data } = await supabase.from('talent').select('id, name').ilike('name', `%${q}%`).eq('status', 'published').limit(15);
    setTalentResults(data || []);
  };

  const addTalent = (t) => {
    if (selectedTalent.find((s) => s.id === t.id)) return;
    setSelectedTalent((s) => [...s, t]);
    setTalentQuery('');
    setTalentResults([]);
  };

  const removeTalent = (id) => setSelectedTalent((s) => s.filter((t) => t.id !== id));

  const save = async () => {
    if (!description.trim()) {
      setError('Omschrijving is verplicht.');
      return;
    }
    if (selectedTalent.length === 0) {
      setError('Voeg minstens één model toe.');
      return;
    }
    setSaving(true);
    const { data: pkg, error: pErr } = await supabase
      .from('packages')
      .insert({ title: description, type: 'casting', contact_id: contactId || null })
      .select()
      .single();
    if (pErr) {
      setSaving(false);
      setError(pErr.message);
      return;
    }
    const { error: mErr } = await supabase
      .from('package_items')
      .insert(selectedTalent.map((t) => ({ package_id: pkg.id, talent_id: t.id })));
    setSaving(false);
    if (mErr) {
      setError(mErr.message);
      return;
    }
    onCreated();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(3px)', zIndex: 50 }} />
      <aside style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 560, background: '#fff', zIndex: 51, borderLeft: '1px solid #e2e2e2', boxShadow: '-40px 0 80px rgba(0,0,0,0.06)', overflowY: 'auto', padding: 48 }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 40, right: 40, width: 34, height: 34, border: '1px solid #e2e2e2', background: '#fff', fontSize: 16, lineHeight: 1, color: '#666', cursor: 'pointer' }}>×</button>

        <div style={{ fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#aaa', marginBottom: 16 }}>New package</div>

        <div style={{ marginBottom: 22 }}>
          <div style={labelStyle}>Description</div>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder='bv. "TH Girls 104 cm"' style={inputStyle} />
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={labelStyle}>Client</div>
          <select value={contactId} onChange={(e) => setContactId(e.target.value)} style={inputStyle}>
            <option value="">— geen —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={labelStyle}>Talent toevoegen</div>
          <input value={talentQuery} onChange={(e) => searchTalent(e.target.value)} placeholder="Zoek op naam" style={inputStyle} />
          {talentResults.length > 0 && (
            <div style={{ border: '1px solid #ececec', marginTop: 6 }}>
              {talentResults.map((t) => (
                <div key={t.id} onClick={() => addTalent(t)} style={{ padding: '10px 12px', borderBottom: '1px solid #ececec', fontSize: 13.5, cursor: 'pointer' }}>
                  {t.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 32 }}>
          {selectedTalent.map((t) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ececec', fontSize: 13.5 }}>
              <span>{t.name}</span>
              <button onClick={() => removeTalent(t.id)} style={{ border: 'none', background: 'none', color: '#bbb', cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>

        {error && <div style={{ color: RED, fontSize: 12.5, marginBottom: 16 }}>{error}</div>}

        <button
          onClick={save}
          disabled={saving}
          style={{ height: 46, padding: '0 26px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          {saving ? 'Opslaan...' : 'Create package'}
        </button>
      </aside>
    </>
  );
}
