import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import BookingProfile from './BookingProfile.jsx';

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

const TABS = ['Overview', 'Gallery', 'Appearance', 'Skills', 'Guardian & Payout', 'Bookings'];

export default function TalentProfile({ talentId, onBack }) {
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [talent, setTalent] = useState(null);
  const [core, setCore] = useState({});
  const [divisions, setDivisions] = useState([]);
  const [appearance, setAppearance] = useState({});
  const [guardian, setGuardian] = useState(null);
  const [skills, setSkills] = useState([]);
  const [newSkillCategory, setNewSkillCategory] = useState('Dance');
  const [newSkillLabel, setNewSkillLabel] = useState('');
  const [bookings, setBookings] = useState([]);
  const [viewingBookingId, setViewingBookingId] = useState(null);
  const [newGuardian, setNewGuardian] = useState({ name: '', email: '', phone: '', address_street: '', address_postal_code: '', address_city: '', address_country: 'Nederland', iban: '', iban_account_holder: '' });
  const [guardianSearch, setGuardianSearch] = useState('');
  const [guardianSearchResults, setGuardianSearchResults] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);

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
      setCore({
        name: t.name,
        date_of_birth: t.date_of_birth,
        division_id: t.division_id,
        status: t.status,
        location: t.location,
      });
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

      const { data: divs } = await supabase.from('divisions').select('id, name').order('name');
      setDivisions(divs || []);

      const { data: g, error: gErr } = await supabase
        .from('guardian_talent_links')
        .select('guardian_accounts(*)')
        .eq('talent_id', talentId)
        .limit(1)
        .maybeSingle();
      if (gErr) throw gErr;
      setGuardian(g?.guardian_accounts || null);

      const { data: s, error: sErr } = await supabase
        .from('talent_skills')
        .select('*')
        .eq('talent_id', talentId)
        .order('category')
        .order('label');
      if (sErr) throw sErr;
      setSkills(s || []);

      const { data: b, error: bErr } = await supabase
        .from('booking_talent')
        .select('availability_status, bookings(id, description, status, shoot_date, client_name_raw, contacts(name))')
        .eq('talent_id', talentId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (bErr) throw bErr;
      setBookings(b || []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPhotos([]);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talentId]);

  useEffect(() => {
    if (tab !== 'Gallery' || photos.length > 0 || !talentId) return;
    const loadPhotos = async () => {
      setPhotosLoading(true);
      try {
        const { data: rows, error: mErr } = await supabase
          .from('media_assets')
          .select('storage_path')
          .eq('talent_id', talentId)
          .order('created_at');
        if (mErr) throw mErr;

        const paths = (rows || []).map((r) => r.storage_path);
        if (paths.length > 0) {
          const { data: signedData, error: sErr } = await supabase.storage
            .from('talent-media')
            .createSignedUrls(paths, 3600);
          if (sErr) throw sErr;
          setPhotos((signedData || []).filter((s) => !s.error).map((s) => s.signedUrl));
        }
      } catch (err) {
        setError(err.message || String(err));
      } finally {
        setPhotosLoading(false);
      }
    };
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, talentId]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i + 1) % photos.length);
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, photos.length]);

  const flashSaved = () => {
    setSaveMsg('Opgeslagen');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const saveCore = async () => {
    setSaving(true);
    const { data: updated, error: uErr } = await supabase.from('talent').update(core).eq('id', talentId).select('*, divisions(name)').single();
    setSaving(false);
    if (uErr) {
      setError(uErr.message);
    } else {
      setTalent(updated);
      flashSaved();
    }
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

  const searchGuardians = async () => {
    if (!guardianSearch.trim()) {
      setGuardianSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from('guardian_accounts')
      .select('id, name, email')
      .ilike('email', `%${guardianSearch.trim()}%`)
      .limit(10);
    setGuardianSearchResults(data || []);
  };

  const linkExistingGuardian = async (guardianAccountId) => {
    setSaving(true);
    const { error: lErr } = await supabase
      .from('guardian_talent_links')
      .insert({ talent_id: talentId, guardian_account_id: guardianAccountId });
    setSaving(false);
    if (lErr) {
      setError(lErr.message);
      return;
    }
    await load();
    setGuardianSearch('');
    setGuardianSearchResults([]);
    flashSaved();
  };

  const createAndLinkGuardian = async () => {
    if (!newGuardian.name.trim()) {
      setError('Naam van de voogd is verplicht.');
      return;
    }
    setSaving(true);
    const { data: created, error: cErr } = await supabase
      .from('guardian_accounts')
      .insert(newGuardian)
      .select()
      .single();
    if (cErr) {
      setSaving(false);
      setError(cErr.message);
      return;
    }
    const { error: lErr } = await supabase
      .from('guardian_talent_links')
      .insert({ talent_id: talentId, guardian_account_id: created.id });
    setSaving(false);
    if (lErr) {
      setError(lErr.message);
      return;
    }
    setGuardian(created);
    flashSaved();
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

  if (viewingBookingId) {
    return <BookingProfile bookingId={viewingBookingId} onBack={() => setViewingBookingId(null)} />;
  }

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: INK }}>
      <div style={{ padding: '40px 40px 0' }}>
        <button
          onClick={onBack}
          style={{
            height: 34, padding: '0 16px', border: `1px solid ${INK}`, background: INK, color: '#fff',
            fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 28,
          }}
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

      <div style={{ padding: 40, maxWidth: tab === 'Gallery' ? 1040 : 640 }}>
        {tab === 'Gallery' && (
          <div style={{ maxWidth: 1000 }}>
            <div style={sectionTitle}>Gallery {photos.length > 0 && `— ${photos.length} photos`}</div>
            {photosLoading && <div style={{ color: '#aaa', fontSize: 13 }}>Laden...</div>}
            {!photosLoading && photos.length === 0 && <div style={{ color: '#aaa', fontSize: 13 }}>Geen foto's gevonden voor dit model.</div>}
            {!photosLoading && photos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
                {photos.map((url, i) => (
                  <div key={i} onClick={() => setLightboxIndex(i)} style={{ aspectRatio: '3/4', overflow: 'hidden', background: '#f0f0f0', cursor: 'pointer' }}>
                    <img src={url} alt={`${talent.name} ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'Overview' && (
          <div>
            <div style={sectionTitle}>Core details — bewerkbaar</div>
            <Field label="Name" value={core.name} onChange={(v) => setCore((c) => ({ ...c, name: v }))} />
            <Field label="Date of birth" value={core.date_of_birth} onChange={(v) => setCore((c) => ({ ...c, date_of_birth: v }))} type="date" />

            <div style={fieldWrap}>
              <div style={labelStyle}>Division</div>
              <select value={core.division_id || ''} onChange={(e) => setCore((c) => ({ ...c, division_id: e.target.value || null }))} style={inputStyle}>
                <option value="">—</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div style={fieldWrap}>
              <div style={labelStyle}>Status</div>
              <select value={core.status || ''} onChange={(e) => setCore((c) => ({ ...c, status: e.target.value }))} style={inputStyle}>
                <option value="published">Published</option>
                <option value="submission">Submission</option>
                <option value="in_town">In town</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            <Field label="Location" value={core.location} onChange={(v) => setCore((c) => ({ ...c, location: v }))} />

            <button
              onClick={saveCore}
              disabled={saving}
              style={{ height: 44, padding: '0 26px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              {saving ? 'Opslaan...' : 'Save changes'}
            </button>
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
              <div>
                <div style={{ ...labelStyle, marginBottom: 14 }}>Bestaande voogd koppelen (op e-mailadres)</div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <input
                    value={guardianSearch}
                    onChange={(e) => setGuardianSearch(e.target.value)}
                    placeholder="ouder@voorbeeld.nl"
                    style={inputStyle}
                  />
                  <button
                    onClick={searchGuardians}
                    style={{ height: 38, padding: '0 20px', border: `1px solid ${INK}`, background: '#fff', color: INK, fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Search
                  </button>
                </div>
                {guardianSearchResults.length > 0 && (
                  <div style={{ marginBottom: 32, border: '1px solid #ececec' }}>
                    {guardianSearchResults.map((g) => (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #ececec' }}>
                        <div>
                          <div style={{ fontSize: 14 }}>{g.name}</div>
                          <div style={{ fontSize: 12, color: '#8e8e8e' }}>{g.email}</div>
                        </div>
                        <button
                          onClick={() => linkExistingGuardian(g.id)}
                          style={{ border: 'none', background: 'none', color: INK, cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}
                        >
                          Link
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ ...labelStyle, marginBottom: 14, marginTop: 32 }}>Of een nieuwe voogd aanmaken</div>
                <Field label="Name" value={newGuardian.name} onChange={(v) => setNewGuardian((g) => ({ ...g, name: v }))} />
                <Field label="Email" value={newGuardian.email} onChange={(v) => setNewGuardian((g) => ({ ...g, email: v }))} />
                <Field label="Phone" value={newGuardian.phone} onChange={(v) => setNewGuardian((g) => ({ ...g, phone: v }))} />
                <Field label="Street" value={newGuardian.address_street} onChange={(v) => setNewGuardian((g) => ({ ...g, address_street: v }))} />
                <Field label="Postal code" value={newGuardian.address_postal_code} onChange={(v) => setNewGuardian((g) => ({ ...g, address_postal_code: v }))} />
                <Field label="City" value={newGuardian.address_city} onChange={(v) => setNewGuardian((g) => ({ ...g, address_city: v }))} />
                <Field label="Country" value={newGuardian.address_country} onChange={(v) => setNewGuardian((g) => ({ ...g, address_country: v }))} />
                <Field label="IBAN" value={newGuardian.iban} onChange={(v) => setNewGuardian((g) => ({ ...g, iban: v }))} />
                <Field label="Account holder name" value={newGuardian.iban_account_holder} onChange={(v) => setNewGuardian((g) => ({ ...g, iban_account_holder: v }))} />
                <button
                  onClick={createAndLinkGuardian}
                  disabled={saving}
                  style={{ height: 44, padding: '0 26px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  {saving ? 'Opslaan...' : 'Create & link guardian'}
                </button>
              </div>
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
            <div style={sectionTitle}>Bookings {bookings.length > 0 && `— ${bookings.length}`}</div>
            {bookings.length === 0 && <div style={{ color: '#aaa', fontSize: 13 }}>Geen bookings gevonden voor dit talent.</div>}
            {bookings.map((b, i) => (
              <div key={i} onClick={() => setViewingBookingId(b.bookings?.id)} style={{ padding: '16px 0', borderBottom: '1px solid #ececec', cursor: b.bookings?.id ? 'pointer' : 'default' }}>
                <div style={{ fontSize: 15 }}>{b.bookings?.description || '—'}</div>
                <div style={{ fontSize: 12.5, color: '#8e8e8e', marginTop: 5 }}>
                  {b.bookings?.contacts?.name || b.bookings?.client_name_raw || 'Onbekende klant'} · {b.bookings?.shoot_date || '—'} · {b.bookings?.status} · beschikbaarheid: {b.availability_status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <div
          onClick={() => setLightboxIndex(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            style={{
              position: 'absolute', top: 24, right: 24, width: 40, height: 40,
              border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff',
              fontSize: 18, cursor: 'pointer', lineHeight: 1,
            }}
          >
            ×
          </button>

          <div style={{ position: 'absolute', top: 26, left: 24, color: '#fff', fontSize: 12.5, letterSpacing: '0.08em' }}>
            {lightboxIndex + 1} / {photos.length}
          </div>

          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i - 1 + photos.length) % photos.length); }}
              style={{
                position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)',
                width: 48, height: 48, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent',
                color: '#fff', fontSize: 20, cursor: 'pointer',
              }}
            >
              ‹
            </button>
          )}

          <img
            src={photos[lightboxIndex]}
            alt={`${talent.name} ${lightboxIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '85vw', maxHeight: '85vh', objectFit: 'contain' }}
          />

          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i + 1) % photos.length); }}
              style={{
                position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)',
                width: 48, height: 48, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent',
                color: '#fff', fontSize: 20, cursor: 'pointer',
              }}
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}
