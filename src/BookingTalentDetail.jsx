import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';

const INK = '#22252b';
const rowInput = {
  height: 32, padding: '0 8px', border: '1px solid #e2e2e2', background: '#fff',
  fontSize: 12.5, color: INK, outline: 'none', boxSizing: 'border-box',
};
const smallBtn = {
  height: 30, padding: '0 12px', border: '1px solid #e2e2e2', background: '#fff',
  color: '#666', fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
};
const sectionLabel = { fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#aaa', margin: '18px 0 8px' };

export default function BookingTalentDetail({ bookingTalentId }) {
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [schedule, setSchedule] = useState([]);

  const load = async () => {
    setLoading(true);
    const [f, e, p, s] = await Promise.all([
      supabase.from('booking_talent_fees').select('*').eq('booking_talent_id', bookingTalentId).order('created_at'),
      supabase.from('booking_talent_expenses').select('*').eq('booking_talent_id', bookingTalentId).order('created_at'),
      supabase.from('booking_talent_payments').select('*').eq('booking_talent_id', bookingTalentId).order('created_at'),
      supabase.from('booking_talent_schedule').select('*').eq('booking_talent_id', bookingTalentId).order('start_at'),
    ]);
    setFees(f.data || []);
    setExpenses(e.data || []);
    setPayments(p.data || []);
    setSchedule(s.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingTalentId]);

  const addFee = async () => {
    await supabase.from('booking_talent_fees').insert({ booking_talent_id: bookingTalentId, description: '', amount: 0 });
    load();
  };
  const updateFee = async (id, field, value) => {
    setFees((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    await supabase.from('booking_talent_fees').update({ [field]: value }).eq('id', id);
  };
  const removeFee = async (id) => {
    await supabase.from('booking_talent_fees').delete().eq('id', id);
    setFees((rows) => rows.filter((r) => r.id !== id));
  };

  const addExpense = async () => {
    await supabase.from('booking_talent_expenses').insert({ booking_talent_id: bookingTalentId, description: '', amount: 0, reimbursable: true });
    load();
  };
  const updateExpense = async (id, field, value) => {
    setExpenses((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    await supabase.from('booking_talent_expenses').update({ [field]: value }).eq('id', id);
  };
  const removeExpense = async (id) => {
    await supabase.from('booking_talent_expenses').delete().eq('id', id);
    setExpenses((rows) => rows.filter((r) => r.id !== id));
  };

  const addPayment = async () => {
    await supabase.from('booking_talent_payments').insert({ booking_talent_id: bookingTalentId, amount: 0 });
    load();
  };
  const updatePayment = async (id, field, value) => {
    setPayments((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    await supabase.from('booking_talent_payments').update({ [field]: value }).eq('id', id);
  };
  const removePayment = async (id) => {
    await supabase.from('booking_talent_payments').delete().eq('id', id);
    setPayments((rows) => rows.filter((r) => r.id !== id));
  };

  const addSchedule = async () => {
    await supabase.from('booking_talent_schedule').insert({ booking_talent_id: bookingTalentId, type: 'shoot', status: 'pending' });
    load();
  };
  const updateSchedule = async (id, field, value) => {
    setSchedule((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    await supabase.from('booking_talent_schedule').update({ [field]: value }).eq('id', id);
  };
  const removeSchedule = async (id) => {
    await supabase.from('booking_talent_schedule').delete().eq('id', id);
    setSchedule((rows) => rows.filter((r) => r.id !== id));
  };

  const sum = (rows) => rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  if (loading) return <div style={{ fontSize: 12, color: '#aaa', padding: '10px 0' }}>Laden...</div>;

  return (
    <div style={{ padding: '4px 0 16px', borderBottom: '1px solid #ececec' }}>
      <div style={sectionLabel}>Fees (totaal € {sum(fees).toFixed(2)})</div>
      {fees.map((f) => (
        <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 24px', gap: 6, marginBottom: 6 }}>
          <input style={rowInput} value={f.description} onChange={(e) => updateFee(f.id, 'description', e.target.value)} placeholder="Omschrijving" />
          <input style={rowInput} type="number" value={f.amount} onChange={(e) => updateFee(f.id, 'amount', e.target.value)} />
          <button onClick={() => removeFee(f.id)} style={{ border: 'none', background: 'none', color: '#bbb', cursor: 'pointer' }}>×</button>
        </div>
      ))}
      <button onClick={addFee} style={smallBtn}>+ Add fee</button>

      <div style={sectionLabel}>Expenses (totaal € {sum(expenses).toFixed(2)})</div>
      {expenses.map((ex) => (
        <div key={ex.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 24px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <input style={rowInput} value={ex.description} onChange={(e) => updateExpense(ex.id, 'description', e.target.value)} placeholder="Omschrijving" />
          <input style={rowInput} type="number" value={ex.amount} onChange={(e) => updateExpense(ex.id, 'amount', e.target.value)} />
          <label style={{ fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={ex.reimbursable} onChange={(e) => updateExpense(ex.id, 'reimbursable', e.target.checked)} />
            Reimburse
          </label>
          <button onClick={() => removeExpense(ex.id)} style={{ border: 'none', background: 'none', color: '#bbb', cursor: 'pointer' }}>×</button>
        </div>
      ))}
      <button onClick={addExpense} style={smallBtn}>+ Add expense</button>

      <div style={sectionLabel}>Payments (totaal € {sum(payments).toFixed(2)})</div>
      {payments.map((p) => (
        <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 90px 24px', gap: 6, marginBottom: 6 }}>
          <input style={rowInput} type="date" value={p.paid_at || ''} onChange={(e) => updatePayment(p.id, 'paid_at', e.target.value)} />
          <input style={rowInput} value={p.reference || ''} onChange={(e) => updatePayment(p.id, 'reference', e.target.value)} placeholder="Referentie" />
          <input style={rowInput} type="number" value={p.amount} onChange={(e) => updatePayment(p.id, 'amount', e.target.value)} />
          <button onClick={() => removePayment(p.id)} style={{ border: 'none', background: 'none', color: '#bbb', cursor: 'pointer' }}>×</button>
        </div>
      ))}
      <button onClick={addPayment} style={smallBtn}>+ Add payment</button>

      <div style={sectionLabel}>Schedule</div>
      {schedule.map((s) => (
        <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 100px 24px', gap: 6, marginBottom: 6 }}>
          <input style={rowInput} value={s.type || ''} onChange={(e) => updateSchedule(s.id, 'type', e.target.value)} placeholder="Type" />
          <input style={rowInput} value={s.location || ''} onChange={(e) => updateSchedule(s.id, 'location', e.target.value)} placeholder="Locatie" />
          <input style={rowInput} type="datetime-local" value={s.start_at ? s.start_at.slice(0, 16) : ''} onChange={(e) => updateSchedule(s.id, 'start_at', e.target.value)} />
          <select style={rowInput} value={s.status} onChange={(e) => updateSchedule(s.id, 'status', e.target.value)}>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="declined">Declined</option>
          </select>
          <button onClick={() => removeSchedule(s.id)} style={{ border: 'none', background: 'none', color: '#bbb', cursor: 'pointer' }}>×</button>
        </div>
      ))}
      <button onClick={addSchedule} style={smallBtn}>+ Add schedule</button>
    </div>
  );
}
