'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { TRACK_OPTIONS, getTrackOptionByKey } from '@/app/lib/courseMeta';
import { getCourseCoverImage } from '@/app/lib/courseCover';

function filterUniqueLabels(tags = []) {
  const seen = new Set();

  return tags.filter((tag) => {
    const label = String(tag?.label || '').trim();

    if (!label || seen.has(label)) {
      return false;
    }

    seen.add(label);
    return true;
  });
}

export default function CoursesCatalogClient({ courses }) {
  const [activeTrackKey, setActiveTrackKey] = useState('all');
  const [activeTagLabel, setActiveTagLabel] = useState('all');

  const availableTagLabels = useMemo(() => {
    const labelSet = new Set();

    courses.forEach((course) => {
      (course.courseTags || []).forEach((tag) => {
        const label = String(tag?.label || '').trim();
        if (label) {
          labelSet.add(label);
        }
      });
    });

    return Array.from(labelSet).sort((left, right) => left.localeCompare(right, 'zh-Hant'));
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesTrack = activeTrackKey === 'all' || course.track === activeTrackKey;
      const matchesTag = activeTagLabel === 'all' || (course.courseTags || []).some((tag) => tag.label === activeTagLabel);
      return matchesTrack && matchesTag;
    });
  }, [activeTagLabel, activeTrackKey, courses]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px 20px', borderRadius: '18px', border: '1px solid #dbe3f0', background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', color: '#2563eb', textTransform: 'uppercase' }}>
            大分類
          </span>
          <button
            type="button"
            onClick={() => setActiveTrackKey('all')}
            style={{
              padding: '10px 14px',
              borderRadius: '999px',
              border: activeTrackKey === 'all' ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
              backgroundColor: activeTrackKey === 'all' ? '#dbeafe' : '#ffffff',
              color: activeTrackKey === 'all' ? '#1d4ed8' : '#334155',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            全部課程
          </button>
          {TRACK_OPTIONS.map((option) => {
            const active = activeTrackKey === option.key;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setActiveTrackKey(option.key)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '999px',
                  border: active ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
                  backgroundColor: active ? '#1d4ed8' : '#eff6ff',
                  color: active ? '#ffffff' : '#1e3a8a',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  boxShadow: active ? '0 8px 18px rgba(37, 99, 235, 0.18)' : 'none',
                }}
              >
                {option.labelZh}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', color: '#64748b', textTransform: 'uppercase' }}>
            Hashtags
          </span>
          <button
            type="button"
            onClick={() => setActiveTagLabel('all')}
            style={{
              padding: '8px 12px',
              borderRadius: '999px',
              border: activeTagLabel === 'all' ? '1px solid #2563eb' : '1px solid #d1d5db',
              backgroundColor: activeTagLabel === 'all' ? '#dbeafe' : '#ffffff',
              color: activeTagLabel === 'all' ? '#1d4ed8' : '#475569',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            全部標籤
          </button>
          {availableTagLabels.map((label) => {
            const active = activeTagLabel === label;

            return (
              <button
                key={label}
                type="button"
                onClick={() => setActiveTagLabel(label)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '999px',
                  border: active ? '1px solid #2563eb' : '1px solid #d1d5db',
                  backgroundColor: active ? '#dbeafe' : '#ffffff',
                  color: active ? '#1d4ed8' : '#475569',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                }}
              >
                #{label}
              </button>
            );
          })}
        </div>
      </section>

      {filteredCourses.length === 0 ? (
        <div style={{ padding: '24px', backgroundColor: '#ffffff', border: '1px dashed var(--border-light)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
          目前沒有符合這組篩選條件的課程，試試切換大分類或移除 hashtag 篩選。
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filteredCourses.map((course) => {
            const trackCategoryLabel = getTrackOptionByKey(course.track).labelZh;
            const combinedTags = [trackCategoryLabel, ...filterUniqueLabels(course.courseTags).map((tag) => tag.label)];

            return (
              <Link href={`/learn/${course.id}`} key={course.id} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                <div
                  style={{
                    height: '180px',
                    backgroundColor: '#f2f2f7',
                    backgroundImage: `url("${getCourseCoverImage(course)}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderBottom: '1px solid var(--border-light)',
                  }}
                />
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    {combinedTags.map((label) => (
                      <div key={`${course.id}-${label}`} style={{ display: 'inline-block', backgroundColor: 'var(--brand-secondary)', color: 'var(--brand-primary)', fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px', borderRadius: '4px' }}>
                        {label}
                      </div>
                    ))}
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>{course.title?.['zh-TW'] || 'Untitled'}</h3>
                  <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                    <span>• Level: {course.level || 'Everyone'}</span>
                    <span>• {course.duration || 'Self-paced'}</span>
                  </div>
                  <div className="btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                    Start Learning
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
