import { RepairItem } from './types';

/**
 * Escapes a cell value according to RFC 4180 CSV standard
 */
function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates CSV content from repair items
 * Format:
 * 1. Date (Pickup Date for pending, Completion Date for completed)
 * 2. Model Name
 * 3. Repair Reason
 * 4. Image URL
 * 5. Original Pickup Date
 * 6. Repair Item ID
 * 7. Status
 */
export function generateCsvReport(
  items: RepairItem[],
  type: 'pending' | 'completed',
  baseUrl: string = ''
): string {
  // Exactly the 4 columns specified: Date, Model, Reason, Image
  const headers = [
    type === 'pending' ? 'Pickup Date' : 'Completion Date',
    'Model Name',
    'Repair Reason',
    'Batch Image URL',
  ];

  const rows: string[] = [headers.map(escapeCsvValue).join(',')];

  for (const item of items) {
    const reportDate = type === 'pending' ? item.pickup_date : item.completion_date || item.pickup_date;
    const rawImageUrl = type === 'pending' ? item.pickup_image_url : item.return_image_url || item.pickup_image_url;

    // Build absolute URL if relative
    let fullImageUrl = rawImageUrl || '';
    if (fullImageUrl && fullImageUrl.startsWith('/') && baseUrl) {
      fullImageUrl = `${baseUrl}${fullImageUrl}`;
    }

    const row = [
      reportDate,
      item.model_name,
      item.repair_reason,
      fullImageUrl,
    ];

    rows.push(row.map(escapeCsvValue).join(','));
  }

  // Prepend UTF-8 BOM so Excel opens it with correct encoding
  return '\uFEFF' + rows.join('\r\n');
}
