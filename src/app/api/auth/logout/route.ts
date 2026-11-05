import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST() {
  await AuthService.clearSessionCookie();
  return NextResponse.json({ success: true });
}

