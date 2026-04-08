import Link from 'next/link';
import db from '@/api/_lib/db';
import courseStore from '@/api/_lib/courseStore';
import { getAuthUser } from '@/app/lib/authSession';

export const dynamic = 'force-dynamic';

export default async function LearnCoursePage({ params, searchParams }) {
  const { courseId } = params;
  let course = null;
  let error = null;
  let user = await getAuthUser();
  let sql;

  try {
    sql = db.getSql();
    const courses = await courseStore.getPublishedCourses(sql, courseId);
    if (courses && courses.length > 0) {
      course = courses[0];
    }
  } catch (err) {
    console.error("Learn page course fetch error:", err);
    error = "Database connection not configured or failed. Showing placeholder.";
  }

  if (user && course && sql) {
    try {
      await sql`
        INSERT INTO enrollments (user_id, course_id, progress_percent)
        VALUES (${user.id}, ${courseId}, 10)
        ON CONFLICT (user_id, course_id) DO UPDATE 
        SET last_activity_at = NOW()
      `;
    } catch (err) {
      console.error("Learn page enrollment sync error:", err);
    }
  }

  // Keep placeholders only for DB failures so empty DB states remain visible.
  const lessons = error ? [
    { title: "Introduction to AI", externalVideoId: "jZ952vChhuI" }, 
    { title: "Neural Networks Basics", externalVideoId: "aircAruvnKk" }
  ] : (course?.lessons || []);
  
  // Support interactive menu selection via query parameters
  const activeLessonIndex = searchParams?.lesson ? parseInt(searchParams.lesson, 10) : 0;
  const activeLesson = lessons[activeLessonIndex] || lessons[0] || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-light)' }}>
      {/* Top Navbar */}
      <header style={{ height: '60px', backgroundColor: '#ffffff', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span style={{ fontSize: '1.2rem' }}>←</span> Dashboard
          </Link>
          <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-light)' }}></div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{course?.title?.['zh-TW'] || courseId}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {error && <span style={{ color: '#856404', fontSize: '0.85rem', backgroundColor: '#fff3cd', padding: '4px 8px', borderRadius: '4px' }}>DB offline</span>}
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundImage: 'url(/assets/user_avatar.png)', backgroundSize: 'cover', border: '1px solid var(--border-light)' }}></div>
        </div>
      </header>

      {/* Main 3-Column Learning Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT COLUMN: Playlist / Modules Sidebar (20%) */}
        <aside style={{ width: '280px', minWidth: '280px', backgroundColor: '#ffffff', borderRight: '1px solid var(--border-light)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '8px' }}>Course Content</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{activeLessonIndex + 1}/{lessons.length}</span>
              <span>{Math.round(((activeLessonIndex) / Math.max(1, lessons.length - 1)) * 100) || 0}%</span>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border-light)', borderRadius: '2px', overflow: 'hidden', marginTop: '8px' }}>
              <div style={{ width: `${((activeLessonIndex) / Math.max(1, lessons.length - 1)) * 100}%`, height: '100%', backgroundColor: 'var(--brand-primary)', borderRadius: '2px', transition: 'width 0.3s' }}></div>
            </div>
          </div>
          
          <div style={{ flex: 1 }}>
            {(() => {
              // Group lessons for sidebar
              const grouped = { 0: { title: "General Overview", items: [] } };
              course?.modules?.['zh-TW']?.forEach(m => {
                grouped[m.sortOrder] = { title: m.title, items: [] };
              });
              
              lessons.forEach((lesson, absIdx) => {
                const mo = lesson.moduleSortOrder || 0;
                if (!grouped[mo]) grouped[mo] = { title: "Uncategorized", items: [] };
                grouped[mo].items.push({ lesson, absIdx });
              });

              return Object.keys(grouped).sort((a,b)=>parseInt(a)-parseInt(b)).map(modOrder => {
                const group = grouped[modOrder];
                if (group.items.length === 0) return null;
                
                return (
                  <div key={modOrder} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ padding: '12px 20px', backgroundColor: '#f9fafb', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {group.title}
                    </div>
                    <div style={{ padding: '8px 12px' }}>
                      {group.items.map(({ lesson, absIdx }) => {
                        const isActive = absIdx === activeLessonIndex;
                        return (
                          <Link href={`/learn/${courseId}?lesson=${absIdx}`} key={absIdx} style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: '4px' }}>
                            <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: isActive ? 'var(--brand-secondary)' : '#ffffff', border: isActive ? '1px solid var(--brand-primary)' : '1px solid transparent', cursor: 'pointer', transition: 'all 0.2s', alignContent: 'center' }}>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <span style={{ color: isActive ? 'var(--brand-primary)' : 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: '2px' }}>
                                  {isActive ? '▶' : (absIdx < activeLessonIndex ? '✓' : '○')}
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--brand-primary)' : 'inherit', lineHeight: 1.4 }}>
                                    {lesson.title}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </aside>

        {/* CENTER COLUMN: Video Player Area (55%) */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', backgroundColor: 'var(--bg-light)', padding: '32px' }}>
          <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
            {/* YouTube Embed */}
            <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
              {activeLesson?.externalVideoId ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube-nocookie.com/embed/${activeLesson.externalVideoId}?rel=0&modestbranding=1`}
                  title={activeLesson.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem' }}>
                  Video unavailable
                </div>
              )}
            </div>
            
            <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'inline-block', backgroundColor: 'var(--brand-secondary)', color: 'var(--brand-primary)', fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '4px', marginBottom: '16px' }}>
                Lesson {activeLessonIndex + 1}
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '16px', lineHeight: 1.3 }}>{activeLesson?.title}</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '1rem' }}>
                {course?.description?.['zh-TW'] || "Enjoy the content of this amazing new learning experience. Start your AI progression path today."}
              </p>
            </div>
          </div>
        </main>

        {/* RIGHT COLUMN: AI Tutor Chat (25%) */}
        <aside style={{ width: '350px', backgroundColor: '#ffffff', borderLeft: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column' }}>
           <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', backgroundColor: '#fafafa', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', backgroundColor: 'var(--brand-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                AI
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Tutor Assistant</h3>
                <span style={{ fontSize: '0.75rem', color: '#34c759', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '6px', height: '6px', backgroundColor: '#34c759', borderRadius: '50%' }}></div> Online
                </span>
              </div>
           </div>

           {/* Chat Messages Area */}
           <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                 <div style={{ width: '28px', height: '28px', backgroundColor: 'var(--brand-primary)', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem' }}>AI</div>
                 <div style={{ backgroundColor: '#f2f2f7', padding: '12px 16px', borderRadius: '0px 12px 12px 12px', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                   Hello {user?.nickname?.split(' ')[0] || 'there'}! I'm your dedicated AI tutor for <strong>"{activeLesson?.title || 'this course'}"</strong>.<br/><br/>If you don't understand any concept in the video, just ask me!
                 </div>
              </div>
           </div>

           {/* Chat Input Area */}
           <div style={{ padding: '16px', borderTop: '1px solid var(--border-light)', backgroundColor: '#ffffff' }}>
             <div style={{ position: 'relative' }}>
               <input 
                 type="text" 
                 placeholder="Ask the AI Tutor..." 
                 style={{ width: '100%', padding: '14px 44px 14px 16px', borderRadius: '24px', border: '1px solid var(--border-light)', fontSize: '0.9rem', outline: 'none' }} 
               />
               <button style={{ position: 'absolute', right: '6px', top: '6px', width: '32px', height: '32px', backgroundColor: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 ↑
               </button>
             </div>
             <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Powered by Pandoo AI</span>
             </div>
           </div>
        </aside>

      </div>
    </div>
  );
}
