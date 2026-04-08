import Link from 'next/link';
import Image from 'next/image';

export default function Login() {
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
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Link href="/dashboard" className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem', display: 'flex', justifyContent: 'center', gap: '8px' }}>
               Continue with Google
            </Link>
          </div>
          
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
            After sign-in, you will be redirected to your dashboard.
          </div>
        </div>
      </div>
    </main>
  );
}
