import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { DatabaseService } from '@/lib/db';
import { generateExcelReport } from '@/lib/excel';

export async function GET(req: Request) {
  try {
    // Security: Only admins can download reports!
    const user = await AuthService.requireRole('admin');

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') as 'pending' | 'completed') || 'pending';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    if (type !== 'pending' && type !== 'completed') {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    const items = await DatabaseService.getReportItems({ type, startDate, endDate });

    const baseUrl = req.headers.get('host') ? `http://${req.headers.get('host')}` : '';
    const excelBuffer = await generateExcelReport(items, type, baseUrl);

    const dateSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${type === 'pending' ? 'Pending_to_Repair' : 'Completed_Repairs'}_${dateSuffix}.xlsx`;

    return new Response(excelBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Excel export failed';
    const status = message.includes('Forbidden') ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

