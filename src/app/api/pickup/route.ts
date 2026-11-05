import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { DatabaseService } from '@/lib/db';

export async function POST(req: Request) {
  try {
    // Role check: Only technicians can create pickup batches
    const user = await AuthService.requireRole('technician');

    const body = await req.json();
    const { pickup_image_url, items, pickup_date, pickup_time } = body;

    if (!pickup_image_url || typeof pickup_image_url !== 'string') {
      return NextResponse.json(
        { error: 'A mandatory batch image showing all handed over phones is required.' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one phone model and repair reason must be added.' },
        { status: 400 }
      );
    }

    // Validate each phone item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.model_name || !item.model_name.trim()) {
        return NextResponse.json(
          { error: `Phone #${i + 1}: Model name is required.` },
          { status: 400 }
        );
      }
      if (!item.repair_reason || !item.repair_reason.trim()) {
        return NextResponse.json(
          { error: `Phone #${i + 1}: Repair reason is required.` },
          { status: 400 }
        );
      }
    }

    const result = await DatabaseService.createPickupBatch({
      pickup_image_url,
      technician_id: user.id,
      pickup_date,
      pickup_time,
      items: items.map((it: { model_name: string; repair_reason: string }) => ({
        model_name: it.model_name.trim(),
        repair_reason: it.repair_reason.trim(),
      })),
    });

    return NextResponse.json({
      success: true,
      batch: result.batch,
      items: result.items,
      message: `Successfully created pickup batch ${result.batch.id} with ${result.items.length} phones.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Pickup submission failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

