import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { DatabaseService } from '@/lib/db';

export async function GET() {
  try {
    await AuthService.requireUser();
    const history = await DatabaseService.getRepairHistory();
    return NextResponse.json({ success: true, history });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch history';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

