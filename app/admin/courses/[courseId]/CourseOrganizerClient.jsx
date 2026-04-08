'use client';

import { useMemo, useState, useTransition } from 'react';

function buildOrganizerState(modules, lessons) {
  const grouped = {
    0: {
      id: 'general',
      title: 'General',
      sortOrder: 0,
      lessons: [],
    },
  };

  modules.forEach((module) => {
    grouped[module.sortOrder] = {
      id: module.id,
      title: module.title,
      sortOrder: module.sortOrder,
      lessons: [],
    };
  });

  lessons.forEach((lesson) => {
    const moduleSortOrder = Number(lesson.moduleSortOrder || 0);
    if (!grouped[moduleSortOrder]) {
      grouped[0].lessons.push(lesson);
      return;
    }

    grouped[moduleSortOrder].lessons.push(lesson);
  });

  return Object.values(grouped)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((module) => ({
      ...module,
      lessons: [...module.lessons].sort((left, right) => left.lessonSortOrder - right.lessonSortOrder),
    }));
}

function cloneModules(modules) {
  return modules.map((module) => ({
    ...module,
    lessons: module.lessons.map((lesson) => ({ ...lesson })),
  }));
}

export default function CourseOrganizerClient({
  courseId,
  modules,
  lessons,
  deleteLessonAction,
  deleteModuleAction,
}) {
  const [orderedModules, setOrderedModules] = useState(() => buildOrganizerState(modules, lessons));
  const [dragState, setDragState] = useState(null);
  const [notice, setNotice] = useState(null);
  const [isPending, startTransition] = useTransition();

  const moduleOrderSignature = useMemo(
    () => orderedModules.filter((module) => module.sortOrder !== 0).map((module) => module.sortOrder).join(','),
    [orderedModules]
  );

  async function persist(payload, optimisticModules, successMessage) {
    const previousModules = orderedModules;
    setOrderedModules(optimisticModules);
    setNotice({ type: 'info', message: 'Saving order...' });

    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/courses/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            ...payload,
          }),
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Unable to save the new order.');
        }

        setNotice({ type: 'success', message: successMessage });
      } catch (error) {
        console.error('Reorder error:', error);
        setOrderedModules(previousModules);
        setNotice({ type: 'error', message: error.message || 'Unable to save the new order.' });
      }
    });
  }

  function handleModuleDrop(targetSortOrder) {
    if (!dragState || dragState.type !== 'module' || dragState.sortOrder === targetSortOrder) {
      setDragState(null);
      return;
    }

    const nextModules = cloneModules(orderedModules);
    const staticGeneral = nextModules.find((module) => module.sortOrder === 0);
    const draggableModules = nextModules.filter((module) => module.sortOrder !== 0);
    const sourceIndex = draggableModules.findIndex((module) => module.sortOrder === dragState.sortOrder);
    const targetIndex = draggableModules.findIndex((module) => module.sortOrder === targetSortOrder);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDragState(null);
      return;
    }

    const [movedModule] = draggableModules.splice(sourceIndex, 1);
    draggableModules.splice(targetIndex, 0, movedModule);

    const reordered = staticGeneral ? [staticGeneral, ...draggableModules] : draggableModules;

    setDragState(null);
    persist(
      {
        type: 'modules',
        orderedModuleSortOrders: draggableModules.map((module) => module.sortOrder),
      },
      reordered,
      'Topic order updated.'
    );
  }

  function handleLessonDrop(targetModuleSortOrder, targetLessonId = null) {
    if (!dragState || dragState.type !== 'lesson') {
      setDragState(null);
      return;
    }

    const nextModules = cloneModules(orderedModules);
    const sourceModule = nextModules.find((module) => module.sortOrder === dragState.moduleSortOrder);
    const targetModule = nextModules.find((module) => module.sortOrder === targetModuleSortOrder);

    if (!sourceModule || !targetModule) {
      setDragState(null);
      return;
    }

    const sourceIndex = sourceModule.lessons.findIndex((lesson) => lesson.id === dragState.lessonId);

    if (sourceIndex === -1) {
      setDragState(null);
      return;
    }

    const [movedLesson] = sourceModule.lessons.splice(sourceIndex, 1);
    movedLesson.moduleSortOrder = targetModuleSortOrder;

    let insertIndex = targetModule.lessons.length;

    if (targetLessonId) {
      const foundIndex = targetModule.lessons.findIndex((lesson) => lesson.id === targetLessonId);
      if (foundIndex !== -1) {
        insertIndex = foundIndex;
      }
    }

    if (
      sourceModule.sortOrder === targetModule.sortOrder &&
      sourceIndex < insertIndex
    ) {
      insertIndex -= 1;
    }

    targetModule.lessons.splice(insertIndex, 0, movedLesson);

    setDragState(null);
    persist(
      {
        type: 'lessons',
        modules: nextModules.map((module) => ({
          moduleSortOrder: module.sortOrder,
          lessonIds: module.lessons.map((lesson) => lesson.id),
        })),
      },
      nextModules,
      'Lesson order updated.'
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Course Modules & Lessons</h2>
          <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            Drag topics to reorder the curriculum. Drag videos into a different topic or position to update lesson order.
          </p>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#6b7280', backgroundColor: '#f3f4f6', borderRadius: '999px', padding: '6px 10px' }}>
          Topic order: {moduleOrderSignature || 'general-only'}
        </div>
      </div>

      {notice && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 14px',
            borderRadius: '10px',
            border: notice.type === 'error' ? '1px solid #fecaca' : '1px solid #d1fae5',
            backgroundColor: notice.type === 'error' ? '#fef2f2' : '#f0fdf4',
            color: notice.type === 'error' ? '#991b1b' : '#166534',
            fontSize: '0.85rem',
          }}
        >
          {notice.message}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {orderedModules.map((module) => (
          <div
            key={module.sortOrder}
            onDragOver={(event) => {
              if (dragState?.type === 'module' && module.sortOrder !== 0) {
                event.preventDefault();
              }
            }}
            onDrop={(event) => {
              if (dragState?.type === 'module' && module.sortOrder !== 0) {
                event.preventDefault();
                handleModuleDrop(module.sortOrder);
              }
            }}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: dragState?.type === 'module' && dragState.sortOrder === module.sortOrder ? '1px solid #111827' : '1px solid #e5e7eb',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div
                draggable={module.sortOrder !== 0 && !isPending}
                onDragStart={() => setDragState({ type: 'module', sortOrder: module.sortOrder })}
                onDragEnd={() => setDragState(null)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: module.sortOrder === 0 ? 'default' : 'grab' }}
              >
                <span style={{ fontSize: '1rem', color: module.sortOrder === 0 ? '#9ca3af' : '#6b7280' }}>
                  {module.sortOrder === 0 ? '•' : '⋮⋮'}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#374151', margin: 0 }}>
                  {module.sortOrder === 0 ? 'General' : `Topic: ${module.title}`}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280', backgroundColor: '#e5e7eb', padding: '4px 8px', borderRadius: '12px' }}>
                  {module.lessons.length} lessons
                </span>
                {module.sortOrder !== 0 && (
                  <form action={deleteModuleAction}>
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="moduleSortOrder" value={module.sortOrder} />
                    <button type="submit" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline', padding: 0 }}>
                      Delete Topic
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div
              onDragOver={(event) => {
                if (dragState?.type === 'lesson') {
                  event.preventDefault();
                }
              }}
              onDrop={(event) => {
                if (dragState?.type === 'lesson') {
                  event.preventDefault();
                  handleLessonDrop(module.sortOrder);
                }
              }}
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '72px', backgroundColor: dragState?.type === 'lesson' ? '#fcfcfd' : '#ffffff' }}
            >
              {module.lessons.length === 0 ? (
                <div style={{ fontSize: '0.9rem', color: '#9ca3af', textAlign: 'center', padding: '12px' }}>
                  Drop a video here or attach a new one from the sidebar.
                </div>
              ) : module.lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  draggable={!isPending}
                  onDragStart={() => setDragState({ type: 'lesson', lessonId: lesson.id, moduleSortOrder: module.sortOrder })}
                  onDragEnd={() => setDragState(null)}
                  onDragOver={(event) => {
                    if (dragState?.type === 'lesson') {
                      event.preventDefault();
                    }
                  }}
                  onDrop={(event) => {
                    if (dragState?.type === 'lesson') {
                      event.preventDefault();
                      handleLessonDrop(module.sortOrder, lesson.id);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#ffffff',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: dragState?.type === 'lesson' && dragState.lessonId === lesson.id ? '1px solid #111827' : '1px solid #f3f4f6',
                    gap: '16px',
                    cursor: 'grab',
                  }}
                >
                  <div style={{ width: '30px', height: '30px', backgroundColor: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#374151', fontSize: '0.8rem' }}>
                    {index + 1}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#6b7280' }}>⋮⋮</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: 500, color: '#111827', margin: 0, fontSize: '0.95rem' }}>{lesson.title}</h4>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '4px 0 0 0' }}>
                      YouTube ID: <span style={{ fontFamily: 'monospace' }}>{lesson.externalVideoId}</span>
                    </p>
                  </div>
                  <div style={{ color: '#ef4444' }}>
                    <form action={deleteLessonAction}>
                      <input type="hidden" name="lessonId" value={lesson.id} />
                      <input type="hidden" name="courseId" value={courseId} />
                      <button type="submit" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline', padding: 0 }}>
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
