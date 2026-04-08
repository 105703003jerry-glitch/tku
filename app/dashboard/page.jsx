import Link from 'next/link';

export default function Dashboard() {
  const enrolledCourses = [
    { id: 'master-ai-101', title: 'Mastering AI 101', progress: 75, lastAccessed: '2 hours ago' },
    { id: 'gpt-advanced', title: 'Advanced Prompt Engineering', progress: 30, lastAccessed: 'Yesterday' }
  ];

  const recentChats = [
    { id: 1, title: 'Concept explanation: Neural Networks', time: 'Today, 10:00 AM' },
    { id: 2, title: 'Debugging my Python script', time: 'Yesterday' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9f9fb' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', backgroundColor: 'var(--bg-card)', borderRight: '1px solid var(--border-light)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Pandoo LMS</h2>
        </div>
        
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--brand-secondary)', color: 'var(--brand-primary)', fontWeight: 600, cursor: 'pointer' }}>
            Dashboard
          </div>
          <Link href="/courses" style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontWeight: 500, cursor: 'pointer', display: 'block', textDecoration: 'none' }}>
            Explore Courses
          </Link>
          <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontWeight: 500, cursor: 'pointer' }}>
            Certificates
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontWeight: 500, cursor: 'pointer' }}>
            Settings
          </div>
        </nav>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '24px', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundImage: 'url(/assets/user_avatar.png)', backgroundSize: 'cover' }}></div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Demo User</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Student</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Welcome back, Demo User</h1>
          <p style={{ color: 'var(--text-secondary)' }}>You are on a 3-day learning streak. Keep it up!</p>
        </header>

        <section style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>In Progress Courses</h2>
            <Link href="/courses" style={{ color: 'var(--brand-primary)', fontWeight: 500, fontSize: '0.9rem' }}>Browse more</Link>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {enrolledCourses.map(course => (
              <div key={course.id} className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', backgroundImage: 'url(/assets/course_thumb_ai.png)', backgroundSize: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px' }}>{course.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '16px' }}>Last accessed: {course.lastAccessed}</p>
                    
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                      <div style={{ width: `${course.progress}%`, height: '100%', backgroundColor: 'var(--brand-primary)', borderRadius: '3px' }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{course.progress}% Complete</span>
                      <Link href={`/learn/${course.id}`} style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>Continue →</Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '24px' }}>Recent AI Tutor Chats</h2>
          <div className="card">
            {recentChats.map((chat, idx) => (
              <div key={chat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: idx < recentChats.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div>
                  <h4 style={{ fontWeight: 500, marginBottom: '4px' }}>{chat.title}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{chat.time}</p>
                </div>
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>View Chat</button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
