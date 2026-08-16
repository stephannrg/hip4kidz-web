import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import BookingTalentDetail from './BookingTalentDetail.jsx';

const INK = '#22252b';
const RED = '#d0021b';
const inputStyle = { width: '100%', height: 38, padding: '0 10px', border: '1px solid #e2e2e2', background: '#fff', fontSize: 14, color: INK, outline: 'none', boxSizing: 'border-box' };
const sectionTitle = { fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', padding: '0 0 14px', borderBottom: `1px solid ${INK}`, marginBottom: 24 };

export default function BookingProfile({ bookingId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [linkedTalent, setLinkedTalent] = useState([]);
  const [expandedBookingTalent, setExpandedBookingTalent] = useState(null);

  const [invoice, setInvoice] = useState(null);
  const [invoiceLines, setInvoiceLines] = useState([]);
  const [deletedLineIds, setDeletedLineIds] = useState([]);
  const [defaultVat, setDefaultVat] = useState(null);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [invoiceSaveMsg, setInvoiceSaveMsg] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    setExpandedBookingTalent(null);
    try {
      const { data: b, error: bErr } = await supabase
        .from('bookings')
        .select('*, contacts(name, email, phone, type, country, vat_number)')
        .eq('id', bookingId)
        .single();
      if (bErr) throw bErr;
      setBooking(b);

      const { data: tl } = await supabase.from('booking_timeline').select('*').eq('booking_id', bookingId).maybeSingle();
      setTimeline(tl);

      const { data: lt } = await supabase
        .from('booking_talent')
        .select('id, talent_name_raw, availability_status, compliance_status, commission_percentage, talent(id, name)')
        .eq('booking_id', bookingId);
      setLinkedTalent(lt || []);

      const { data: inv } = await supabase
        .from('invoices')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setInvoice(inv || null);

      if (inv) {
        const { data: lines } = await supabase.from('invoice_line_items').select('*').eq('invoice_id', inv.id).order('sort_order');
        setInvoiceLines(lines || []);
      } else {
        setInvoiceLines([]);
      }

      if (b.contact_id) {
        const { data: vatSuggestion } = await supabase.rpc('default_vat_rate_for_contact', { p_contact_id: b.contact_id });
        if (vatSuggestion && vatSuggestion[0]) setDefaultVat(vatSuggestion[0]);
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const createInvoice = async () => {
    setInvoiceSaving(true);
    const { data: created, error: cErr } = await supabase
      .from('invoices')
      .insert({
        booking_id: bookingId,
        contact_id: booking.contact_id,
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
    setInvoice(created);
  };

  const addInvoiceLine = () => {
    setInvoiceLines((lines) => [
      ...lines,
      { id: `temp-${Date.now()}`, description: '', quantity: 1, unit_amount: 0, vat_rate: defaultVat?.rate ?? 21, vat_reason: defaultVat?.reason ?? null },
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
    if (!invoice) return;
    setInvoiceSaving(true);
    setInvoiceSaveMsg('');
    try {
      for (const id of deletedLineIds) {
        await supabase.from('invoice_line_items').delete().eq('id', id);
      }
      for (let i = 0; i < invoiceLines.length; i++) {
        const l = invoiceLines[i];
        const payload = {
          invoice_id: invoice.id,
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
      await supabase.from('invoices').update({ subtotal_amount: subtotal, vat_amount: vat, total_amount: total }).eq('id', invoice.id);

      setDeletedLineIds([]);
      setInvoiceSaveMsg('Factuur opgeslagen');
      setTimeout(() => setInvoiceSaveMsg(''), 2500);
      const { data: lines } = await supabase.from('invoice_line_items').select('*').eq('invoice_id', invoice.id).order('sort_order');
      setInvoiceLines(lines || []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setInvoiceSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: '#999' }}>Laden...</div>;
  if (error) return <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: RED }}>Fout: {error}</div>;
  if (!booking) return null;

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: INK }}>
      <div style={{ padding: '40px 40px 0' }}>
        <button
          onClick={onBack}
          style={{ height: 34, padding: '0 16px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 28 }}
        >
          ← Back
        </button>

        <h1 style={{ margin: '0 0 8px', fontSize: 36, fontWeight: 300, letterSpacing: '-0.02em' }}>{booking.description}</h1>
        <div style={{ fontSize: 13.5, color: '#777', marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #ececec' }}>
          {booking.contacts?.name || booking.client_name_raw || 'Onbekende klant'}
        </div>
      </div>

      <div style={{ padding: '0 40px 140px', maxWidth: 720 }}>
        <div style={sectionTitle}>Client</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#ececec', border: '1px solid #ececec', marginBottom: 36 }}>
          {[
            ['Name', booking.contacts?.name || booking.client_name_raw || 'Onbekend (niet gekoppeld)'],
            ['Type', booking.contacts?.type || '—'],
            ['Email', booking.contacts?.email || '—'],
            ['Phone', booking.contacts?.phone || '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: '#fff', padding: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#aaa', marginBottom: 7 }}>{k}</div>
              <div style={{ fontSize: 14 }}>{v}</div>
            </div>
          ))}
        </div>

        {timeline && (
          <div style={{ padding: 18, border: '1px solid #ececec', marginBottom: 36, background: timeline.szw_deadline_missed ? '#fdecea' : '#fafafa' }}>
            <div style={{ fontSize: 13, color: timeline.szw_deadline_missed ? RED : INK, fontWeight: timeline.szw_deadline_missed ? 600 : 400 }}>
              {timeline.timeline_summary}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#ececec', border: '1px solid #ececec', marginBottom: 36 }}>
          {[
            ['Status', booking.status],
            ['Shoot date', booking.shoot_date || '—'],
            ['Location', booking.location || '—'],
            ['Invoice', timeline?.invoice_number || '—'],
            ['Client paid', timeline?.client_paid ? 'Ja' : 'Nee'],
            ['Uitbetaald aan talent', timeline?.fully_paid_out ? 'Ja' : 'Nee'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: '#fff', padding: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#aaa', marginBottom: 7 }}>{k}</div>
              <div style={{ fontSize: 14 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={sectionTitle}>Invoice</div>
          {invoiceSaveMsg && <div style={{ fontSize: 11.5, color: '#1f9d55' }}>{invoiceSaveMsg}</div>}
        </div>

        {!invoice ? (
          <div style={{ marginBottom: 36 }}>
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
          <div style={{ marginBottom: 36 }}>
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
                <input value={l.description} onChange={(e) => updateInvoiceLine(l.id, 'description', e.target.value)} placeholder="Omschrijving" style={{ ...inputStyle, height: 34, fontSize: 12.5 }} />
                <input type="number" value={l.quantity} onChange={(e) => updateInvoiceLine(l.id, 'quantity', e.target.value)} style={{ ...inputStyle, height: 34, fontSize: 12.5, padding: '0 6px' }} />
                <input type="number" value={l.unit_amount} onChange={(e) => updateInvoiceLine(l.id, 'unit_amount', e.target.value)} placeholder="€" style={{ ...inputStyle, height: 34, fontSize: 12.5, padding: '0 6px' }} />
                <input type="number" value={l.vat_rate} onChange={(e) => updateInvoiceLine(l.id, 'vat_rate', e.target.value)} title="BTW %" style={{ ...inputStyle, height: 34, fontSize: 12.5, padding: '0 6px' }} />
                <button onClick={() => removeInvoiceLine(l.id)} style={{ border: 'none', background: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
              </div>
            ))}

            <button onClick={addInvoiceLine} style={{ height: 32, padding: '0 14px', border: '1px solid #e2e2e2', background: '#fff', color: '#666', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 18 }}>
              + Add line
            </button>

            {invoiceLines.length > 0 && (
              <div style={{ borderTop: '1px solid #ececec', paddingTop: 12, marginBottom: 18, fontSize: 13 }}>
                {(() => {
                  const t = invoiceTotals();
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999', marginBottom: 4 }}><span>Subtotal</span><span>€ {t.subtotal.toFixed(2)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999', marginBottom: 4 }}><span>VAT</span><span>€ {t.vat.toFixed(2)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Total</span><span>€ {t.total.toFixed(2)}</span></div>
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

        <div style={sectionTitle}>Talent op deze booking</div>
        {linkedTalent.map((lt) => (
          <div key={lt.id}>
            <div
              onClick={() => setExpandedBookingTalent((cur) => (cur === lt.id ? null : lt.id))}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: expandedBookingTalent === lt.id ? 'none' : '1px solid #ececec', fontSize: 13.5, cursor: 'pointer' }}
            >
              <span>{expandedBookingTalent === lt.id ? '▾ ' : '▸ '}{lt.talent?.name || lt.talent_name_raw || 'Onbekend'}</span>
              <span style={{ color: '#999' }}>{lt.availability_status}</span>
            </div>
            {expandedBookingTalent === lt.id && <BookingTalentDetail bookingTalentId={lt.id} />}
          </div>
        ))}
        {linkedTalent.length === 0 && <div style={{ color: '#aaa', fontSize: 13 }}>Geen talent gekoppeld.</div>}
      </div>
    </div>
  );
}
