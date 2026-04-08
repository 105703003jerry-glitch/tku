'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';

export default function SaveCourseButton() {
  const { pending } = useFormStatus();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="submit"
      disabled={pending}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '10px 20px',
        backgroundColor: pending ? '#374151' : (isHovered ? '#1f2937' : '#111827'),
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: pending ? 'progress' : 'pointer',
        fontWeight: 600,
        transition: 'background-color 140ms ease, transform 140ms ease',
        transform: isHovered && !pending ? 'translateY(-1px)' : 'translateY(0)',
        opacity: pending ? 0.88 : 1,
      }}
    >
      {pending ? 'Saving...' : 'Save Changes'}
    </button>
  );
}
