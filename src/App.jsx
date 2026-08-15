import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import Login from './Login.jsx';
import TalentPage from './TalentPage.jsx';
import PackagesPage from './PackagesPage.jsx';
import DashboardPage from './DashboardPage.jsx';

const INK = '#22252b';

export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('talent'); // 'dash' | 'talent' | 'bookings' — alleen 'talent' is nu gebouwd

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
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

  if (session === undefined) return null;
  if (!session) return <Login supabase={supabase} onLoggedIn={setSession} />;

  if (!profile) {
    return (
      <div style={{ padding: 56, fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif" }}>
        <div style={{ padding: 16, background: '#fff8e1', borderRadius: 0, fontSize: 14, color: '#7a5c00' }}>
          Geen rol gevonden in <code>user_profiles</code> voor {session.user.email}. Vraag een admin om deze
          gebruiker een rol toe te wijzen.
        </div>
      </div>
    );
  }

  const navBtn = (id, label) => {
    const on = tab === id;
    return (
      <button
        key={id}
        onClick={() => setTab(id)}
        style={{
          border: 'none', background: 'none', padding: 0, height: '100%',
          fontSize: 13.5, letterSpacing: '0.02em', cursor: 'pointer',
          color: on ? INK : '#8e8e8e', borderBottom: `1px solid ${on ? INK : 'transparent'}`, marginBottom: -1,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Helvetica Neue', Helvetica, -apple-system, Arial, sans-serif", color: INK, background: '#fff', WebkitFontSmoothing: 'antialiased' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #ececec' }}>
        <div style={{ maxWidth: 1640, margin: '0 auto', padding: '0 56px', height: 66, display: 'flex', alignItems: 'center', gap: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Hip4Kidz</span>
            <span style={{ fontSize: 11, letterSpacing: '0.16em', color: '#999', textTransform: 'uppercase', paddingLeft: 14, borderLeft: '1px solid #e2e2e2' }}>Agency</span>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 36, height: '100%' }}>
            {navBtn('dash', 'Priority queue')}
            {navBtn('talent', 'Talent')}
            {navBtn('packages', 'Packages')}
            {navBtn('bookings', 'Bookings')}
          </nav>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, letterSpacing: '0.01em' }}>{session.user.email}</span>
              <button
                onClick={handleLogout}
                style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </header>

      {tab === 'talent' && <TalentPage />}
      {tab === 'packages' && <PackagesPage />}
      {tab === 'dash' && <DashboardPage />}
      {tab === 'bookings' && (
        <div style={{ padding: 96, textAlign: 'center', color: '#aaa', fontSize: 14 }}>Bookings — volgt hierna.</div>
      )}
    </div>
  );
}
