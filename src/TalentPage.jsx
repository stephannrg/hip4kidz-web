import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import TalentProfile from './TalentProfile.jsx';

// ============================================================
// Design tokens — 1:1 overgenomen uit de Claude Design handoff
// (H4K Admin.dc.html), niet opnieuw uitgevonden.
// ============================================================
const INK = '#22252b';
const RED = '#d0021b';
const AMBER = '#e08700';

const AGE_RANGES = {
  '0–4': [0, 4],
  '5–8': [5, 8],
  '9–12': [9, 12],
  '13–17': [13, 17],
};
const SHOE_RANGES = {
  '20–26': [20, 26],
  '27–32': [27, 32],
  '33–38': [33, 38],
  '39–44': [39, 44],
};

const calcAge = (dob) => {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
};

// Ons schema heeft geen los gender-veld (dat stond op een ander tabblad in
// Syngency dan waar we hebben gescraped) — als pragmatische eerste versie
// leiden we het af uit de divisienaam. Dit dekt de meeste modellen
// (Girls/Boys/Baby Girls/Baby Boys) maar niet divisies als Teens/Exclusive
// — die krijgen geen gender-waarde en vallen dus niet onder dit filter.
const deriveGender = (divisionName) => {
  if (!divisionName) return null;
  const n = divisionName.toLowerCase();
  if (n.includes('girl')) return 'Girl';
  if (n.includes('boy')) return 'Boy';
  return null;
};

const STATUS_LABELS = {
  published: 'Available',
  submission: 'Submission',
  in_town: 'In town',
  terminated: 'Terminated',
};

const statusColor = (status) => {
  if (status === 'published') return '#1f9d55';
  if (status === 'in_town') return AMBER;
  return '#999';
};

const chipStyle = (on) => ({
  height: 32,
  padding: '0 13px',
  border: `1px solid ${on ? INK : '#e2e2e2'}`,
  background: on ? INK : '#fff',
  color: on ? '#fff' : '#555',
  fontSize: 12,
  letterSpacing: '0.02em',
  cursor: 'pointer',
  transition: 'border-color .15s',
});

const tagStyle = (color) => ({
  display: 'inline-block',
  padding: '4px 9px',
  border: `1px solid ${color}`,
  color,
  fontSize: 10.5,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
});

