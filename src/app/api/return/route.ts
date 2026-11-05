import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { DatabaseService } from '@/lib/db';

export async function POST(req: Request) {
  try {
    // Role check: Only technicians can submit return batches
    const user = await AuthService.requireRole('technician');

    const body = await req.json();
    const { return_image_url, repair_item_ids, items } = body;

    if (!return_image_url || typeof return_image_url !== 'string') {
      return NextResponse.json(
        { error: 'A mandatory return batch image showing all returned phones together is required.' },
        { status: 400 }
      );
    }

    const hasIds = Array.isArray(repair_item_ids) && repair_item_ids.length > 0;
    const hasItems = Array.isArray(items) && items.length > 0;

    if (!hasIds && !hasItems) {
      return NextResponse.json(
        { error: 'Please add at least one phone with Model Name and Pickup Date to return.' },
        { status: 400 }
      );
    }

    const result = await DatabaseService.createReturnBatch({
      return_image_url,
      technician_id: user.id,
      repair_item_ids: hasIds ? repair_item_ids : undefined,
      items: hasItems ? items : undefined,
    });

    return NextResponse.json({
      success: true,
      batch: result.batch,
      completed_items: result.completed_items,
      message: `Successfully completed and returned ${result.completed_items.length} phone(s) under batch ${result.batch.id}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Return completion failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
