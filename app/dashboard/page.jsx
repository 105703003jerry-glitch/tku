import Link from 'next/link';
import db from '@/api/_lib/db';
import courseStore from '@/api/_lib/courseStore';
import { getAuthUser } from '../lib/authSession';
import { performLogout } from '../login/actions';

export default async function Dashboard() {
  let user = await getAuthUser();
  let enrolledCourses = [];
  let topicProgress = [];
  let recentChats = [];
  let error = null;

  try {
    const sql = db.getSql();
    
    // If not logged in, they shouldn't be here, but we fail gracefully
    if (!user) {
      error = "You are not logged in.";
    }

    // 2. Fetch enrolled courses and their progress for this user
    if (user) {
      const enrollments = await sql`
        SELECT e.course_id, e.progress_percent, e.last_activity_at 
        FROM enrollments e 
        WHERE e.user_id = ${user.id}
        ORDER BY e.last_activity_at DESC
      `;
      
      // Map course metadata via courseStore and compute Topic progress
      if (enrollments.length > 0) {
        const publishedCourses = await courseStore.getPublishedCourses(sql);
        
        // Data structure to hold tracks/topics
        const topicsMap = {};
        
        enrolledCourses = enrollments.map(enr => {
          const courseData = publishedCourses.find(c => c.id === enr.course_id);
          
          // Track Topic Progress
          const trackKey = courseData?.track || 'uncategorized';
          const trackName = courseData?.trackLabel?.['zh-TW'] || trackKey;
          
          if (!topicsMap[trackKey]) {
             topicsMap[trackKey] = { name: trackName, totalProgress: 0, courseCount: 0 };
          }
          topicsMap[trackKey].totalProgress += (enr.progress_percent || 0);
          topicsMap[trackKey].courseCount += 1;
          
          return {
            id: enr.course_id,
            title: courseData?.title?.['zh-TW'] || enr.course_id,
            progress: enr.progress_percent || 0,
            lastAccessed: new Date(enr.last_activity_at).toLocaleDateString()
          };
        });
        
        // Calculate the aggregate topic progress percentages
        topicProgress = Object.values(topicsMap).map(t => ({
           name: t.name,
           overallPercentage: Math.round(t.totalProgress / t.courseCount),
           courseCount: t.courseCount
        }));
      }

      // 3. Fetch recent AI Chats
      recentChats = await sql`
        SELECT id, title, updated_at 
        FROM ai_conversations 
        WHERE user_id = ${user.id} 
        ORDER BY updated_at DESC LIMIT 3
      `;
    }

  } catch (err) {
    console.error("Dashboard DB Error:", err);
    error = true;
  }

  // Fallbacks if no data
  if (!user && !error) {
    user = { nickname: 'Guest', name: 'Demo User' };
  }

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
        
        <div style={{ padding: '24px 0', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundImage: 'url(/assets/user_avatar.png)', backgroundSize: 'cover' }}></div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user?.nickname || user?.name || 'Guest'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Student</div>
            </div>
          </div>
          <form action={performLogout}>
             <button type="submit" style={{ width: '100%', padding: '8px', backgroundColor: 'transparent', border: '1px solid var(--border-light)', borderRadius: '4px', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}>
               Sign Out
             </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        {error && (
          <div style={{ padding: '12px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px', marginBottom: '24px', fontSize: '0.9rem' }}>
            {error === "You are not logged in." ? <><Link href="/login" style={{color: '#856404', fontWeight: 600, textDecoration: 'underline'}}>Sign in</Link> to view your live data.</> : 'Database connection failed. Unable to fetch your live profile.'}
          </div>
        )}

        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Welcome back, {user?.nickname || user?.name || 'User'}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>You are on a 3-day learning streak. Keep it up!</p>
        </header>

        {topicProgress.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '24px' }}>Topic Progress (Themes)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {topicProgress.map((topic, idx) => (
                <div key={idx} className="card" style={{ padding: '24px', borderLeft: '4px solid var(--brand-primary)' }}>
                   <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{topic.courseCount} Courses Enrolled</div>
                   <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>{topic.name}</h3>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${topic.overallPercentage}%`, height: '100%', backgroundColor: 'var(--brand-primary)', borderRadius: '4px' }}></div>
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>{topic.overallPercentage}%</span>
                   </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>In Progress Courses</h2>
            <Link href="/courses" style={{ color: 'var(--brand-primary)', fontWeight: 500, fontSize: '0.9rem' }}>Browse more</Link>
          </div>
          
          {enrolledCourses.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p style={{ marginBottom: '16px' }}>You haven't enrolled in any courses yet.</p>
              <Link href="/courses" className="btn-primary">Explore Courses</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
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
          )}
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '24px' }}>Recent AI Tutor Chats</h2>
          <div className="card">
            {recentChats.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No AI conversations started yet.</div>
            ) : (
              recentChats.map((chat, idx) => (
                <div key={chat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: idx < recentChats.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <div>
                    <h4 style={{ fontWeight: 500, marginBottom: '4px' }}>{chat.title || 'Untitled Conversation'}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{new Date(chat.updated_at).toLocaleDateString()}</p>
                  </div>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>View Chat</button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
