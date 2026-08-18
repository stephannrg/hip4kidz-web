import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';

const INK = '#22252b';
const RED = '#d0021b';
const inputStyle = { width: '100%', height: 40, padding: '0 12px', border: '1px solid #e2e2e2', background: '#fff', fontSize: 15, color: INK, outline: 'none', boxSizing: 'border-box' };
const labelStyle = { fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 9 };

export default function GuardianApp({ session, guardianAccount, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('guardian_talent_links')
      .select('talent(id, name, date_of_birth, shoe_size, kids_clothing_size, height_cm, hair_color, hair_length, hair_type, eye_color)')
      .eq('guardian_account_id', guardianAccount.id);
    setChildren((data || []).map((r) => r.talent).filter(Boolean));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: '#999' }}>Laden...</div>;

  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: INK, background: '#fff' }}>
      <header style={{ borderBottom: '1px solid #ececec' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Hip4Kidz — Mijn Account</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: '#777' }}>{session.user.email}</span>
            <button onClick={onLogout} style={{ border: 'none', background: 'none', color: '#999', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Uitloggen</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 100px' }}>
        {!selectedChild ? (
          <>
            <h1 style={{ margin: '0 0 32px', fontSize: 32, fontWeight: 300, letterSpacing: '-0.02em' }}>Mijn kinderen</h1>
            {children.length === 0 && <div style={{ color: '#aaa', fontSize: 14 }}>Er is nog geen kind aan dit account gekoppeld.</div>}
            {children.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedChildId(c.id)}
                style={{ padding: '18px 0', borderBottom: '1px solid #ececec', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontSize: 17 }}>{c.name}</span>
                <span style={{ color: '#bbb', fontSize: 18 }}>›</span>
              </div>
            ))}
          </>
        ) : (
          <ChildDetail child={selectedChild} guardianAccountId={guardianAccount.id} onBack={() => { setSelectedChildId(null); load(); }} />
        )}
      </main>
    </div>
  );
}

function ChildDetail({ child, guardianAccountId, onBack }) {
  const [form, setForm] = useState({
    shoe_size: child.shoe_size || '',
    kids_clothing_size: child.kids_clothing_size || '',
    height_cm: child.height_cm || '',
    hair_color: child.hair_color || '',
    hair_length: child.hair_length || '',
    hair_type: child.hair_type || '',
    eye_color: child.eye_color || '',
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const loadPhotos = async () => {
    const { data } = await supabase.from('guardian_photos').select('*').eq('talent_id', child.id).order('created_at', { ascending: false });
    setPhotos(data || []);
  };

  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id]);

  const save = async () => {
    setSaving(true);
    setError('');
    const { error: rpcError } = await supabase.rpc('guardian_update_talent_details', {
      p_talent_id: child.id,
      p_shoe_size: form.shoe_size || null,
      p_kids_clothing_size: form.kids_clothing_size || null,
      p_height_cm: form.height_cm ? parseInt(form.height_cm, 10) : null,
      p_hair_color: form.hair_color || null,
      p_hair_length: form.hair_length || null,
      p_hair_type: form.hair_type || null,
      p_eye_color: form.eye_color || null,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setSaveMsg('Opgeslagen');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const storagePath = `${child.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('guardian-uploads').upload(storagePath, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('guardian_photos').insert({
        talent_id: child.id, guardian_account_id: guardianAccountId, storage_path: storagePath,
      });
      if (insErr) throw insErr;
      loadPhotos();
    } catch (err) {
      alert('Upload mislukt: ' + (err.message || err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const STATUS_LABEL = { pending: 'In afwachting van goedkeuring', approved: 'Goedgekeurd', rejected: 'Afgewezen' };
  const STATUS_COLOR = { pending: '#e08700', approved: '#1f9d55', rejected: '#d0021b' };

  return (
    <div>
      <button onClick={onBack} style={{ height: 34, padding: '0 16px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 28 }}>
        ← Terug
      </button>

      <h1 style={{ margin: '0 0 32px', fontSize: 32, fontWeight: 300, letterSpacing: '-0.02em' }}>{child.name}</h1>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${INK}` }}>
        <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>Maten aanpassen</div>
        {saveMsg && <div style={{ fontSize: 12, color: '#1f9d55' }}>{saveMsg}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div>
          <div style={labelStyle}>Lengte (cm)</div>
          <input type="number" value={form.height_cm} onChange={(e) => setForm((f) => ({ ...f, height_cm: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <div style={labelStyle}>Schoenmaat</div>
          <input value={form.shoe_size} onChange={(e) => setForm((f) => ({ ...f, shoe_size: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <div style={labelStyle}>Kledingmaat</div>
          <input value={form.kids_clothing_size} onChange={(e) => setForm((f) => ({ ...f, kids_clothing_size: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <div style={labelStyle}>Oogkleur</div>
          <input value={form.eye_color} onChange={(e) => setForm((f) => ({ ...f, eye_color: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <div style={labelStyle}>Haarkleur</div>
          <input value={form.hair_color} onChange={(e) => setForm((f) => ({ ...f, hair_color: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <div style={labelStyle}>Haarlengte</div>
          <input value={form.hair_length} onChange={(e) => setForm((f) => ({ ...f, hair_length: e.target.value }))} style={inputStyle} />
        </div>
      </div>
      {error && <div style={{ color: RED, fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <button
        onClick={save}
        disabled={saving}
        style={{ height: 46, padding: '0 26px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 56 }}
      >
        {saving ? 'Opslaan...' : 'Opslaan'}
      </button>

      <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', paddingBottom: 14, borderBottom: `1px solid ${INK}`, marginBottom: 20 }}>
        Foto's uploaden
      </div>
      <div style={{ fontSize: 13, color: '#999', marginBottom: 20 }}>
        Nieuwe foto's worden eerst door Hip4Kidz bekeken voordat ze ergens gebruikt worden.
      </div>

      {photos.map((p) => (
        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #ececec' }}>
          <span style={{ fontSize: 13.5 }}>{p.storage_path.split('/').pop()}</span>
          <span style={{ fontSize: 11.5, color: STATUS_COLOR[p.status] }}>{STATUS_LABEL[p.status]}</span>
        </div>
      ))}
      {photos.length === 0 && <div style={{ color: '#aaa', fontSize: 13, marginBottom: 16 }}>Nog geen foto's geupload.</div>}

      <div style={{ marginTop: 20 }}>
        <label style={{ height: 44, padding: '0 22px', border: `1px solid ${INK}`, background: '#fff', color: INK, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: uploading ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center' }}>
          {uploading ? 'Bezig...' : '+ Foto uploaden'}
          <input type="file" accept="image/*" onChange={uploadPhoto} disabled={uploading} style={{ display: 'none' }} />
        </label>
      </div>
    </div>
  );
}
