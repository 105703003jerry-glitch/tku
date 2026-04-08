'use server';
import { clearAuthSession } from '../lib/authSession';
import { redirect } from 'next/navigation';

export async function performLogout() {
  await clearAuthSession();
  redirect('/login');
}
