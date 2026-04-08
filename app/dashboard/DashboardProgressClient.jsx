'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

function getTrackAccent(trackKey) {
  if (trackKey === 'teacher-training') {
    return {
      border: '#f59e0b',
      background: '#fffbeb',
      text: '#92400e',
      pillBackground: '#fef3c7',
      pillText: '#92400e',
    };
  }

  return {
    border: 'var(--brand-primary)',
    background: '#eff6ff',
    text: '#1d4ed8',
    pillBackground: '#dbeafe',
    pillText: '#1d4ed8',
  };
}

export default function DashboardProgressClient({ topicProgress = [], enrolledCourses = [] }) {
  const [selectedTrackKeys, setSelectedTrackKeys] = useState([]);

  const toggleTrack = (trackKey) => {
    setSelectedTrackKeys((currentKeys) => (
      currentKeys.includes(trackKey)
        ? currentKeys.filter((key) => key !== trackKey)
        : [...currentKeys, trackKey]
    ));
  };

  const filteredCourses = useMemo(() => {
    if (selectedTrackKeys.length === 0) {
      return enrolledCourses;
    }

    return enrolledCourses.filter((course) => selectedTrackKeys.includes(course.trackKey));
  }, [enrolledCourses, selectedTrackKeys]);

  return (
    <>
      {topicProgress.length > 0 && (
        <section style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '6px' }}>Topic Progress (Themes)</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>點擊分類卡片即可篩選下方的進行中課程，可同時選多個，也可全部取消。</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {topicProgress.map((topic) => {
              const active = selectedTrackKeys.includes(topic.key);
              const accent = getTrackAccent(topic.key);

              return (
                <button
                  key={topic.key}
                  type="button"
                  onClick={() => toggleTrack(topic.key)}
                  className="card"
                  style={{
                    padding: '24px',
                    borderLeft: `4px solid ${accent.border}`,
                    textAlign: 'left',
                    cursor: 'pointer',
                    backgroundColor: active ? accent.background : 'white',
                    boxShadow: active ? '0 14px 30px rgba(15, 23, 42, 0.08)' : undefined,
                    transform: active ? 'translateY(-1px)' : 'none',
                    transition: 'background-color 140ms ease, box-shadow 140ms ease, transform 140ms ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{topic.courseCount} Courses Enrolled</div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{topic.name}</h3>
                    </div>
                    <span style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: active ? accent.pillBackground : '#f8fafc', color: active ? accent.pillText : '#64748b', fontSize: '0.76rem', fontWeight: 700 }}>
                      {active ? 'Filtering' : 'Theme'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${topic.overallPercentage}%`, height: '100%', backgroundColor: accent.border, borderRadius: '4px' }}></div>
                    </div>
                    <span style={{ fontWeight: 600, color: accent.text }}>{topic.overallPercentage}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>In Progress Courses</h2>
            {selectedTrackKeys.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedTrackKeys.map((trackKey) => {
                  const topic = topicProgress.find((item) => item.key === trackKey);
                  const accent = getTrackAccent(trackKey);

                  return (
                    <button
                      key={trackKey}
                      type="button"
                      onClick={() => toggleTrack(trackKey)}
                      style={{ padding: '6px 10px', borderRadius: '999px', border: 'none', backgroundColor: accent.pillBackground, color: accent.pillText, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {topic?.name || trackKey} ×
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <Link href="/courses" style={{ color: 'var(--brand-primary)', fontWeight: 500, fontSize: '0.9rem' }}>Browse more</Link>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ marginBottom: '16px' }}>目前沒有符合這組分類條件的進行中課程。</p>
            {selectedTrackKeys.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedTrackKeys([])}
                className="btn-secondary"
              >
                Clear Filters
              </button>
            ) : (
              <Link href="/courses" className="btn-primary">Explore Courses</Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
            {filteredCourses.map((course) => {
              const accent = getTrackAccent(course.trackKey);

              return (
                <div key={course.id} className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', backgroundImage: `url("${course.coverImageUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ padding: '5px 9px', borderRadius: '999px', backgroundColor: accent.pillBackground, color: accent.pillText, fontSize: '0.74rem', fontWeight: 700 }}>
                          {course.trackName}
                        </span>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{course.title}</h3>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '16px' }}>Last accessed: {course.lastAccessed}</p>

                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                        <div style={{ width: `${course.progress}%`, height: '100%', backgroundColor: accent.border, borderRadius: '3px' }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{course.progress}% Complete</span>
                        <Link href={`/learn/${course.id}`} style={{ color: accent.text, fontWeight: 600 }}>Continue →</Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
