'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AITutorSidebar from './AITutorSidebar';

function clampPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  if (number > 100) {
    return 100;
  }

  return Math.round(number);
}

function getThresholdSeconds(durationSeconds) {
  const duration = Math.max(0, Number.parseInt(durationSeconds, 10) || 0);
  return duration ? Math.ceil(duration * 0.8) : 0;
}

function formatSeconds(seconds) {
  const safeSeconds = Math.max(0, Number.parseInt(seconds, 10) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;

  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function createDefaultLessonProgress(lesson) {
  const durationSeconds = Math.max(0, Number.parseInt(lesson.durationSeconds, 10) || 0);
  const thresholdSeconds = getThresholdSeconds(durationSeconds);

  return {
    lessonId: lesson.id,
    status: 'not_started',
    completed: false,
    progressPercent: 0,
    maxPositionSeconds: 0,
    lastPositionSeconds: 0,
    durationSeconds,
    thresholdSeconds,
    completionEligible: false,
  };
}

function mergeLessonProgress(existing, incoming) {
  if (!existing && !incoming) {
    return null;
  }

  if (!existing) {
    return { ...incoming };
  }

  return {
    ...existing,
    ...(incoming || {}),
    maxPositionSeconds: Math.max(
      Number(existing.maxPositionSeconds || 0),
      Number(incoming?.maxPositionSeconds || 0)
    ),
    lastPositionSeconds: Math.max(
      Number(existing.lastPositionSeconds || 0),
      Number(incoming?.lastPositionSeconds || 0)
    ),
  };
}

function loadYouTubeApi() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube API can only load in the browser.'));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  return new Promise((resolve) => {
    const existingScript = document.querySelector('script[data-youtube-api="true"]');

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.youtubeApi = 'true';
      document.body.appendChild(script);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve(window.YT);
    };
  });
}

