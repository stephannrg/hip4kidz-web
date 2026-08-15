import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function App() {
  const [checks, setChecks] = useState({
    envVars: 'pending',
    clientCreated: 'pending',
    authReachable: 'pending',
    rlsProtected: 'pending',
  });
  const [details, setDetails] = useState({});

  useEffect(() => {
    const run = async () => {
      // 1. Zijn de environment variables er?
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        setChecks((c) => ({ ...c, envVars: 'fail' }));
        setDetails((d) => ({
          ...d,
          envVars: 'VITE_SUPABASE_URL en/of VITE_SUPABASE_ANON_KEY ontbreken. Check je Netlify environment variables (of .env lokaal).',
        }));
        return;
      }
      setChecks((c) => ({ ...c, envVars: 'ok' }));

      // 2. Kan de Supabase-client aangemaakt worden?
      let supabase;
      try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        setChecks((c) => ({ ...c, clientCreated: 'ok' }));
      } catch (err) {
        setChecks((c) => ({ ...c, clientCreated: 'fail' }));
        setDetails((d) => ({ ...d, clientCreated: String(err.message || err) }));
        return;
      }

      // 3. Is Supabase Auth bereikbaar (bevestigt netwerk + juiste URL/key)?
      try {
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
        setChecks((c) => ({ ...c, authReachable: 'ok' }));
      } catch (err) {
        setChecks((c) => ({ ...c, authReachable: 'fail' }));
        setDetails((d) => ({ ...d, authReachable: String(err.message || err) }));
        return;
      }

      // 4. RLS-check: een NIET-ingelogde gebruiker zou GEEN rijen terug
      // moeten krijgen uit 'divisions' (policy vereist auth.uid() is not
      // null). Nul rijen hier is dus het GOEDE resultaat — het bewijst dat
      // de beveiliging werkt, niet dat er iets stuk is.
      try {
        const { data, error } = await supabase.from('divisions').select('id').limit(5);
        if (error) throw error;
        if (data.length === 0) {
          setChecks((c) => ({ ...c, rlsProtected: 'ok' }));
          setDetails((d) => ({
            ...d,
            rlsProtected: 'Anonieme aanvraag kreeg 0 rijen terug — RLS werkt zoals bedoeld.',
          }));
        } else {
          setChecks((c) => ({ ...c, rlsProtected: 'warn' }));
          setDetails((d) => ({
            ...d,
            rlsProtected: `Onverwacht: anonieme aanvraag kreeg ${data.length} rij(en) terug. Controleer de RLS-policy op 'divisions'.`,
          }));
        }
      } catch (err) {
        setChecks((c) => ({ ...c, rlsProtected: 'fail' }));
        setDetails((d) => ({ ...d, rlsProtected: String(err.message || err) }));
      }
    };

    run();
  }, []);

  const icon = (status) =>
    ({ pending: '⏳', ok: '✅', warn: '⚠️', fail: '❌' }[status] || '?');

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '48px auto', padding: '0 24px', color: '#1a1a2e' }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Hip4Kidz Platform</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Netlify ↔ Supabase verbindingstest</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <CheckRow label="Environment variables geladen" status={checks.envVars} detail={details.envVars} icon={icon} />
        <CheckRow label="Supabase-client aangemaakt" status={checks.clientCreated} detail={details.clientCreated} icon={icon} />
        <CheckRow label="Supabase Auth bereikbaar" status={checks.authReachable} detail={details.authReachable} icon={icon} />
        <CheckRow label="RLS-bescherming actief" status={checks.rlsProtected} detail={details.rlsProtected} icon={icon} />
      </div>

      <p style={{ marginTop: 32, fontSize: 13, color: '#999' }}>
        Deze pagina gebruikt alleen de publieke 'anon' key — geen gevoelige data zichtbaar of bereikbaar hiervandaan.
      </p>
    </div>
  );
}

function CheckRow({ label, status, detail, icon }) {
  return (
    <div style={{ padding: 16, border: '1px solid #e5e5e5', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}>
        <span>{icon(status)}</span>
        <span>{label}</span>
      </div>
      {detail && <div style={{ marginTop: 6, fontSize: 13, color: '#666', paddingLeft: 26 }}>{detail}</div>}
    </div>
  );
}
