'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCourse } from '../actions';
import Link from 'next/link';

export default function NewCoursePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState(null);

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
            <input name="id" required type="text" placeholder="e.g., introduction-to-generative-ai" style={{ padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }} />
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>This is the unique URL identifier. Letters, numbers, and hyphens only.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Course Title</label>
            <input name="title" required type="text" placeholder="e.g., Introduction to Gen AI" style={{ padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }} />
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Track Category</label>
              <select name="trackKey" required style={{ padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%', backgroundColor: 'white' }}>
                <option value="ai-fundamentals">AI Fundamentals</option>
                <option value="data-engineering">Data Engineering</option>
                <option value="career-development">Career Path</option>
              </select>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Level</label>
              <select name="levelKey" required style={{ padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%', backgroundColor: 'white' }}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Course Description</label>
            <textarea name="description" required placeholder="Describe what the students will learn..." rows={4} style={{ padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%', resize: 'vertical' }} />
          </div>

          <button disabled={isPending} type="submit" style={{ padding: '14px', backgroundColor: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: '16px', opacity: isPending ? 0.7 : 1 }}>
            {isPending ? 'Publishing Course...' : 'Create Course Catalog'}
          </button>
        </form>
      </div>
    </div>
  );
}
