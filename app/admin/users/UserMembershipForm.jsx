'use client';

import { useState, useTransition } from 'react';
import { MEMBERSHIP_TIER_OPTIONS } from '@/app/lib/userMembership';
import { updateUserMembership } from './actions';

export default function UserMembershipForm({ userId, initialTier }) {
  const [membershipTier, setMembershipTier] = useState(initialTier);
  const [feedback, setFeedback] = useState(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.set('userId', String(userId));
    formData.set('membershipTier', membershipTier);

    startTransition(async () => {
      setFeedback(null);
      const result = await updateUserMembership(formData);
      setFeedback(result.success ? 'updated' : (result.error || 'error'));
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <select
        value={membershipTier}
        onChange={(event) => setMembershipTier(event.target.value)}
        disabled={isPending}
        style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: 'white', fontSize: '0.82rem', color: '#111827' }}
      >
        {MEMBERSHIP_TIER_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>{option.labelZh}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: isPending ? '#f3f4f6' : '#ffffff', color: '#111827', fontSize: '0.8rem', fontWeight: 600, cursor: isPending ? 'progress' : 'pointer' }}
      >
        {isPending ? 'Saving...' : 'Save'}
      </button>
      {feedback === 'updated' && (
        <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>Saved</span>
      )}
      {feedback && feedback !== 'updated' && (
        <span style={{ fontSize: '0.78rem', color: '#b91c1c', fontWeight: 600 }}>{feedback}</span>
      )}
    </form>
  );
}
