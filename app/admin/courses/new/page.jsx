'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCourse } from '../actions';
import { TRACK_OPTIONS, LEVEL_OPTIONS, getTrackOptionByKey, normalizeCourseId } from '@/app/lib/courseMeta';
import Link from 'next/link';
import CourseCoverFields from '../CourseCoverFields';
import CourseTagSelector from '../CourseTagSelector';

export default function NewCoursePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState(null);
  const [trackKey, setTrackKey] = useState(TRACK_OPTIONS[0].key);
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [levelKey, setLevelKey] = useState(LEVEL_OPTIONS[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    startTransition(async () => {
      setErrorMsg(null);
      const res = await createCourse(formData);
      if (res.success) {
        router.push(`/admin/courses/${res.courseId}`);
      } else {
        setErrorMsg(res.error || 'Failed to create course');
      }
    });
  };

  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--bg-light)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <header style={{ marginBottom: '32px' }}>
          <Link href="/admin/courses" style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
            ← Back to Curriculum
          </Link>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>Create New Course</h1>
          <p style={{ color: '#6b7280' }}>Deploy a brand new learning curriculum outline into the system.</p>
        </header>

        {errorMsg && (
          <div style={{ padding: '16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '24px' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Course Unique ID (Slug)</label>
            <input
              name="id"
              required
              type="text"
              value={courseId}
              onChange={(event) => setCourseId(normalizeCourseId(event.target.value, title))}
              placeholder="e.g., introduction-to-generative-ai"
              style={{ padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }}
            />
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>會自動轉成網址格式，例如 `New text` 會變成 `new-text`。</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Course Title</label>
            <input
              name="title"
              required
              type="text"
              value={title}
              onChange={(event) => {
                const nextTitle = event.target.value;
                setTitle(nextTitle);
                setCourseId((currentId) => {
                  const normalizedCurrentId = normalizeCourseId(currentId, '');
                  const normalizedPreviousTitle = normalizeCourseId(title, '');

                  if (!normalizedCurrentId || normalizedCurrentId === normalizedPreviousTitle) {
                    return normalizeCourseId('', nextTitle);
                  }

                  return currentId;
                });
              }}
              placeholder="e.g., Introduction to Gen AI"
              style={{ padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Track Category</label>
              <select
                name="trackKey"
                required
                value={trackKey}
                onChange={(event) => setTrackKey(event.target.value)}
                style={{ padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%', backgroundColor: 'white' }}
              >
                {TRACK_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{option.labelZh}</option>
                ))}
              </select>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Level</label>
              <select name="levelKey" required value={levelKey} onChange={(event) => setLevelKey(event.target.value)} style={{ padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%', backgroundColor: 'white' }}>
                {LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 180px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>總時數</label>
              <input name="durationHours" required min="1" type="number" defaultValue="40" placeholder="40" style={{ padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }} />
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>前台會顯示成 `40 hours`。</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>課程 Hashtags</label>
            <CourseTagSelector />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Course Description</label>
            <textarea name="description" required placeholder="Describe what the students will learn..." rows={4} style={{ padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%', resize: 'vertical' }} />
          </div>

          <CourseCoverFields
            initialSource="preset"
            title={title}
            level={levelKey}
            trackLabel={getTrackOptionByKey(trackKey).labelZh}
          />

          <button disabled={isPending} type="submit" style={{ padding: '14px', backgroundColor: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: '16px', opacity: isPending ? 0.7 : 1 }}>
            {isPending ? 'Publishing Course...' : 'Create Course Catalog'}
          </button>
        </form>
      </div>
    </div>
  );
}
