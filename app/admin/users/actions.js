'use server';

import { revalidatePath } from 'next/cache';
import db from '@/api/_lib/db';
import { getAuthUser } from '@/app/lib/authSession';
import { MEMBERSHIP_TIER_OPTIONS, ensureUserMembershipSchema, getMembershipTierOption } from '@/app/lib/userMembership';

export async function updateUserMembership(formData) {
  const user = await getAuthUser();

  if (!user || user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' };
  }

  const userId = Number.parseInt(String(formData.get('userId') || ''), 10);
  const tierKey = getMembershipTierOption(formData.get('membershipTier')).key;

  if (!Number.isFinite(userId) || userId <= 0) {
    return { success: false, error: 'Invalid user id.' };
  }

  if (!MEMBERSHIP_TIER_OPTIONS.some((option) => option.key === tierKey)) {
    return { success: false, error: 'Invalid membership tier.' };
  }

  try {
    const sql = db.getSql();
    await ensureUserMembershipSchema(sql);

    await sql`
      UPDATE users
      SET membership_tier = ${tierKey},
          updated_at = NOW()
      WHERE id = ${userId}
    `;

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Update user membership error:', error);
    return { success: false, error: 'Failed to update membership tier.' };
  }
}
