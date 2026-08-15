import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';

const INK = '#22252b';
const RED = '#d0021b';

const labelStyle = { fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 9 };
const inputStyle = { width: '100%', height: 38, padding: '0 10px', border: '1px solid #e2e2e2', background: '#fff', fontSize: 14, color: INK, outline: 'none', boxSizing: 'border-box' };
const fieldWrap = { marginBottom: 22 };
const sectionTitle = { fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', padding: '0 0 14px', borderBottom: `1px solid ${INK}`, marginBottom: 28 };

const Field = ({ label, value, onChange, type = 'text' }) => (
  <div style={fieldWrap}>
    <div style={labelStyle}>{label}</div>
    <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
  </div>
);

const SKILL_SUGGESTIONS = {
  Dance: ['Ballet', 'Hip Hop', 'Jazz', 'Modern', 'Tap', 'Breakdance'],
  Singing: ['Pop', 'Classical', 'Musical theatre'],
  Sports: ['Swimming', 'Gymnastics', 'Football', 'Horse riding', 'Ice skating'],
  Languages: ['English', 'French', 'German', 'Spanish'],
  Instruments: ['Piano', 'Guitar', 'Violin'],
  'Stage Performance': ['Acting', 'Improv', 'Presenting'],
  Accents: ['British', 'American'],
};

const TABS = ['Overview', 'Appearance', 'Skills', 'Guardian & Payout', 'Bookings'];

export default function TalentProfile({ talentId, onBack }) {
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [talent, setTalent] = useState(null);
  const [appearance, setAppearance] = useState({});
  const [guardian, setGuardian] = useState(null);
  const [skills, setSkills] = useState([]);
  const [newSkillCategory, setNewSkillCategory] = useState('Dance');
  const [newSkillLabel, setNewSkillLabel] = useState('');
  const [bookings, setBookings] = useState([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: t, error: tErr } = await supabase
        .from('talent')
        .select('*, divisions(name)')
        .eq('id', talentId)
        .single();
      if (tErr) throw tErr;
      setTalent(t);
      setAppearance({
        shoe_size: t.shoe_size,
        kids_clothing_size: t.kids_clothing_size,
        hair_color: t.hair_color,
        hair_length: t.hair_length,
        hair_type: t.hair_type,
        eye_color: t.eye_color,
        complexion: t.complexion,
        height_cm: t.height_cm,
      });

      const { data: g } = await supabase
        .from('guardian_talent_links')
        .select('guardian_accounts(*)')
        .eq('talent_id', talentId)
        .limit(1)
        .maybeSingle();
      setGuardian(g?.guardian_accounts || null);

      const { data: s } = await supabase
        .from('talent_skills')
        .select('*')
        .eq('talent_id', talentId)
        .order('category')
        .order('label');
      setSkills(s || []);

      const { data: b } = await supabase
        .from('booking_talent')
        .select('availability_status, bookings(id, description, status, shoot_date)')
        .eq('talent_id', talentId)
        .order('created_at', { ascending: false })
        .limit(5);
      setBookings(b || []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talentId]);

  const flashSaved = () => {
    setSaveMsg('Opgeslagen');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const saveAppearance = async () => {
    setSaving(true);
    const { error: uErr } = await supabase.from('talent').update(appearance).eq('id', talentId);
    setSaving(false);
    if (uErr) {
      setError(uErr.message);
    } else {
      flashSaved();
    }
  };

  const saveGuardian = async () => {
    if (!guardian?.id) return;
    setSaving(true);
    const { error: uErr } = await supabase
      .from('guardian_accounts')
      .update({
        name: guardian.name,
        email: guardian.email,
        phone: guardian.phone,
        address_street: guardian.address_street,
        address_postal_code: guardian.address_postal_code,
        address_city: guardian.address_city,
        address_country: guardian.address_country,
        iban: guardian.iban,
        iban_account_holder: guardian.iban_account_holder,
      })
      .eq('id', guardian.id);
    setSaving(false);
    if (uErr) {
      setError(uErr.message);
    } else {
      flashSaved();
    }
  };

  const addSkill = async () => {
    if (!newSkillLabel.trim()) return;
    const { data, error: iErr } = await supabase
      .from('talent_skills')
      .insert({ talent_id: talentId, category: newSkillCategory, label: newSkillLabel.trim() })
      .select()
      .single();
    if (iErr) {
      setError(iErr.message);
      return;
    }
    setSkills((s) => [...s, data]);
    setNewSkillLabel('');
  };

  const removeSkill = async (id) => {
    await supabase.from('talent_skills').delete().eq('id', id);
    setSkills((s) => s.filter((sk) => sk.id !== id));
  };

  if (loading) return <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: '#999' }}>Laden...</div>;
  if (error) return <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: RED }}>Fout: {error}</div>;
  if (!talent) return null;

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: INK }}>
      <div style={{ padding: '40px 40px 0' }}>
        <button
          onClick={onBack}
          style={{ border: 'none', background: 'none', padding: 0, fontSize: 12.5, color: '#999', cursor: 'pointer', letterSpacing: '0.02em', marginBottom: 24 }}
        >
          ← Back to Talent
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, paddingBottom: 24, borderBottom: '1px solid #ececec' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 40, fontWeight: 300, letterSpacing: '-0.03em' }}>{talent.name}</h1>
            <div style={{ fontSize: 13, color: '#777', marginTop: 10 }}>
              {talent.divisions?.name || '—'} · {talent.date_of_birth ? new Date(talent.date_of_birth).toLocaleDateString('nl-NL') : '—'}
            </div>
          </div>
          {saveMsg && <div style={{ fontSize: 12, color: '#1f9d55', letterSpacing: '0.04em' }}>{saveMsg}</div>}
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
        {tab === 'Overview' && (
          <div>
            <div style={sectionTitle}>Core details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#ececec', border: '1px solid #ececec' }}>
              {[
                ['Name', talent.name],
                ['Date of birth', talent.date_of_birth ? new Date(talent.date_of_birth).toLocaleDateString('nl-NL') : '—'],
                ['Division', talent.divisions?.name || '—'],
                ['Status', talent.status],
                ['Location', talent.location || '—'],
                ['Height', talent.height_cm ? `${talent.height_cm} cm` : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: '#fff', padding: 20 }}>
                  <div style={labelStyle}>{k}</div>
                  <div style={{ fontSize: 15 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'Appearance' && (
          <div>
            <div style={sectionTitle}>Appearance — bewerkbaar</div>
            <Field label="Height (cm)" value={appearance.height_cm} onChange={(v) => setAppearance((a) => ({ ...a, height_cm: v }))} type="number" />
            <Field label="Shoe size" value={appearance.shoe_size} onChange={(v) => setAppearance((a) => ({ ...a, shoe_size: v }))} />
            <Field label="Kids' clothing size" value={appearance.kids_clothing_size} onChange={(v) => setAppearance((a) => ({ ...a, kids_clothing_size: v }))} />
            <Field label="Hair colour" value={appearance.hair_color} onChange={(v) => setAppearance((a) => ({ ...a, hair_color: v }))} />
            <Field label="Hair length" value={appearance.hair_length} onChange={(v) => setAppearance((a) => ({ ...a, hair_length: v }))} />
            <Field label="Hair type" value={appearance.hair_type} onChange={(v) => setAppearance((a) => ({ ...a, hair_type: v }))} />
            <Field label="Eye colour" value={appearance.eye_color} onChange={(v) => setAppearance((a) => ({ ...a, eye_color: v }))} />
            <Field label="Complexion" value={appearance.complexion} onChange={(v) => setAppearance((a) => ({ ...a, complexion: v }))} />
            <button
              onClick={saveAppearance}
              disabled={saving}
              style={{ height: 44, padding: '0 26px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              {saving ? 'Opslaan...' : 'Save changes'}
            </button>
          </div>
        )}

        {tab === 'Skills' && (
          <div>
            <div style={sectionTitle}>Skills</div>
            {skills.length === 0 && <div style={{ color: '#aaa', fontSize: 13, marginBottom: 24 }}>Nog geen vaardigheden vastgelegd.</div>}
            <div style={{ marginBottom: 32 }}>
              {skills.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #ececec' }}>
                  <div>
                    <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a4a4a4', marginRight: 12 }}>{s.category || '—'}</span>
                    <span style={{ fontSize: 14 }}>{s.label}</span>
                  </div>
                  <button onClick={() => removeSkill(s.id)} style={{ border: 'none', background: 'none', color: '#999', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                </div>
              ))}
            </div>

            <div style={labelStyle}>Add a skill</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <select value={newSkillCategory} onChange={(e) => setNewSkillCategory(e.target.value)} style={{ ...inputStyle, width: 180 }}>
                {Object.keys(SKILL_SUGGESTIONS).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                list="skill-suggestions"
                value={newSkillLabel}
                onChange={(e) => setNewSkillLabel(e.target.value)}
                placeholder="Type of choose a suggestion"
                style={inputStyle}
              />
              <datalist id="skill-suggestions">
                {(SKILL_SUGGESTIONS[newSkillCategory] || []).map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <button
              onClick={addSkill}
              style={{ height: 40, padding: '0 22px', border: `1px solid ${INK}`, background: '#fff', color: INK, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              Add skill
            </button>
          </div>
        )}

        {tab === 'Guardian & Payout' && (
          <div>
            <div style={sectionTitle}>Guardian & payout — bewerkbaar</div>
            {!guardian ? (
              <div style={{ color: '#aaa', fontSize: 13 }}>Geen voogd-account gekoppeld aan dit talent.</div>
            ) : (
              <>
                <Field label="Name" value={guardian.name} onChange={(v) => setGuardian((g) => ({ ...g, name: v }))} />
                <Field label="Email" value={guardian.email} onChange={(v) => setGuardian((g) => ({ ...g, email: v }))} />
                <Field label="Phone" value={guardian.phone} onChange={(v) => setGuardian((g) => ({ ...g, phone: v }))} />
                <Field label="Street" value={guardian.address_street} onChange={(v) => setGuardian((g) => ({ ...g, address_street: v }))} />
                <Field label="Postal code" value={guardian.address_postal_code} onChange={(v) => setGuardian((g) => ({ ...g, address_postal_code: v }))} />
                <Field label="City" value={guardian.address_city} onChange={(v) => setGuardian((g) => ({ ...g, address_city: v }))} />
                <Field label="Country" value={guardian.address_country} onChange={(v) => setGuardian((g) => ({ ...g, address_country: v }))} />
                <Field label="IBAN" value={guardian.iban} onChange={(v) => setGuardian((g) => ({ ...g, iban: v }))} />
                <Field label="Account holder name" value={guardian.iban_account_holder} onChange={(v) => setGuardian((g) => ({ ...g, iban_account_holder: v }))} />
                <button
                  onClick={saveGuardian}
                  disabled={saving}
                  style={{ height: 44, padding: '0 26px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  {saving ? 'Opslaan...' : 'Save changes'}
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'Bookings' && (
          <div>
            <div style={sectionTitle}>Recent bookings</div>
            {bookings.length === 0 && <div style={{ color: '#aaa', fontSize: 13 }}>Geen bookings gevonden.</div>}
            {bookings.map((b, i) => (
              <div key={i} style={{ padding: '16px 0', borderBottom: '1px solid #ececec' }}>
                <div style={{ fontSize: 15 }}>{b.bookings?.description || '—'}</div>
                <div style={{ fontSize: 12.5, color: '#8e8e8e', marginTop: 5 }}>
                  {b.bookings?.shoot_date || '—'} · {b.bookings?.status} · beschikbaarheid: {b.availability_status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