// Supabase geeft standaard maximaal 1000 rijen per query terug (een
// PostgREST-instelling, geen keuze van ons) — bij >1000 modellen moet je
// dus pagineren om echt alles op te halen.
const fetchAllRows = async (queryBuilder) => {
  const pageSize = 1000;
  let from = 0;
  let all = [];
  while (true) {
    const { data, error } = await queryBuilder(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
};

const PLACEHOLDER_BG = 'repeating-linear-gradient(135deg,#f6f6f6 0 9px,#efefef 9px 18px)';

export default function TalentPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [talent, setTalent] = useState([]);

  const [q, setQ] = useState('');
  const [sel, setSel] = useState({}); // { facetKey: [waarden] }
  const [more, setMore] = useState(false);
  const [view, setView] = useState('grid');
  const [profileId, setProfileId] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const talentRows = await fetchAllRows((from, to) =>
          supabase
            .from('talent')
            .select(
              'id, name, date_of_birth, status, shoe_size, kids_clothing_size, hair_color, hair_length, hair_type, eye_color, divisions(name)'
            )
            .eq('status', 'published')
            .order('name')
            .range(from, to)
        );

        const photoRows = await fetchAllRows((from, to) =>
          supabase.from('talent_primary_photo').select('talent_id, storage_path').range(from, to)
        );
        const photoByTalent = new Map(photoRows.map((p) => [p.talent_id, p.storage_path]));

        // Ondertekende (tijdelijke) URL's ophalen — nodig omdat de bucket
        // bewust prive is (geen publiek raadbare kinderfoto's). Supabase
        // staat max. 1000 paden per aanroep toe, dus in batches opdelen.
        const paths = photoRows.map((p) => p.storage_path);
        const signedUrlByPath = new Map();
        const BATCH_SIZE = 1000;
        for (let i = 0; i < paths.length; i += BATCH_SIZE) {
          const batch = paths.slice(i, i + BATCH_SIZE);
          if (batch.length === 0) continue;
          const { data: signedData, error: signError } = await supabase.storage
            .from('talent-media')
            .createSignedUrls(batch, 3600); // 1 uur geldig
          if (signError) throw signError;
          (signedData || []).forEach((s) => signedUrlByPath.set(s.path, s.signedUrl));
        }

        const enriched = talentRows.map((t) => {
          const storagePath = photoByTalent.get(t.id);
          const photoUrl = storagePath ? signedUrlByPath.get(storagePath) : null;
          return {
            ...t,
            age: calcAge(t.date_of_birth),
            division: t.divisions?.name || null,
            gender: deriveGender(t.divisions?.name),
            hairType: [t.hair_length, t.hair_type].filter(Boolean).join(', ') || null,
            photoUrl: photoUrl || null,
          };
        });

        setTalent(enriched);
      } catch (err) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Dynamisch de daadwerkelijk voorkomende waarden per facet ophalen i.p.v.
  // een vaste lijst hard te coderen — sluit aan op wat er echt in de data
  // staat (bv. Syngency's eigen kledingmaat-schaal), en onderhoudt zichzelf
  // als er nieuwe waarden bijkomen.
  const facetOptions = useMemo(() => {
    const distinct = (fn) =>
      Array.from(new Set(talent.map(fn).filter(Boolean))).sort();
    return {
      size: distinct((t) => t.kids_clothing_size),
      division: distinct((t) => t.division),
      gender: distinct((t) => t.gender),
      hair: distinct((t) => t.hair_color),
      eyes: distinct((t) => t.eye_color),
      htype: distinct((t) => t.hairType),
    };
  }, [talent]);

  const toggle = (key, val) => {
    setSel((s) => {
      const cur = s[key] || [];
      const next = cur.includes(val) ? cur.filter((v) => v !== val) : cur.concat([val]);
      return { ...s, [key]: next };
    });
  };

  const matches = (t) => {
    const query = q.trim().toLowerCase();
    if (query && !t.name.toLowerCase().includes(query)) return false;

    const inRange = (arr, val, ranges) =>
      !arr?.length || arr.some((label) => {
        const r = ranges[label];
        return val != null && val >= r[0] && val <= r[1];
      });
    if (!inRange(sel.age, t.age, AGE_RANGES)) return false;
    if (!inRange(sel.shoe, t.shoe_size ? parseFloat(t.shoe_size) : null, SHOE_RANGES)) return false;

    const has = (key, val) => !(sel[key] || []).length || (sel[key] || []).includes(val);
    if (!has('size', t.kids_clothing_size)) return false;
    if (!has('division', t.division)) return false;
    if (!has('gender', t.gender)) return false;
    if (!has('status', STATUS_LABELS[t.status])) return false;
    if (!has('hair', t.hair_color)) return false;
    if (!has('eyes', t.eye_color)) return false;
    if (!has('htype', t.hairType)) return false;
    return true;
  };

  const results = useMemo(() => talent.filter(matches), [talent, q, sel]);

  const chips = [];
  Object.entries(sel).forEach(([key, vals]) => (vals || []).forEach((v) => chips.push({ key, val: v })));

  const facets = [
    { key: 'age', label: 'Age', options: Object.keys(AGE_RANGES) },
    { key: 'shoe', label: 'Shoe size', options: Object.keys(SHOE_RANGES) },
    { key: 'size', label: 'Clothing size', options: facetOptions.size },
    { key: 'division', label: 'Division', options: facetOptions.division },
    { key: 'gender', label: 'Gender', options: facetOptions.gender },
    { key: 'status', label: 'Status', options: Object.values(STATUS_LABELS) },
    { key: 'hair', label: 'Hair colour', options: facetOptions.hair },
    { key: 'eyes', label: 'Eye colour', options: facetOptions.eyes },
    { key: 'htype', label: 'Hair type / length', options: facetOptions.htype },
  ];

  if (loading) {
    return <div style={{ padding: 56, fontFamily: 'Helvetica Neue, Helvetica, -apple-system, Arial, sans-serif', color: '#999' }}>Laden...</div>;
  }
  if (error) {
    return <div style={{ padding: 56, fontFamily: 'Helvetica Neue, Helvetica, -apple-system, Arial, sans-serif', color: RED }}>Fout bij laden: {error}</div>;
  }

  if (profileId) {
    return <TalentProfile talentId={profileId} onBack={() => setProfileId(null)} />;
  }

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: INK, background: '#fff', WebkitFontSmoothing: 'antialiased' }}>
      <main style={{ padding: '0 40px 140px' }}>
        <div style={{ padding: '56px 0 36px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 64 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
            <h1 style={{ margin: 0, fontSize: 44, fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1 }}>Talent</h1>
            <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999' }}>
              {results.length} of {talent.length} talent
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div style={{ display: 'flex', border: '1px solid #e2e2e2' }}>
              {[['grid', 'Thumbs'], ['list', 'List']].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  style={{
                    height: 34, padding: '0 16px', border: 'none',
                    background: view === id ? INK : '#fff', color: view === id ? '#fff' : '#777',
                    fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setSel({}); setQ(''); }}
              style={{ border: 'none', background: 'none', padding: 0, fontSize: 12.5, color: '#999', cursor: 'pointer', letterSpacing: '0.02em' }}
            >
              Clear all
            </button>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${INK}`, borderBottom: '1px solid #ececec' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, padding: '16px 0' }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name"
              style={{ width: 280, height: 34, padding: '0 2px', border: 'none', borderBottom: '1px solid #e2e2e2', background: 'transparent', fontSize: 14, color: INK, outline: 'none' }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1, minWidth: 0 }}>
              {chips.map((c) => (
                <button
                  key={`${c.key}-${c.val}`}
                  onClick={() => toggle(c.key, c.val)}
                  style={{ height: 30, padding: '0 12px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 11.5, letterSpacing: '0.06em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  {c.val}<span style={{ opacity: 0.55, fontSize: 13, lineHeight: 1 }}>×</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setMore((m) => !m)}
              style={{
                height: 36, padding: '0 20px', border: `1px solid ${INK}`,
                background: more ? INK : '#fff', color: more ? '#fff' : INK,
                fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {more ? 'Close filters' : chips.length ? `Filters · ${chips.length}` : 'Filters'}
            </button>
          </div>

          {more && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '36px 40px', padding: '12px 0 40px', borderTop: '1px solid #ececec' }}>
              {facets.map((f) => (
                <div key={f.key}>
                  <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 14 }}>{f.label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {f.options.map((o) => (
                      <button key={o} onClick={() => toggle(f.key, o)} style={chipStyle((sel[f.key] || []).includes(o))}>
                        {o}
                      </button>
                    ))}
                    {f.options.length === 0 && <span style={{ fontSize: 12, color: '#ccc' }}>—</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <section style={{ paddingTop: 40 }}>
          {view === 'list' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '56px 1.6fr 96px 110px 130px 1fr 120px', gap: 22, paddingBottom: 14, borderBottom: `1px solid ${INK}`, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#aaa' }}>
                <div /><div>Name</div><div>Age</div><div>Shoe</div><div>Clothing</div><div>Hair / eyes</div><div style={{ textAlign: 'right' }}>Status</div>
              </div>
              {results.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setProfileId(t.id)}
                  style={{ display: 'grid', gridTemplateColumns: '56px 1.6fr 96px 110px 130px 1fr 120px', gap: 22, alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #ececec', cursor: 'pointer' }}
                >
                  <div style={{ width: 44, height: 56, background: t.photoUrl ? `#f0f0f0 url(${t.photoUrl}) center/cover` : PLACEHOLDER_BG }} />
                  <div>
                    <div style={{ fontSize: 12.5, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{t.name}</div>
                    <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a4a4a4', marginTop: 5 }}>{t.division || '—'}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#555' }}>{t.age ?? '—'}</div>
                  <div style={{ fontSize: 13 }}>{t.shoe_size || '—'}</div>
                  <div style={{ fontSize: 13 }}>{t.kids_clothing_size || '—'}</div>
                  <div style={{ fontSize: 13, color: '#555' }}>{[t.hair_color, t.eye_color].filter(Boolean).join(' · ') || '—'}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={tagStyle(statusColor(t.status))}>{STATUS_LABELS[t.status] || t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(178px, 1fr))', gap: '34px 22px' }}>
              {results.map((t) => (
                <div key={t.id} onClick={() => setProfileId(t.id)} style={{ cursor: 'pointer' }}>
                  <div style={{ position: 'relative', aspectRatio: '3/4', background: t.photoUrl ? '#f0f0f0' : PLACEHOLDER_BG, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: 12, overflow: 'hidden' }}>
                    {t.photoUrl ? (
                      <img src={t.photoUrl} alt={t.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    ) : (
                      <span style={{ fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a2a2a2' }}>portrait</span>
                    )}
                    <span style={{ position: 'relative', display: 'block', width: 7, height: 7, background: statusColor(t.status) }} />
                  </div>
                  <div style={{ paddingTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{t.name}</span>
                      <span style={{ fontSize: 12, color: '#999' }}>{t.age != null ? `${t.age} yrs` : '—'}</span>
                    </div>
                    <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a4a4a4', marginTop: 6 }}>{t.division || '—'}</div>
                    <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid #ececec', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: 11.5, color: '#8c8c8c', letterSpacing: '0.01em' }}>
                      <div>Shoe <span style={{ color: INK }}>{t.shoe_size || '—'}</span></div>
                      <div>Size <span style={{ color: INK }}>{t.kids_clothing_size || '—'}</span></div>
                      <div>Hair <span style={{ color: INK }}>{t.hair_color || '—'}</span></div>
                      <div>Eyes <span style={{ color: INK }}>{t.eye_color || '—'}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && (
            <div style={{ padding: '120px 0', textAlign: 'center', color: '#aaa', fontSize: 14 }}>No talent matches these filters.</div>
          )}
        </section>
      </main>
    </div>
  );
}
