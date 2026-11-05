import ExcelJS from 'exceljs';
import { RepairItem } from './types';
import { StorageService } from './storage';

export async function generateExcelReport(
  items: RepairItem[],
  type: 'pending' | 'completed',
  baseUrl: string = ''
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mobile Repair Tracking System';
  workbook.lastModifiedBy = 'Admin System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const title = type === 'pending' ? 'Pending to Repair Report' : 'Completed Repairs Report';
  const worksheet = workbook.addWorksheet(title, {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 2 }],
  });

  // Title Row (Row 1)
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `${title.toUpperCase()} (Generated on ${new Date().toLocaleDateString('en-IN')})`;
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: type === 'pending' ? 'FFD97706' : 'FF065F46' }, // Amber for pending, Emerald for completed
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 36;

  // Header Row (Row 2)
  const headers = [
    { header: type === 'pending' ? 'Pickup Date' : 'Completion Date', key: 'reportDate', width: 18 },
    { header: 'Model Name', key: 'model_name', width: 26 },
    { header: 'Repair Reason', key: 'repair_reason', width: 36 },
    { header: type === 'pending' ? 'Pickup Batch Image' : 'Return Batch Image', key: 'image', width: 25 },
    { header: 'Original Pickup Date', key: 'original_pickup_date', width: 22 },
    { header: 'Repair Item ID', key: 'item_id', width: 18 },
    { header: 'Status', key: 'status', width: 16 },
  ];

  const headerRow = worksheet.getRow(2);
  headerRow.height = 28;
  headers.forEach((h, index) => {
    const colNumber = index + 1;
    worksheet.getColumn(colNumber).width = h.width;
    const cell = headerRow.getCell(colNumber);
    cell.value = h.header;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }, // Slate 900
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  if (items.length === 0) {
    const emptyRow = worksheet.getRow(3);
    emptyRow.height = 30;
    worksheet.mergeCells('A3:G3');
    const emptyCell = emptyRow.getCell(1);
    emptyCell.value = 'No records found for the selected criteria.';
    emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
    emptyCell.font = { italic: true, color: { argb: 'FF64748B' } };
    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  // Group items by Report Date, then by Batch ID to allow vertical cell merging
  // We determine startRow and endRow for Date groups and Batch groups
  let currentRow = 3;

  // We need to track groups
  interface RowData {
    item: RepairItem;
    rowNumber: number;
    reportDate: string;
    batchId: string;
    imageUrl: string;
  }

  const rowDataList: RowData[] = [];

  for (const item of items) {
    const reportDate = type === 'pending' ? item.pickup_date : item.completion_date || item.pickup_date;
    const batchId = type === 'pending' ? item.pickup_batch_id : item.return_batch_id || item.pickup_batch_id;
    const imageUrl = type === 'pending' ? item.pickup_image_url || '' : item.return_image_url || item.pickup_image_url || '';

    rowDataList.push({
      item,
      rowNumber: currentRow,
      reportDate,
      batchId,
      imageUrl,
    });
    currentRow++;
  }

  // Populate data rows
  for (const rd of rowDataList) {
    const row = worksheet.getRow(rd.rowNumber);
    row.height = 55; // Generous height for readability and thumbnail space

    // 1. Date
    const c1 = row.getCell(1);
    c1.value = rd.reportDate;
    c1.alignment = { vertical: 'middle', horizontal: 'center' };
    c1.font = { bold: true };

    // 2. Model Name
    const c2 = row.getCell(2);
    c2.value = rd.item.model_name;
    c2.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    c2.font = { bold: true, color: { argb: 'FF0F172A' } };

    // 3. Repair Reason
    const c3 = row.getCell(3);
    c3.value = rd.item.repair_reason;
    c3.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    // 4. Batch Image URL / text
    const c4 = row.getCell(4);
    let fullUrl = rd.imageUrl;
    if (fullUrl && fullUrl.startsWith('/') && baseUrl) {
      fullUrl = `${baseUrl}${fullUrl}`;
    }
    if (fullUrl) {
      c4.value = {
        text: `View Batch Image (${rd.batchId})`,
        hyperlink: fullUrl,
      };
      c4.font = { underline: true, color: { argb: 'FF0284C7' } };
    } else {
      c4.value = `Batch: ${rd.batchId}`;
    }
    c4.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    // 5. Original Pickup Date
    const c5 = row.getCell(5);
    c5.value = rd.item.pickup_date;
    c5.alignment = { vertical: 'middle', horizontal: 'center' };

    // 6. Repair Item ID
    const c6 = row.getCell(6);
    c6.value = rd.item.id;
    c6.alignment = { vertical: 'middle', horizontal: 'center' };
    c6.font = { name: 'Courier New', bold: true };

    // 7. Status
    const c7 = row.getCell(7);
    c7.value = rd.item.status.toUpperCase();
    c7.alignment = { vertical: 'middle', horizontal: 'center' };
    c7.font = {
      bold: true,
      color: { argb: rd.item.status === 'completed' ? 'FF059669' : 'FFD97706' },
    };

    // Standard cell borders
    for (let c = 1; c <= 7; c++) {
      row.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }
  }

  // --- VERTICAL MERGING & BORDER LOGIC ---
  // A. Merge Date cells vertically for records belonging to the same date group
  let dateStartIdx = 0;
  while (dateStartIdx < rowDataList.length) {
    let dateEndIdx = dateStartIdx;
    while (
      dateEndIdx + 1 < rowDataList.length &&
      rowDataList[dateEndIdx + 1].reportDate === rowDataList[dateStartIdx].reportDate
    ) {
      dateEndIdx++;
    }

    if (dateEndIdx > dateStartIdx) {
      const startR = rowDataList[dateStartIdx].rowNumber;
      const endR = rowDataList[dateEndIdx].rowNumber;
      worksheet.mergeCells(`A${startR}:A${endR}`);
      const mergedCell = worksheet.getCell(`A${startR}`);
      mergedCell.alignment = { vertical: 'middle', horizontal: 'center' };
      mergedCell.font = { size: 11, bold: true, color: { argb: 'FF0F172A' } };
      mergedCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }, // Light slate tint for grouped date
      };
    }

    // Heavy black bottom border separating different date groups!
    const lastRowOfDate = worksheet.getRow(rowDataList[dateEndIdx].rowNumber);
    for (let c = 1; c <= 7; c++) {
      const existingBorder = lastRowOfDate.getCell(c).border || {};
      lastRowOfDate.getCell(c).border = {
        ...existingBorder,
        bottom: { style: 'medium', color: { argb: 'FF000000' } }, // Black border line
      };
    }

    dateStartIdx = dateEndIdx + 1;
  }

  // B. Merge Batch Image cells vertically for phones belonging to the same batch
  let batchStartIdx = 0;
  while (batchStartIdx < rowDataList.length) {
    let batchEndIdx = batchStartIdx;
    while (
      batchEndIdx + 1 < rowDataList.length &&
      rowDataList[batchEndIdx + 1].batchId === rowDataList[batchStartIdx].batchId
    ) {
      batchEndIdx++;
    }

    if (batchEndIdx > batchStartIdx) {
      const startR = rowDataList[batchStartIdx].rowNumber;
      const endR = rowDataList[batchEndIdx].rowNumber;
      worksheet.mergeCells(`D${startR}:D${endR}`);
      const mergedImgCell = worksheet.getCell(`D${startR}`);
      mergedImgCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    }

    batchStartIdx = batchEndIdx + 1;
  }

  // Try embedding image thumbnail in the worksheet if possible
  // We embed unique batch images into worksheet
  const seenBatches = new Set<string>();
  for (const rd of rowDataList) {
    if (!seenBatches.has(rd.batchId) && rd.imageUrl) {
      seenBatches.add(rd.batchId);
      const imageInfo = await StorageService.getImageBuffer(rd.imageUrl);
      if (imageInfo) {
        try {
          const imgId = workbook.addImage({
            buffer: imageInfo.buffer as unknown as ArrayBuffer,
            extension: imageInfo.extension,
          });

          // Embed thumbnail over column D
          worksheet.addImage(imgId, {
            tl: { col: 3.1, row: rd.rowNumber - 0.9 },
            ext: { width: 45, height: 45 },
            editAs: 'oneCell',
          });
        } catch {
          // Gracefully continue with hyperlinks if embedding fails
        }
      }
    }
  }

  const uint8Array = await workbook.xlsx.writeBuffer();
  return Buffer.from(uint8Array);
}

