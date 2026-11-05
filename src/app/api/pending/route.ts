import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { DatabaseService } from '@/lib/db';

export async function GET(req: Request) {
  try {
    await AuthService.requireUser();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const pickup_date = searchParams.get('pickup_date') || undefined;

    const items = await DatabaseService.getPendingItems({ search, pickup_date });
    const distinctDates = await DatabaseService.getDistinctPickupDates();

    return NextResponse.json({
      success: true,
      items,
      distinctDates,
      totalCount: items.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch pending items';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

