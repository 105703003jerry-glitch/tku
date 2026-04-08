'use client';

import { useEffect, useMemo, useState } from 'react';

export default function CourseTagSelector({ initialOptions = [], initialSelectedKeys = [] }) {
  const [options, setOptions] = useState(initialOptions);
  const [selectedKeys, setSelectedKeys] = useState(initialSelectedKeys);
  const [draftLabel, setDraftLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (initialOptions.length > 0) {
      return undefined;
    }

    async function loadOptions() {
      try {
        const response = await fetch('/api/admin/course-tags', { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok || cancelled) {
          return;
        }

        setOptions(payload.items || []);
      } catch (loadError) {
        if (!cancelled) {
          setError('Unable to load hashtag options.');
        }
      }
    }

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [initialOptions.length]);

  const sortedOptions = useMemo(
    () => [...options].sort((left, right) => left.label_zh.localeCompare(right.label_zh, 'zh-Hant')),
    [options]
  );

  const toggleKey = (key) => {
    setSelectedKeys((currentKeys) => (
      currentKeys.includes(key)
        ? currentKeys.filter((currentKey) => currentKey !== key)
        : [...currentKeys, key]
    ));
  };

  const handleCreate = async () => {
    const label = draftLabel.trim();

    if (!label || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/course-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to create hashtag.');
      }

      setOptions((currentOptions) => {
        const existing = currentOptions.find((option) => option.key === payload.item.key);
        return existing ? currentOptions : [...currentOptions, payload.item];
      });
      setSelectedKeys((currentKeys) => (currentKeys.includes(payload.item.key) ? currentKeys : [...currentKeys, payload.item.key]));
      setDraftLabel('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (key) => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/course-tags?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to delete hashtag.');
      }

      setOptions((currentOptions) => currentOptions.filter((option) => option.key !== key));
      setSelectedKeys((currentKeys) => currentKeys.filter((currentKey) => currentKey !== key));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input type="hidden" name="courseTagKeys" value={JSON.stringify(selectedKeys)} />

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {sortedOptions.map((option) => {
          const selected = selectedKeys.includes(option.key);

          return (
            <div key={option.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', borderRadius: '999px', border: selected ? '1px solid #2563eb' : '1px solid #d1d5db', backgroundColor: selected ? '#dbeafe' : '#ffffff' }}>
              <button
                type="button"
                onClick={() => toggleKey(option.key)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: selected ? '#1d4ed8' : '#374151', fontSize: '0.82rem', fontWeight: 600, padding: 0 }}
              >
                {option.label_zh}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(option.key)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.78rem', padding: 0 }}
                aria-label={`Delete ${option.label_zh}`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={draftLabel}
          onChange={(event) => setDraftLabel(event.target.value)}
          placeholder="新增自訂 hashtag，例如：口說密集"
          style={{ flex: '1 1 260px', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px' }}
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={isSaving}
          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', color: '#111827', fontWeight: 600, cursor: isSaving ? 'progress' : 'pointer' }}
        >
          {isSaving ? 'Processing...' : '新增並選取'}
        </button>
      </div>

      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
        可複選多個 hashtags。新增後會變成下次可直接選擇的固定選項，也可以刪除不再使用的項目。
      </span>

      {error && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '0.82rem' }}>
          {error}
        </div>
      )}
    </div>
  );
}
