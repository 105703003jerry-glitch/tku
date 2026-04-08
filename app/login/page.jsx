import Link from 'next/link';

export default async function Login({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const errorCode = resolvedSearchParams?.error;
  const errorMsg = errorCode === 'google_not_configured'
    ? 'Google sign-in is not configured yet.'
    : errorCode === 'google_cancelled'
      ? 'Google sign-in was cancelled.'
      : errorCode === 'google_state_invalid'
        ? 'Google sign-in state expired. Please try again.'
        : errorCode === 'google_failed'
          ? 'Google sign-in failed. Please try again.'
          : null;

  return (
    <main style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--bg-light)' }}>
      {/* Left side: branding/aesthetic */}
      <div style={{ flex: 1, backgroundColor: 'var(--brand-secondary)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '16px' }}>TKUCLCLAB Learning Portal</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '400px' }}>
          Enter the full TKUCLCLAB learning platform. Courses, video lessons, AI tutoring, and progress tracking all in one place.
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
            <Link href="/api/auth/google?action=start&next=/dashboard" className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem', textAlign: 'center', textDecoration: 'none' }}>
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