export default function LearnCourseClient({
  course,
  courseId,
  isAuthenticated,
  viewer,
  initialLessonIndex,
  initialProgress,
  error,
}) {
  const router = useRouter();
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(initialLessonIndex);
  const [summary, setSummary] = useState(initialProgress.summary);
  const [lessonProgressById, setLessonProgressById] = useState(initialProgress.lessonProgressById || {});
  const [playerError, setPlayerError] = useState(null);
  const [syncMessage, setSyncMessage] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);
  const syncRef = useRef({ lessonId: null, maxPositionSeconds: 0, lastSentAt: 0 });

  const lessons = course?.lessons || [];
  const activeLesson = lessons[selectedLessonIndex] || lessons[0] || null;

  const normalizedLessonProgressById = useMemo(() => {
    const nextMap = {};

    lessons.forEach((lesson) => {
      nextMap[lesson.id] = mergeLessonProgress(
        createDefaultLessonProgress(lesson),
        lessonProgressById[lesson.id]
      );
    });

    return nextMap;
  }, [lessons, lessonProgressById]);

  const activeLessonProgress = activeLesson
    ? normalizedLessonProgressById[activeLesson.id]
    : null;

  useEffect(() => {
    setSelectedLessonIndex(initialLessonIndex);
  }, [initialLessonIndex, courseId]);

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated) {
      setSummary((currentSummary) => ({
        ...currentSummary,
        totalLessons: lessons.length,
      }));
      return undefined;
    }

    async function loadProgress() {
      try {
        const response = await fetch(`/api/learn/progress?courseId=${encodeURIComponent(courseId)}`, {
          cache: 'no-store',
        });
        const payload = await response.json();

        if (cancelled || !response.ok) {
          return;
        }

        setSummary(payload.summary);
        setLessonProgressById(payload.lessonProgressById || {});
      } catch (loadError) {
        console.error('Initial progress load error:', loadError);
      }
    }

    loadProgress();

    return () => {
      cancelled = true;
    };
  }, [courseId, isAuthenticated, lessons.length]);

  useEffect(() => {
    if (!activeLesson?.externalVideoId || !playerContainerRef.current) {
      return undefined;
    }

    let destroyed = false;

    loadYouTubeApi()
      .then((YT) => {
        if (destroyed || !playerContainerRef.current) {
          return;
        }

        playerRef.current?.destroy?.();
        playerRef.current = new YT.Player(playerContainerRef.current, {
          videoId: activeLesson.externalVideoId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onReady: () => {
              setPlayerError(null);
            },
          },
        });
      })
      .catch((loadError) => {
        console.error('YouTube API load error:', loadError);
        setPlayerError('YouTube player failed to load.');
      });

    return () => {
      destroyed = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [activeLesson?.externalVideoId]);

  useEffect(() => {
    if (!activeLesson) {
      return undefined;
    }

    let cancelled = false;

    const interval = window.setInterval(async () => {
      const player = playerRef.current;

      if (!player?.getCurrentTime || !player?.getDuration) {
        return;
      }

      const currentPositionSeconds = Math.floor(player.getCurrentTime() || 0);
      const durationSeconds = Math.floor(player.getDuration() || activeLesson.durationSeconds || 0);

      if (!durationSeconds) {
        return;
      }

      setLessonProgressById((currentMap) => {
        const previous = mergeLessonProgress(
          createDefaultLessonProgress(activeLesson),
          currentMap[activeLesson.id]
        );
        const maxPositionSeconds = Math.max(previous.maxPositionSeconds, currentPositionSeconds);
        const thresholdSeconds = getThresholdSeconds(durationSeconds);

        return {
          ...currentMap,
          [activeLesson.id]: {
            ...previous,
            durationSeconds,
            thresholdSeconds,
            maxPositionSeconds,
            lastPositionSeconds: currentPositionSeconds,
            progressPercent: previous.completed ? 100 : clampPercent((maxPositionSeconds / durationSeconds) * 100),
            completionEligible: previous.completed || maxPositionSeconds >= thresholdSeconds,
          },
        };
      });

      const now = Date.now();
      const shouldSync = (
        syncRef.current.lessonId !== activeLesson.id ||
        currentPositionSeconds >= syncRef.current.maxPositionSeconds + 5 ||
        now - syncRef.current.lastSentAt >= 10000
      );

      if (!shouldSync) {
        return;
      }

      syncRef.current = {
        lessonId: activeLesson.id,
        maxPositionSeconds: Math.max(syncRef.current.maxPositionSeconds, currentPositionSeconds),
        lastSentAt: now,
      };

      try {
        const response = await fetch('/api/learn/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync_playback',
            courseId,
            lessonId: activeLesson.id,
            currentPositionSeconds,
            durationSeconds,
          }),
        });

        if (!response.ok || cancelled) {
          return;
        }

        const payload = await response.json();

        setSummary(payload.summary);
        setLessonProgressById((currentMap) => ({
          ...currentMap,
          [activeLesson.id]: mergeLessonProgress(currentMap[activeLesson.id], payload.lessonProgress),
        }));
      } catch (syncError) {
        console.error('Playback sync error:', syncError);
      }
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeLesson, courseId]);

  const handleSelectLesson = (index) => {
    setSelectedLessonIndex(index);
    setSyncMessage(null);
    router.replace(`/learn/${courseId}?lesson=${index}`, { scroll: false });
  };

  const handleMarkCompleted = async () => {
    if (!activeLesson || !activeLessonProgress || !activeLessonProgress.completionEligible || isCompleting) {
      return;
    }

    setIsCompleting(true);
    setSyncMessage(null);

    try {
      const response = await fetch('/api/learn/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_complete',
          courseId,
          lessonId: activeLesson.id,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to mark lesson complete.');
      }

      setSummary(payload.summary);
      setLessonProgressById((currentMap) => ({
        ...currentMap,
        [activeLesson.id]: mergeLessonProgress(currentMap[activeLesson.id], payload.lessonProgress),
      }));
      setSyncMessage('Lesson marked complete.');
    } catch (completeError) {
      console.error('Mark complete error:', completeError);
      setSyncMessage(completeError.message);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-light)' }}>
      <header style={{ height: '60px', backgroundColor: '#ffffff', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>←</span> Dashboard
          </Link>
          <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-light)' }} />
          <h1 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{course?.title?.['zh-TW'] || courseId}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {error && <span style={{ color: '#856404', fontSize: '0.85rem', backgroundColor: '#fff3cd', padding: '4px 8px', borderRadius: '4px' }}>DB offline</span>}
          <div style={{ fontSize: '0.9rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
            {summary.progressPercent}% complete
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside style={{ width: '320px', minWidth: '320px', backgroundColor: '#ffffff', borderRight: '1px solid var(--border-light)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '8px' }}>Course Progress</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{summary.completedLessons}/{summary.totalLessons} completed</span>
              <span>{summary.progressPercent}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-light)', borderRadius: '999px', overflow: 'hidden', marginTop: '10px' }}>
              <div style={{ width: `${summary.progressPercent}%`, height: '100%', backgroundColor: 'var(--brand-primary)' }} />
            </div>
          </div>

          <div style={{ flex: 1 }}>
            {(() => {
              const grouped = { 0: { title: 'General Overview', items: [] } };
              course?.modules?.['zh-TW']?.forEach((module) => {
                grouped[module.sortOrder] = { title: module.title, items: [] };
              });

              lessons.forEach((lesson, absIdx) => {
                const moduleOrder = lesson.moduleSortOrder || 0;
                if (!grouped[moduleOrder]) {
                  grouped[moduleOrder] = { title: 'Uncategorized', items: [] };
                }
                grouped[moduleOrder].items.push({ lesson, absIdx });
              });

              return Object.keys(grouped)
                .sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10))
                .map((moduleOrder) => {
                  const group = grouped[moduleOrder];
                  if (group.items.length === 0) {
                    return null;
                  }

                  return (
                    <div key={moduleOrder} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ padding: '12px 20px', backgroundColor: '#f9fafb', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {group.title}
                      </div>
                      <div style={{ padding: '8px 12px' }}>
                        {group.items.map(({ lesson, absIdx }) => {
                          const lessonProgress = normalizedLessonProgressById[lesson.id];
                          const isActive = activeLesson?.id === lesson.id;
                          const icon = lessonProgress?.completed ? '✓' : (isActive ? '▶' : '○');

                          return (
                            <button
                              type="button"
                              key={lesson.id}
                              onClick={() => handleSelectLesson(absIdx)}
                              style={{ width: '100%', textAlign: 'left', marginBottom: '6px', backgroundColor: isActive ? 'var(--brand-secondary)' : '#ffffff', border: isActive ? '1px solid var(--brand-primary)' : '1px solid transparent', borderRadius: 'var(--radius-sm)', padding: '10px 12px', cursor: 'pointer' }}
                            >
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <span style={{ color: lessonProgress?.completed ? '#16a34a' : (isActive ? 'var(--brand-primary)' : 'var(--text-tertiary)'), fontSize: '0.85rem', marginTop: '2px' }}>
                                  {icon}
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--brand-primary)' : 'inherit', lineHeight: 1.4 }}>
                                    {lesson.title}
                                  </span>
                                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                                    {lessonProgress?.completed
                                      ? 'Completed'
                                      : lessonProgress?.completionEligible
                                        ? 'Ready to mark complete'
                                        : `${formatSeconds(lessonProgress?.maxPositionSeconds)} / ${formatSeconds(lessonProgress?.thresholdSeconds)} needed`}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
            })()}
          </div>
        </aside>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', backgroundColor: 'var(--bg-light)', padding: '32px' }}>
          <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
              {activeLesson?.externalVideoId ? (
                <div ref={playerContainerRef} style={{ width: '100%', height: '100%' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem' }}>
                  Video unavailable
                </div>
              )}
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'inline-block', backgroundColor: 'var(--brand-secondary)', color: 'var(--brand-primary)', fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '4px', marginBottom: '16px' }}>
                    Lesson {selectedLessonIndex + 1}
                  </div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '12px', lineHeight: 1.3 }}>{activeLesson?.title}</h2>
                </div>

                {isAuthenticated && activeLesson && activeLessonProgress && (
                  <button
                    type="button"
                    onClick={handleMarkCompleted}
                    disabled={!activeLessonProgress.completionEligible || activeLessonProgress.completed || isCompleting}
                    style={{
                      padding: '12px 18px',
                      backgroundColor: activeLessonProgress.completed ? '#dcfce7' : '#111827',
                      color: activeLessonProgress.completed ? '#166534' : '#ffffff',
                      border: activeLessonProgress.completed ? '1px solid #bbf7d0' : 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: (!activeLessonProgress.completionEligible || activeLessonProgress.completed || isCompleting) ? 'not-allowed' : 'pointer',
                      opacity: (!activeLessonProgress.completionEligible && !activeLessonProgress.completed) ? 0.55 : 1,
                    }}
                  >
                    {activeLessonProgress.completed ? 'Completed' : (isCompleting ? 'Saving...' : 'Mark as Completed')}
                  </button>
                )}
              </div>

              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '1rem', marginBottom: '20px' }}>
                {course?.description?.['zh-TW'] || 'Enjoy the content of this learning experience and keep progressing through the course.'}
              </p>

              {activeLessonProgress && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>Course Progress</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{summary.progressPercent}%</div>
                  </div>
                  <div style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>Playback Reached</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatSeconds(activeLessonProgress.maxPositionSeconds)}</div>
                  </div>
                  <div style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>Completion Unlock</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatSeconds(activeLessonProgress.thresholdSeconds)}</div>
                  </div>
                </div>
              )}

              {(syncMessage || playerError) && (
                <div style={{ marginTop: '18px', fontSize: '0.9rem', color: playerError ? '#b91c1c' : '#166534' }}>
                  {playerError || syncMessage}
                </div>
              )}
            </div>
          </div>
        </main>

        <AITutorSidebar 
          key={activeLesson?.id || 'empty'} 
          activeLesson={activeLesson} 
          viewer={viewer} 
          courseId={courseId} 
        />
      </div>
    </div>
  );
}
