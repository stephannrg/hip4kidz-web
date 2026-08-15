import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';

const INK = '#22252b';
const RED = '#d0021b';
const AMBER = '#e08700';

const sectionTitle = { fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', padding: '0 0 14px', borderBottom: `1px solid ${INK}`, marginBottom: 4 };

const daysUntilBirthday = (dob) => {
  const birth = new Date(dob);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate());
  const days = Math.round((next - today) / 86400000);
  const turningAge = next.getFullYear() - birth.getFullYear();
  return { days, turningAge, date: next };
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [birthdays, setBirthdays] = useState([]);
  const [szwBlocked, setSzwBlocked] = useState([]);
  const [invoiceOverdue, setInvoiceOverdue] = useState([]);
  const [queueItems, setQueueItems] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: talentRows, error: tErr } = await supabase
          .from('talent')
          .select('id, name, date_of_birth')
          .eq('status', 'published')
          .not('date_of_birth', 'is', null);
        if (tErr) throw tErr;

        const upcoming = (talentRows || [])
          .map((t) => ({ ...t, ...daysUntilBirthday(t.date_of_birth) }))
          .filter((t) => t.days <= 14)
          .sort((a, b) => a.days - b.days);
        setBirthdays(upcoming);

        const { data: szwRows } = await supabase
          .from('booking_timeline')
          .select('booking_id, description, szw_due_date, timeline_summary')
          .eq('szw_deadline_missed', true);
        setSzwBlocked(szwRows || []);

        const { data: invRows } = await supabase
          .from('booking_timeline')
          .select('booking_id, description, invoice_number, invoice_due_date, timeline_summary')
          .eq('invoice_overdue', true);
        setInvoiceOverdue(invRows || []);

        const { data: qRows } = await supabase
          .from('priority_queue')
          .select('*')
          .eq('status', 'open')
          .order('urgency', { ascending: false })
          .order('created_at');
        setQueueItems(qRows || []);
      } catch (err) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: '#999' }}>Laden...</div>;
  if (error) return <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: RED }}>Fout: {error}</div>;

  const totalUrgent = szwBlocked.length + invoiceOverdue.length + queueItems.length;

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: INK }}>
      <main style={{ padding: '0 40px 140px', maxWidth: 1100 }}>
        <div style={{ padding: '56px 0 36px' }}>
          <h1 style={{ margin: 0, fontSize: 44, fontWeight: 300, letterSpacing: '-0.03em' }}>Priority queue</h1>
          <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginTop: 10 }}>
            {totalUrgent} item{totalUrgent !== 1 ? 's' : ''} needing attention
          </div>
        </div>

        {szwBlocked.length > 0 && (
          <section style={{ marginBottom: 44 }}>
            <div style={sectionTitle}>SZW-ontheffing ontbreekt — booking geblokkeerd</div>
            {szwBlocked.map((b) => (
              <div key={b.booking_id} style={{ padding: '14px 0', borderBottom: '1px solid #ececec', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14 }}>{b.description}</div>
                  <div style={{ fontSize: 12, color: RED, marginTop: 4 }}>{b.timeline_summary}</div>
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>{b.szw_due_date}</div>
              </div>
            ))}
          </section>
        )}

        {invoiceOverdue.length > 0 && (
          <section style={{ marginBottom: 44 }}>
            <div style={sectionTitle}>Facturen te laat</div>
            {invoiceOverdue.map((b) => (
              <div key={b.booking_id} style={{ padding: '14px 0', borderBottom: '1px solid #ececec', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14 }}>{b.description}</div>
                  <div style={{ fontSize: 12, color: AMBER, marginTop: 4 }}>Factuur #{b.invoice_number || '—'}</div>
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>vervallen {b.invoice_due_date}</div>
              </div>
            ))}
          </section>
        )}

        {queueItems.length > 0 && (
          <section style={{ marginBottom: 44 }}>
            <div style={sectionTitle}>Overige aandachtspunten</div>
            {queueItems.map((q) => (
              <div key={q.id} style={{ padding: '14px 0', borderBottom: '1px solid #ececec' }}>
                <div style={{ fontSize: 14 }}>{q.title}</div>
                {q.description && <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{q.description}</div>}
              </div>
            ))}
          </section>
        )}

        <section style={{ marginBottom: 44 }}>
          <div style={sectionTitle}>Upcoming birthdays (14 dagen)</div>
          {birthdays.length === 0 && <div style={{ padding: '20px 0', color: '#aaa', fontSize: 13 }}>Geen verjaardagen in de komende 14 dagen.</div>}
          {birthdays.map((t) => (
            <div key={t.id} style={{ padding: '14px 0', borderBottom: '1px solid #ececec', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14 }}>{t.name}</div>
              <div style={{ fontSize: 12.5, color: '#777' }}>
                wordt {t.turningAge} — {t.days === 0 ? 'vandaag' : t.days === 1 ? 'morgen' : `over ${t.days} dagen`}
              </div>
            </div>
          ))}
        </section>

        {totalUrgent === 0 && birthdays.length === 0 && (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#aaa', fontSize: 14 }}>Niets dat aandacht nodig heeft.</div>
        )}
      </main>
    </div>
  );
}
