import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { DatabaseService } from '@/lib/db';

export async function GET(req: Request) {
  try {
    await AuthService.requireUser();
    const { searchParams } = new URL(req.url);
    const model_name = searchParams.get('model_name') || undefined;
    const pickup_date = searchParams.get('pickup_date') || undefined;

    const matches = await DatabaseService.searchPendingForReturn({
      model_name,
      pickup_date,
    });

    const summary = await DatabaseService.getPendingModelsSummary();

    return NextResponse.json({
      success: true,
      matches,
      count: matches.length,
      pendingModels: summary.models,
      pendingDates: summary.dates,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lookup failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
