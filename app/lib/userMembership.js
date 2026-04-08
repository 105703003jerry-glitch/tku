export const MEMBERSHIP_TIER_OPTIONS = [
  { key: 'free', labelZh: '免費學員' },
  { key: 'paid', labelZh: '付費學員' },
];

export function getMembershipTierOption(tierKey) {
  const normalizedKey = String(tierKey || '').trim().toLowerCase();
  return MEMBERSHIP_TIER_OPTIONS.find((option) => option.key === normalizedKey) || MEMBERSHIP_TIER_OPTIONS[0];
}

export async function ensureUserMembershipSchema(sql) {
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS membership_tier VARCHAR(20) NOT NULL DEFAULT 'free'
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS users_membership_tier_idx
    ON users (membership_tier)
  `;
  await sql`
    UPDATE users
    SET membership_tier = 'free'
    WHERE membership_tier IS NULL OR membership_tier = ''
  `;
}
