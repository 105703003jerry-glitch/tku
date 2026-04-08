import Link from 'next/link';

// Import existing backend logic dynamically to avoid Next.js client-side errors
import db from '@/api/_lib/db';
import courseStore from '@/api/_lib/courseStore';

export default async function LearnCoursePage({ params, searchParams }) {
  const { courseId } = params;
  let course = null;
  let error = null;

  try {
    const sql = db.getSql();
    const courses = await courseStore.getPublishedCourses(sql, courseId);
    if (courses && courses.length > 0) {
      course = courses[0];
    }
  } catch (err) {
    error = "Database connection not configured or failed. Showing placeholder.";
  }

  // Placeholder data if DB fetch fails or course not found
  const lessons = course?.lessons?.length > 0 ? course.lessons : [
    { title: "Introduction to AI", externalVideoId: "jZ952vChhuI" }, // fake fallback ID
    { title: "Neural Networks Basics", externalVideoId: "aircAruvnKk" }
  ];
  
  // Support interactive menu selection via query parameters
  const activeLessonIndex = searchParams?.lesson ? parseInt(searchParams.lesson, 10) : 0;
  const activeLesson = lessons[activeLessonIndex] || lessons[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-color)' }}>
      {/* Top Navbar */}
      <header style={{ height: '60px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>← Back to Dashboard</Link>
          <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-light)' }}></div>
          <h1 style={{ fontSize: '1rem', fontWeight: 600 }}>{course?.title?.['zh-TW'] || courseId}</h1>
        </div>
        <div className="btn-secondary" style={{ padding: '6px 16px' }}>AI Tutor Assistance</div>
      </header>

      {/* Main Learning Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Playlist / Modules Sidebar */}
        <aside style={{ width: '320px', backgroundColor: 'var(--bg-card)', borderRight: '1px solid var(--border-light)', overflowY: 'auto' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>Course Content</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>0/{lessons.length} Lessons Completed</div>
            
            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border-light)', borderRadius: '2px', overflow: 'hidden', marginTop: '12px' }}>
              <div style={{ width: '0%', height: '100%', backgroundColor: 'var(--brand-primary)', borderRadius: '2px' }}></div>
            </div>
          </div>
          
          <div style={{ padding: '16px' }}>
            {lessons.map((lesson, index) => {
              const isActive = index === activeLessonIndex;
              return (
                <Link href={`/learn/${courseId}?lesson=${index}`} key={index} style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: '8px' }}>
                  <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: isActive ? 'var(--brand-secondary)' : 'var(--bg-color)', border: isActive ? '1px solid var(--brand-primary)' : '1px solid var(--border-light)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>▶</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--brand-primary)' : 'inherit' }}>
                        {index + 1}. {lesson.title}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Video Player Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: '900px' }}>
            {error && (
              <div style={{ padding: '12px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px', marginBottom: '16px', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}
            
            {/* The Actual YouTube Embed */}
            <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '24px', boxShadow: 'var(--shadow-md)' }}>
              {activeLesson?.externalVideoId ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube-nocookie.com/embed/${activeLesson.externalVideoId}`}
                  title={activeLesson.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  No video available
                </div>
              )}
            </div>
            
            <h2 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '16px' }}>{activeLesson?.title}</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {course?.description?.['zh-TW'] || "Enjoy the content of this amazing new learning experience. Start your AI progression path today."}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
