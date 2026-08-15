import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import BookingTalentDetail from './BookingTalentDetail.jsx';

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
  const [bookingDetail, setBookingDetail] = useState(null);
  const [bookingDetailLoading, setBookingDetailLoading] = useState(false);
  const [invoiceLines, setInvoiceLines] = useState([]);
  const [deletedLineIds, setDeletedLineIds] = useState([]);
  const [defaultVat, setDefaultVat] = useState(null);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [invoiceSaveMsg, setInvoiceSaveMsg] = useState('');
  const [expandedBookingTalent, setExpandedBookingTalent] = useState(null);
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

  const openBookingDetail = async (bookingId) => {
    setBookingDetailLoading(true);
    setBookingDetail({}); // paneel meteen openen met laadstatus
    setInvoiceLines([]);
    setDeletedLineIds([]);
    setDefaultVat(null);
    setInvoiceSaveMsg('');
    setExpandedBookingTalent(null);
    try {
      const { data: b, error: bErr } = await supabase
        .from('bookings')
        .select('*, contacts(name, email, phone, type, country, vat_number)')
        .eq('id', bookingId)
        .single();
      if (bErr) throw bErr;

      const { data: tl } = await supabase
        .from('booking_timeline')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();

      const { data: linkedTalent } = await supabase
        .from('booking_talent')
        .select('id, talent_name_raw, availability_status, compliance_status, commission_percentage, talent(name)')
        .eq('booking_id', bookingId);

      // Bestaande factuur + regels ophalen (indien aanwezig)
      const { data: invoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (invoice) {
        const { data: lines } = await supabase
          .from('invoice_line_items')
          .select('*')
          .eq('invoice_id', invoice.id)
          .order('sort_order');
        setInvoiceLines(lines || []);
      }

      // Verstandige BTW-standaard voor deze klant (altijd overschrijfbaar)
      if (b.contact_id) {
        const { data: vatSuggestion } = await supabase.rpc('default_vat_rate_for_contact', {
          p_contact_id: b.contact_id,
        });
        if (vatSuggestion && vatSuggestion[0]) setDefaultVat(vatSuggestion[0]);
      }

      setBookingDetail({ booking: b, timeline: tl, linkedTalent: linkedTalent || [], invoice: invoice || null });
    } catch (err) {
      setBookingDetail({ error: err.message || String(err) });
    } finally {
      setBookingDetailLoading(false);
    }
  };

  const createInvoice = async () => {
    if (!bookingDetail.booking) return;
    setInvoiceSaving(true);
    const { data: created, error: cErr } = await supabase
      .from('invoices')
      .insert({
        booking_id: bookingDetail.booking.id,
        contact_id: bookingDetail.booking.contact_id,
        status: 'draft',
        currency: 'EUR',
        total_amount: 0,
        generated_by: 'manual',
        vat_rate: defaultVat?.rate ?? 21,
        vat_reason: defaultVat?.reason ?? null,
      })
      .select()
      .single();
    setInvoiceSaving(false);
    if (cErr) {
      setError(cErr.message);
      return;
    }
    setBookingDetail((d) => ({ ...d, invoice: created }));
  };

  const addInvoiceLine = () => {
    setInvoiceLines((lines) => [
      ...lines,
      {
        id: `temp-${Date.now()}`,
        description: '',
        quantity: 1,
        unit_amount: 0,
        vat_rate: defaultVat?.rate ?? 21,
        vat_reason: defaultVat?.reason ?? null,
      },
    ]);
  };

  const updateInvoiceLine = (id, field, value) => {
    setInvoiceLines((lines) => lines.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const removeInvoiceLine = (id) => {
    if (!String(id).startsWith('temp-')) setDeletedLineIds((d) => [...d, id]);
    setInvoiceLines((lines) => lines.filter((l) => l.id !== id));
  };

  const invoiceTotals = () => {
    let subtotal = 0;
    let vat = 0;
    invoiceLines.forEach((l) => {
      const lineTotal = (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_amount) || 0);
      subtotal += lineTotal;
      vat += lineTotal * ((parseFloat(l.vat_rate) || 0) / 100);
    });
    return { subtotal, vat, total: subtotal + vat };
  };

  const saveInvoiceLines = async () => {
    if (!bookingDetail.invoice) return;
    setInvoiceSaving(true);
    setInvoiceSaveMsg('');
    try {
      for (const id of deletedLineIds) {
        await supabase.from('invoice_line_items').delete().eq('id', id);
      }
      for (let i = 0; i < invoiceLines.length; i++) {
        const l = invoiceLines[i];
        const payload = {
          invoice_id: bookingDetail.invoice.id,
          description: l.description,
          quantity: l.quantity,
          unit_amount: l.unit_amount,
          vat_rate: l.vat_rate,
          vat_reason: l.vat_reason || null,
          sort_order: i,
        };
        if (String(l.id).startsWith('temp-')) {
          await supabase.from('invoice_line_items').insert(payload);
        } else {
          await supabase.from('invoice_line_items').update(payload).eq('id', l.id);
        }
      }

      const { subtotal, vat, total } = invoiceTotals();
      await supabase
        .from('invoices')
        .update({ subtotal_amount: subtotal, vat_amount: vat, total_amount: total })
        .eq('id', bookingDetail.invoice.id);

      setDeletedLineIds([]);
      setInvoiceSaveMsg('Factuur opgeslagen');
      setTimeout(() => setInvoiceSaveMsg(''), 2500);
      // Regels opnieuw ophalen zodat tijdelijke id's vervangen worden door echte
      const { data: lines } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', bookingDetail.invoice.id)
        .order('sort_order');
      setInvoiceLines(lines || []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setInvoiceSaving(false);
    }
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
              <div key={i} onClick={() => openBookingDetail(b.bookings?.id)} style={{ padding: '16px 0', borderBottom: '1px solid #ececec', cursor: b.bookings?.id ? 'pointer' : 'default' }}>
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

      {bookingDetail && (
        <>
          <div onClick={() => setBookingDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(3px)', zIndex: 50 }} />
          <aside style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 560, background: '#fff', zIndex: 51, borderLeft: '1px solid #e2e2e2', boxShadow: '-40px 0 80px rgba(0,0,0,0.06)', overflowY: 'auto', padding: 48 }}>
            <button onClick={() => setBookingDetail(null)} style={{ position: 'absolute', top: 40, right: 40, width: 34, height: 34, border: '1px solid #e2e2e2', background: '#fff', fontSize: 16, lineHeight: 1, color: '#666', cursor: 'pointer' }}>×</button>

            {bookingDetailLoading && <div style={{ color: '#aaa', fontSize: 13 }}>Laden...</div>}
            {bookingDetail.error && <div style={{ color: RED, fontSize: 13 }}>Fout: {bookingDetail.error}</div>}

            {bookingDetail.booking && (
              <>
                <div style={{ fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#aaa', marginBottom: 16 }}>Booking</div>
                <h2 style={{ margin: '0 40px 8px 0', fontSize: 26, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{bookingDetail.booking.description}</h2>
                <div style={{ fontSize: 13.5, color: '#777', marginBottom: 24 }}>
                  {bookingDetail.booking.contacts?.name || bookingDetail.booking.client_name_raw || 'Onbekende klant'}
                </div>

                <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 14 }}>Client</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#ececec', border: '1px solid #ececec', marginBottom: 32 }}>
                  {[
                    ['Name', bookingDetail.booking.contacts?.name || bookingDetail.booking.client_name_raw || 'Onbekend (niet gekoppeld)'],
                    ['Type', bookingDetail.booking.contacts?.type || '—'],
                    ['Email', bookingDetail.booking.contacts?.email || '—'],
                    ['Phone', bookingDetail.booking.contacts?.phone || '—'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: '#fff', padding: 16 }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#aaa', marginBottom: 7 }}>{k}</div>
                      <div style={{ fontSize: 14 }}>{v}</div>
                    </div>
                  ))}
                </div>

                {bookingDetail.timeline && (
                  <div style={{ padding: 18, border: '1px solid #ececec', marginBottom: 32, background: bookingDetail.timeline.szw_deadline_missed ? '#fdecea' : '#fafafa' }}>
                    <div style={{ fontSize: 13, color: bookingDetail.timeline.szw_deadline_missed ? RED : INK, fontWeight: bookingDetail.timeline.szw_deadline_missed ? 600 : 400 }}>
                      {bookingDetail.timeline.timeline_summary}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#ececec', border: '1px solid #ececec', marginBottom: 32 }}>
                  {[
                    ['Status', bookingDetail.booking.status],
                    ['Shoot date', bookingDetail.booking.shoot_date || '—'],
                    ['Location', bookingDetail.booking.location || '—'],
                    ['Invoice', bookingDetail.timeline?.invoice_number || '—'],
                    ['Client paid', bookingDetail.timeline?.client_paid ? 'Ja' : 'Nee'],
                    ['Uitbetaald aan talent', bookingDetail.timeline?.fully_paid_out ? 'Ja' : 'Nee'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: '#fff', padding: 16 }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#aaa', marginBottom: 7 }}>{k}</div>
                      <div style={{ fontSize: 14 }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>Invoice</div>
                  {invoiceSaveMsg && <div style={{ fontSize: 11.5, color: '#1f9d55' }}>{invoiceSaveMsg}</div>}
                </div>

                {!bookingDetail.invoice ? (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ fontSize: 13, color: '#999', marginBottom: 14 }}>Nog geen factuur voor deze booking.</div>
                    <button
                      onClick={createInvoice}
                      disabled={invoiceSaving}
                      style={{ height: 38, padding: '0 20px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
                    >
                      Create invoice
                    </button>
                  </div>
                ) : (
                  <div style={{ marginBottom: 32 }}>
                    {defaultVat && (
                      <div style={{ fontSize: 11.5, color: '#999', marginBottom: 14 }}>
                        Standaard BTW voor deze klant: {defaultVat.rate}%
                        {defaultVat.reason === 'reverse_charge_eu_b2b' && ' (verlegd — EU B2B)'}
                        {defaultVat.reason === 'export_non_eu' && ' (export, buiten EU)'}
                        {' '}— pas per regel aan waar nodig.
                      </div>
                    )}

                    {invoiceLines.map((l) => (
                      <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px 70px 24px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                        <input
                          value={l.description}
                          onChange={(e) => updateInvoiceLine(l.id, 'description', e.target.value)}
                          placeholder="Omschrijving"
                          style={{ ...inputStyle, height: 34, fontSize: 12.5 }}
                        />
                        <input
                          type="number"
                          value={l.quantity}
                          onChange={(e) => updateInvoiceLine(l.id, 'quantity', e.target.value)}
                          style={{ ...inputStyle, height: 34, fontSize: 12.5, padding: '0 6px' }}
                        />
                        <input
                          type="number"
                          value={l.unit_amount}
                          onChange={(e) => updateInvoiceLine(l.id, 'unit_amount', e.target.value)}
                          placeholder="€"
                          style={{ ...inputStyle, height: 34, fontSize: 12.5, padding: '0 6px' }}
                        />
                        <input
                          type="number"
                          value={l.vat_rate}
                          onChange={(e) => updateInvoiceLine(l.id, 'vat_rate', e.target.value)}
                          title="BTW %"
                          style={{ ...inputStyle, height: 34, fontSize: 12.5, padding: '0 6px' }}
                        />
                        <button onClick={() => removeInvoiceLine(l.id)} style={{ border: 'none', background: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
                      </div>
                    ))}

                    <button
                      onClick={addInvoiceLine}
                      style={{ height: 32, padding: '0 14px', border: '1px solid #e2e2e2', background: '#fff', color: '#666', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 18 }}
                    >
                      + Add line
                    </button>

                    {invoiceLines.length > 0 && (
                      <div style={{ borderTop: '1px solid #ececec', paddingTop: 12, marginBottom: 18, fontSize: 13 }}>
                        {(() => {
                          const t = invoiceTotals();
                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999', marginBottom: 4 }}>
                                <span>Subtotal</span><span>€ {t.subtotal.toFixed(2)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999', marginBottom: 4 }}>
                                <span>VAT</span><span>€ {t.vat.toFixed(2)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                <span>Total</span><span>€ {t.total.toFixed(2)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    <button
                      onClick={saveInvoiceLines}
                      disabled={invoiceSaving}
                      style={{ height: 40, padding: '0 22px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
                    >
                      {invoiceSaving ? 'Opslaan...' : 'Save invoice'}
                    </button>
                  </div>
                )}

                <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 14 }}>Talent op deze booking</div>
                {bookingDetail.linkedTalent.map((lt, i) => (
                  <div key={i}>
                    <div
                      onClick={() => setExpandedBookingTalent((cur) => (cur === lt.id ? null : lt.id))}
                      style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: expandedBookingTalent === lt.id ? 'none' : '1px solid #ececec', fontSize: 13.5, cursor: lt.id ? 'pointer' : 'default' }}
                    >
                      <span>{expandedBookingTalent === lt.id ? '▾ ' : '▸ '}{lt.talent?.name || lt.talent_name_raw || 'Onbekend'}</span>
                      <span style={{ color: '#999' }}>{lt.availability_status}</span>
                    </div>
                    {expandedBookingTalent === lt.id && lt.id && <BookingTalentDetail bookingTalentId={lt.id} />}
                  </div>
                ))}
              </>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
