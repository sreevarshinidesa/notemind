import { useState } from 'react';

function Auth({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const endpoint = isSignup ? '/auth/signup' : '/auth/login';

    fetch(`http://localhost:5000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 200 || status === 201) {
          onLogin(data.token);
        } else {
          setError(data.error || 'Something went wrong');
        }
      })
      .catch(() => setError('Could not connect to server'));
  };

  return (
    <div>
      <h2>{isSignup ? 'Sign Up' : 'Log In'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <br />
        <button type="submit">{isSignup ? 'Sign Up' : 'Log In'}</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={() => setIsSignup(!isSignup)}>
        {isSignup ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
      </button>
    </div>
  );
}

export default Auth;