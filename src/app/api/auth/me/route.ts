import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function GET() {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user });
}

