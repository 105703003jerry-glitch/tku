import db from '@/api/_lib/db';
import Link from 'next/link';
import AdminShell from '../_components/AdminShell';
import UserMembershipForm from './UserMembershipForm';
import { ensureUserMembershipSchema, getMembershipTierOption } from '@/app/lib/userMembership';
import { formatTaipeiDate } from '@/app/lib/dateTime';

export default async function AdminUsersPage() {
  let usersList = [];
  let error = null;

  try {
    const sql = db.getSql();
    await ensureUserMembershipSchema(sql);
    usersList = await sql`
      SELECT id, name, email, nickname, role, membership_tier, created_at
      FROM users
      ORDER BY created_at DESC
    `;
  } catch (err) {
    console.error("Fetch Users Error:", err);
    error = "Failed to load system users from the database.";
  }

  return (
    <AdminShell activeMenu="users">
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>User Management</h1>
        <p style={{ color: '#6b7280' }}>Monitor registered accounts, system privileges, and each learner&apos;s 免費 / 付費身份。</p>
      </header>

      {error ? (
        <div style={{ padding: '16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>
          {error}
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '12px 24px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>ID</th>
                <th style={{ padding: '12px 24px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>USER ALIAS</th>
                <th style={{ padding: '12px 24px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>EMAIL</th>
                <th style={{ padding: '12px 24px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>ROLE</th>
                <th style={{ padding: '12px 24px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>MEMBERSHIP</th>
                <th style={{ padding: '12px 24px', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>JOINED</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((usr) => {
                const membership = getMembershipTierOption(usr.membership_tier);

                return (
                  <tr key={usr.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px 24px', fontSize: '0.9rem', color: '#6b7280' }}>#{usr.id}</td>
                    <td style={{ padding: '16px 24px', fontSize: '0.9rem', color: '#111827', fontWeight: 500 }}>
                      <Link href={`/admin/users/${usr.id}`} style={{ color: '#111827', textDecoration: 'none', fontWeight: 600 }}>
                        {usr.nickname || usr.name}
                      </Link>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.9rem', color: '#6b7280' }}>{usr.email}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '9999px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        backgroundColor: usr.role === 'admin' ? '#dbeafe' : '#f3f4f6',
                        color: usr.role === 'admin' ? '#1e40af' : '#4b5563'
                      }}>
                        {usr.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: membership.key === 'paid' ? '#fef3c7' : '#ecfeff',
                          color: membership.key === 'paid' ? '#92400e' : '#155e75'
                        }}>
                          {membership.labelZh}
                        </span>
                        <UserMembershipForm userId={usr.id} initialTier={membership.key} />
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.9rem', color: '#6b7280' }}>
                      {formatTaipeiDate(usr.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {usersList.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              No users found.
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
