import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Login from './Login.jsx';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = nog aan het laden
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Huidige sessie ophalen bij het laden van de pagina
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // Luisteren naar login/logout, zodat de UI meteen meebeweegt
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    // Rol van de ingelogde gebruiker ophalen (voor later: role-based routing)
    supabase
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Nog aan het bepalen of er een sessie is — even niks tonen i.p.v. flikkeren
  if (session === undefined) {
    return null;
  }

  // Geen sessie: alleen het loginscherm, verder helemaal niks zichtbaar
  if (!session) {
    return <Login supabase={supabase} onLoggedIn={setSession} />;
  }

  // Wel ingelogd: hier komt straks het echte dashboard. Voor nu een
  // simpele bevestigingspagina als basis om op door te bouwen.
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '48px auto', padding: '0 24px', color: '#1a1a2e' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, margin: 0 }}>Hip4Kidz Platform</h1>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>
            Ingelogd als {session.user.email}
            {profile?.role ? ` — rol: ${profile.role}` : ''}
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 14px',
            background: 'transparent',
            border: '1px solid #ccc',
            borderRadius: 6,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Uitloggen
        </button>
      </div>

      {!profile && (
        <div style={{ padding: 16, background: '#fff8e1', borderRadius: 8, fontSize: 14, color: '#7a5c00' }}>
          Geen rol gevonden in <code>user_profiles</code> voor dit account. Vraag een admin om deze
          gebruiker een rol toe te wijzen voordat het dashboard verder gebouwd wordt.
        </div>
      )}

      {profile && (
        <div style={{ padding: 16, border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14 }}>
          Dashboard-inhoud komt hier — deze pagina bevestigt dat inloggen werkt en dat de rol
          ({profile.role}) correct wordt opgehaald.
        </div>
      )}
    </div>
  );
}
