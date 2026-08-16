import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';

const INK = '#22252b';
const RED = '#d0021b';
const inputStyle = { width: '100%', height: 38, padding: '0 10px', border: '1px solid #e2e2e2', background: '#fff', fontSize: 14, color: INK, outline: 'none', boxSizing: 'border-box' };
const sectionTitle = { fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', padding: '0 0 14px', borderBottom: `1px solid ${INK}`, marginBottom: 20 };

export default function PackageProfile({ packageId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pkg, setPkg] = useState(null);
  const [members, setMembers] = useState([]);
  const [checked, setChecked] = useState(new Set());

  const [talentQuery, setTalentQuery] = useState('');
  const [talentResults, setTalentResults] = useState([]);

  const [mailOpen, setMailOpen] = useState(false);
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [mailSending, setMailSending] = useState(false);
  const [mailResult, setMailResult] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: p, error: pErr } = await supabase.from('packages').select('*, contacts(name)').eq('id', packageId).single();
      if (pErr) throw pErr;
      setPkg(p);

      const { data: m } = await supabase
        .from('package_items')
        .select('id, client_selected, client_comment, talent(id, name)')
        .eq('package_id', packageId);
      setMembers(m || []);
      setChecked(new Set());
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId]);

  const toggleCheck = (talentId) => {
    setChecked((c) => {
      const next = new Set(c);
      if (next.has(talentId)) next.delete(talentId);
      else next.add(talentId);
      return next;
    });
  };

  const selectAll = () => setChecked(new Set(members.map((m) => m.talent?.id).filter(Boolean)));
  const selectNone = () => setChecked(new Set());

  const searchTalent = async (q) => {
    setTalentQuery(q);
    if (!q.trim()) {
      setTalentResults([]);
      return;
    }
    const existingIds = members.map((m) => m.talent?.id);
    const { data } = await supabase.from('talent').select('id, name').ilike('name', `%${q}%`).eq('status', 'published').limit(15);
    setTalentResults((data || []).filter((t) => !existingIds.includes(t.id)));
  };

  const addTalent = async (t) => {
    const { error: iErr } = await supabase.from('package_items').insert({ package_id: packageId, talent_id: t.id });
    if (iErr) {
      setError(iErr.message);
      return;
    }
    setTalentQuery('');
    setTalentResults([]);
    load();
  };

  const removeTalent = async (memberId) => {
    await supabase.from('package_items').delete().eq('id', memberId);
    load();
  };

  const convertToBooking = async (onlySelected) => {
    const { data: bookingId, error: cErr } = await supabase.rpc('convert_package_to_booking', {
      p_package_id: packageId,
      p_only_selected: onlySelected,
    });
    if (cErr) {
      setError(cErr.message);
      return;
    }
    alert(`Booking aangemaakt (id: ${bookingId}). Ga naar Bookings om 'm verder af te maken.`);
  };

  const sendMailToGuardians = async () => {
    if (checked.size === 0) return;
    setMailSending(true);
    setMailResult('');
    try {
      let sent = 0;
      let noGuardian = 0;
      for (const talentId of checked) {
        const { data: links } = await supabase
          .from('guardian_talent_links')
          .select('guardian_account_id')
          .eq('talent_id', talentId);
        if (!links || links.length === 0) {
          noGuardian += 1;
          continue;
        }
        for (const link of links) {
          await supabase.from('communications').insert({
            package_id: packageId,
            talent_id: talentId,
            guardian_account_id: link.guardian_account_id,
            channel: 'email',
            direction: 'outbound',
            sent_by: 'human',
            subject: mailSubject,
            body: mailBody,
          });
          sent += 1;
        }
      }
      setMailResult(
        `${sent} bericht(en) vastgelegd${noGuardian > 0 ? `, ${noGuardian} model(len) had(den) geen gekoppelde voogd` : ''}. Let op: dit is nog niet daadwerkelijk verstuurd — er is nog geen e-mail-verzendservice gekoppeld, dit is de vastgelegde basis.`
      );
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setMailSending(false);
    }
  };

  if (loading) return <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: '#999' }}>Laden...</div>;
  if (error) return <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: RED }}>Fout: {error}</div>;
  if (!pkg) return null;

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: INK }}>
      <div style={{ padding: '40px 40px 0' }}>
        <button
          onClick={onBack}
          style={{ height: 34, padding: '0 16px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 28 }}
        >
          ← Back to Packages
        </button>

        <h1 style={{ margin: '0 0 8px', fontSize: 36, fontWeight: 300, letterSpacing: '-0.02em' }}>{pkg.title}</h1>
        <div style={{ fontSize: 13.5, color: '#777', marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #ececec' }}>
          {pkg.contacts?.name || 'Geen klant gekoppeld'}
        </div>
      </div>

      <div style={{ padding: '0 40px 140px', maxWidth: 760 }}>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 32, padding: 14, border: '1px solid #ececec', wordBreak: 'break-all' }}>
          Deelbare link: {window.location.origin}/package/{pkg.view_token}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={sectionTitle}>Talent ({members.length})</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <button onClick={selectAll} style={{ border: 'none', background: 'none', color: '#666', cursor: 'pointer', fontSize: 11.5, textDecoration: 'underline' }}>Select all</button>
            <button onClick={selectNone} style={{ border: 'none', background: 'none', color: '#666', cursor: 'pointer', fontSize: 11.5, textDecoration: 'underline' }}>Select none</button>
          </div>
        </div>

        {members.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid #ececec', fontSize: 13.5 }}>
            <input
              type="checkbox"
              checked={m.talent?.id ? checked.has(m.talent.id) : false}
              onChange={() => m.talent?.id && toggleCheck(m.talent.id)}
            />
            <span style={{ flex: 1 }}>{m.talent?.name || 'Onbekend'}</span>
            <span style={{ fontSize: 11, color: m.client_selected ? '#1f9d55' : '#bbb' }}>
              {m.client_selected ? '✓ Geselecteerd door klant' : 'Nog niet geselecteerd'}
            </span>
            <button onClick={() => removeTalent(m.id)} style={{ border: 'none', background: 'none', color: '#bbb', cursor: 'pointer', fontSize: 12 }}>Remove</button>
          </div>
        ))}
        {members.length === 0 && <div style={{ color: '#aaa', fontSize: 13, marginBottom: 20 }}>Nog geen talent toegevoegd.</div>}

        <div style={{ marginTop: 20, marginBottom: 40 }}>
          <input value={talentQuery} onChange={(e) => searchTalent(e.target.value)} placeholder="Talent toevoegen — zoek op naam" style={inputStyle} />
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

        <div style={{ display: 'flex', gap: 12, marginBottom: 44, flexWrap: 'wrap' }}>
          <button
            onClick={() => convertToBooking(true)}
            style={{ height: 46, padding: '0 22px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Convert selected → booking
          </button>
          <button
            onClick={() => convertToBooking(false)}
            style={{ height: 46, padding: '0 18px', border: '1px solid #e2e2e2', background: '#fff', color: '#666', fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Convert all
          </button>
          <button
            onClick={() => setMailOpen(true)}
            disabled={checked.size === 0}
            style={{
              height: 46, padding: '0 22px', border: '1px solid #e2e2e2', background: '#fff',
              color: checked.size === 0 ? '#ccc' : '#666', fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase',
              cursor: checked.size === 0 ? 'default' : 'pointer',
            }}
          >
            Mail geselecteerde ouders ({checked.size})
          </button>
        </div>

        {mailOpen && (
          <div style={{ border: '1px solid #ececec', padding: 24, marginBottom: 40 }}>
            <div style={sectionTitle}>Mail naar ouders — basis, nog niet live verstuurd</div>
            <div style={{ fontSize: 12.5, color: '#999', marginBottom: 20 }}>
              Dit legt het bericht vast voor {checked.size} geselecteerde model(len) en hun gekoppelde voogd(en) in communications.
              Er is nog geen e-mail-verzendservice gekoppeld — dat is een vervolgstap.
            </div>
            <input value={mailSubject} onChange={(e) => setMailSubject(e.target.value)} placeholder="Onderwerp" style={{ ...inputStyle, marginBottom: 12 }} />
            <textarea
              value={mailBody}
              onChange={(e) => setMailBody(e.target.value)}
              placeholder="Bericht..."
              rows={6}
              style={{ ...inputStyle, height: 'auto', padding: 10, marginBottom: 16, fontFamily: 'inherit' }}
            />
            {mailResult && <div style={{ fontSize: 12.5, color: '#1f9d55', marginBottom: 16 }}>{mailResult}</div>}
            <button
              onClick={sendMailToGuardians}
              disabled={mailSending}
              style={{ height: 42, padding: '0 22px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              {mailSending ? 'Bezig...' : 'Vastleggen'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
