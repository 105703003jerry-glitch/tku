import Link from 'next/link';

export default function Home() {
  return (
    <main className="layout-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 700, marginBottom: '20px', letterSpacing: '-0.02em' }}>
          Welcome to Pandoo LMS
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '40px' }}>
          Explore our premium AI courses. Experience a clean, beautiful learning environment tailored for your growth.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link href="/courses" className="btn-primary">
            Explore Courses
          </Link>
          <Link href="/login" className="btn-secondary">
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
