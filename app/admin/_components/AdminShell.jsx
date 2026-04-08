import Link from 'next/link';
import { getAuthUser } from '@/app/lib/authSession';
import { redirect } from 'next/navigation';
import { performLogout } from '@/app/login/actions';

export default async function AdminShell({ children, activeMenu }) {
  const user = await getAuthUser();
  
  if (!user || user.role !== 'admin') {
    redirect('/admin/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Dark Sidebar */}
      <aside style={{ width: '260px', backgroundColor: '#111827', color: 'white', borderRight: '1px solid #1f2937', padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--brand-primary)' }}>TKUCLCLAB Operator</h2>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>System Control Panel</div>
        </div>
        
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Link href="/admin/users" style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: activeMenu === 'users' ? '#1f2937' : 'transparent', color: activeMenu === 'users' ? 'white' : '#9ca3af', fontWeight: activeMenu === 'users' ? 600 : 500, cursor: 'pointer', display: 'block', textDecoration: 'none' }}>
            User Management
          </Link>
          <Link href="/admin/courses" style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: activeMenu === 'courses' ? '#1f2937' : 'transparent', color: activeMenu === 'courses' ? 'white' : '#9ca3af', fontWeight: activeMenu === 'courses' ? 600 : 500, cursor: 'pointer', display: 'block', textDecoration: 'none' }}>
            Curriculum Configuration
          </Link>
          <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', color: '#9ca3af', fontWeight: 500, cursor: 'not-allowed' }}>
            Analytics & Logs
          </div>
        </nav>
        
        <div style={{ padding: '24px 0', borderTop: '1px solid #1f2937' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
              {user.nickname ? user.nickname[0] : 'S'}
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.nickname || user.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Administrator</div>
            </div>
          </div>
          <form action={performLogout}>
             <button type="submit" style={{ width: '100%', padding: '8px', backgroundColor: '#374151', border: '1px solid #4b5563', borderRadius: '4px', color: '#d1d5db', fontSize: '0.85rem', cursor: 'pointer' }}>
               Secure Sign Out
             </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
