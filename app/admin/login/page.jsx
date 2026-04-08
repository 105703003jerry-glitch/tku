'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { performAdminLogin } from './actions';

export default function AdminLogin() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLogin = () => {
    startTransition(async () => {
      setErrorMsg(null);
      const res = await performAdminLogin();
      if (res.success) {
        router.push('/admin/users');
      } else {
        setErrorMsg('Admin Login failed: ' + res.error);
      }
    });
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#111827', color: 'white' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#1f2937', padding: '40px', borderRadius: '12px', border: '1px solid #374151' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', justifyContent: 'center' }}>
            <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--brand-primary)', borderRadius: '8px' }}></div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>Pandoo Operator</h1>
          </div>

          <p style={{ color: '#9ca3af', marginBottom: '32px', textAlign: 'center' }}>Restricted Access. Admins only.</p>
          
          {errorMsg && (
            <div style={{ padding: '12px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '4px', marginBottom: '16px', fontSize: '0.9rem' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button onClick={handleLogin} disabled={isPending} style={{ width: '100%', padding: '14px', fontSize: '1rem', backgroundColor: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: isPending ? 0.7 : 1, fontWeight: 600 }}>
               {isPending ? 'Authenticating...' : 'Secure Admin Login (Demo)'}
            </button>
          </div>
          
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.85rem', color: '#6b7280' }}>
            All operations are logged. Secure session generated.
          </div>
        </div>
      </div>
    </main>
  );
}
