import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { DatabaseService } from '@/lib/db';

export async function GET() {
  try {
    const user = await AuthService.requireUser();
    const stats = await DatabaseService.getDashboardStats();
    return NextResponse.json({ success: true, stats, user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch dashboard statistics';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

