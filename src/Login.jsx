import { useState } from 'react';

export default function Login({ supabase, onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'E-mailadres of wachtwoord onjuist.'
          : signInError.message
      );
      return;
    }

    onLoggedIn(data.session);
  };

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 360,
        margin: '96px auto',
        padding: '0 24px',
        color: '#1a1a2e',
      }}
    >
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Hip4Kidz Platform</h1>
      <p style={{ color: '#666', marginBottom: 32, fontSize: 14 }}>Log in om verder te gaan</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#444' }}>
            E-mailadres
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ccc',
              borderRadius: 6,
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#444' }}>
            Wachtwoord
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ccc',
              borderRadius: 6,
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <div style={{ color: '#c0392b', fontSize: 13, background: '#fdecea', padding: 10, borderRadius: 6 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 12px',
            background: loading ? '#94a3b8' : '#1a1a2e',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'default' : 'pointer',
            marginTop: 6,
          }}
        >
          {loading ? 'Bezig...' : 'Inloggen'}
        </button>
      </form>
    </div>
  );
}
