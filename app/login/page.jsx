'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { performDemoLogin } from './actions';

export default function Login() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLogin = () => {
    startTransition(async () => {
      setErrorMsg(null);
      const res = await performDemoLogin();
      if (res.success) {
        router.push('/dashboard');
      } else {
        setErrorMsg('Login failed: ' + res.error);
      }
    });
  };
  return (
    <main style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--bg-light)' }}>
      {/* Left side: branding/aesthetic */}
      <div style={{ flex: 1, backgroundColor: 'var(--brand-secondary)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '16px' }}>Pandoo LMS Workspace</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '400px' }}>
          Enter the full learning platform. Videos, AI tutoring, and progress tracking all in one beautifully designed place.
        </p>
      </div>

      {/* Right side: login card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '8px' }}>Sign in</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Welcome back! Please enter your details.</p>
          
          {errorMsg && (
            <div style={{ padding: '12px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px', marginBottom: '16px', fontSize: '0.9rem' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button onClick={handleLogin} disabled={isPending} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem', opacity: isPending ? 0.7 : 1 }}>
               {isPending ? 'Authenticating...' : 'Continue with Google (Demo Auto-Login)'}
            </button>
          </div>
          
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
            After sign-in, you will be redirected to your dashboard.
          </div>
        </div>
      </div>
    </main>
  );
}
