'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  COURSE_COVER_ALLOWED_TYPES,
  COURSE_COVER_MAX_BYTES,
  COURSE_COVER_MIN_HEIGHT,
  COURSE_COVER_MIN_WIDTH,
  COURSE_COVER_PRESETS,
  COURSE_COVER_RECOMMENDED_HEIGHT,
  COURSE_COVER_RECOMMENDED_WIDTH,
  getCourseCoverPresetUrl,
  normalizeCoverPresetKey,
  normalizeCoverSource,
} from '@/app/lib/courseCover';

function loadImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      resolve({ width: image.width, height: image.height, objectUrl });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to read the selected image.'));
    };

    image.src = objectUrl;
  });
}

export default function CourseCoverFields({
  initialSource = 'youtube',
  initialPresetKey = COURSE_COVER_PRESETS[0].key,
  existingImageUrl = null,
  title = '',
  level = '',
  trackLabel = '',
}) {
  const [coverSource, setCoverSource] = useState(normalizeCoverSource(initialSource));
  const [presetKey, setPresetKey] = useState(normalizeCoverPresetKey(initialPresetKey));
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => () => {
    if (uploadPreviewUrl) {
      URL.revokeObjectURL(uploadPreviewUrl);
    }
  }, [uploadPreviewUrl]);

  const previewUrl = useMemo(() => {
    if (coverSource === 'upload' && uploadPreviewUrl) {
      return uploadPreviewUrl;
    }

    if (coverSource === 'upload' && existingImageUrl) {
      return existingImageUrl;
    }

    if (coverSource === 'preset') {
      return getCourseCoverPresetUrl({
        presetKey,
        title: title || 'New Course',
        level,
        trackLabel,
      });
    }

    return null;
  }, [coverSource, existingImageUrl, level, presetKey, title, trackLabel, uploadPreviewUrl]);

  async function handleFileChange(event) {
    const nextFile = event.target.files?.[0];

    setUploadError(null);

    if (uploadPreviewUrl) {
      URL.revokeObjectURL(uploadPreviewUrl);
      setUploadPreviewUrl(null);
    }

    if (!nextFile) {
      return;
    }

    if (!COURSE_COVER_ALLOWED_TYPES.includes(nextFile.type)) {
      setUploadError('Only WebP, JPEG, or PNG files are allowed.');
      event.target.value = '';
      return;
    }

    if (nextFile.size > COURSE_COVER_MAX_BYTES) {
      setUploadError('Cover image must be 500 KB or smaller.');
      event.target.value = '';
      return;
    }

    try {
      const { width, height, objectUrl } = await loadImageDimensions(nextFile);
      const ratio = width / height;

      if (width < COURSE_COVER_MIN_WIDTH || height < COURSE_COVER_MIN_HEIGHT) {
        URL.revokeObjectURL(objectUrl);
        setUploadError(`Image must be at least ${COURSE_COVER_MIN_WIDTH} x ${COURSE_COVER_MIN_HEIGHT}.`);
        event.target.value = '';
        return;
      }

      if (Math.abs(ratio - (16 / 9)) > 0.03) {
        URL.revokeObjectURL(objectUrl);
        setUploadError('Image must use a 16:9 ratio, such as 1280 x 720.');
        event.target.value = '';
        return;
      }

      setUploadPreviewUrl(objectUrl);
    } catch (error) {
      setUploadError(error.message || 'Unable to read the selected image.');
      event.target.value = '';
    }
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#fafafa' }}>
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>Course Cover</h3>
        <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
          Recommended size: {COURSE_COVER_RECOMMENDED_WIDTH} x {COURSE_COVER_RECOMMENDED_HEIGHT}. Minimum size: {COURSE_COVER_MIN_WIDTH} x {COURSE_COVER_MIN_HEIGHT}. Max file size: 500 KB.
        </p>
      </div>

      <input type="hidden" name="coverPresetKey" value={presetKey} />

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {[
          { key: 'upload', label: 'Upload cover' },
          { key: 'youtube', label: 'Use first YouTube thumbnail' },
          { key: 'preset', label: 'Use preset cover' },
        ].map((option) => (
          <label key={option.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '999px', border: '1px solid #d1d5db', backgroundColor: coverSource === option.key ? '#eef2ff' : '#ffffff', cursor: 'pointer' }}>
            <input
              type="radio"
              name="coverSource"
              value={option.key}
              checked={coverSource === option.key}
              onChange={() => setCoverSource(option.key)}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>{option.label}</span>
          </label>
        ))}
      </div>

      {coverSource === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input name="coverImage" type="file" accept="image/webp,image/jpeg,image/png" onChange={handleFileChange} />
          <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
            Accepted formats: WebP, JPEG, PNG. Please prepare a 16:9 image before uploading.
          </span>
          {uploadError && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '0.82rem' }}>
              {uploadError}
            </div>
          )}
        </div>
      )}

      {coverSource === 'preset' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <select
            value={presetKey}
            onChange={(event) => setPresetKey(normalizeCoverPresetKey(event.target.value))}
            style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: 'white' }}
          >
            {COURSE_COVER_PRESETS.map((preset) => (
              <option key={preset.key} value={preset.key}>{preset.label}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
            Preset covers keep the course grid visually consistent when you do not want to upload a custom image.
          </span>
        </div>
      )}

      {coverSource === 'youtube' && (
        <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
          The course card will automatically use the first attached YouTube video thumbnail. If no video is available yet, the preset fallback will be used.
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ width: '260px', aspectRatio: '16 / 9', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6' }}>
          {previewUrl ? (
            <img src={previewUrl} alt="Course cover preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: '#9ca3af', textAlign: 'center', padding: '16px' }}>
              The cover will be pulled from the first YouTube video after you attach lessons.
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: '220px', fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.7 }}>
          <div>Best practice:</div>
          <div>1. Upload a custom 1280 x 720 image for flagship courses.</div>
          <div>2. Use YouTube thumbnail fallback for fast setup.</div>
          <div>3. Use preset covers when you want visual consistency across a whole program.</div>
        </div>
      </div>
    </section>
  );
}
