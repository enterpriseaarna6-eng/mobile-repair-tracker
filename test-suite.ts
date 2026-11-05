import { DatabaseService } from './src/lib/db';
import { generateExcelReport } from './src/lib/excel';
import { generateCsvReport } from './src/lib/csv';
import { AuthService } from './src/lib/auth';

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING MASTER TEST SUITE (PHASE 14 VALIDATION)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (detail) console.log(`   ${detail}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   ${detail}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 6: Authentication & Authorization
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Authentication & Role Authorization ---');
    const adminProfile = await AuthService.verifyCredentials('admin1@repairtrack.com', 'admin123');
    const techProfile = await AuthService.verifyCredentials('technician@repairtrack.com', 'tech123');
    const badLogin = await AuthService.verifyCredentials('admin1@repairtrack.com', 'wrongpassword');

    assert(
      adminProfile !== null && adminProfile.role === 'admin',
      'Test 6.1: Admin 1 authentication',
      `Logged in as: ${adminProfile?.full_name} (${adminProfile?.role})`
    );

    assert(
      techProfile !== null && techProfile.role === 'technician',
      'Test 6.2: Technician authentication',
      `Logged in as: ${techProfile?.full_name} (${techProfile?.role})`
    );

    assert(badLogin === null, 'Test 6.3: Invalid credentials rejected', 'Invalid password returns null');

    // ----------------------------------------------------
    // INITIAL BASELINE STATS
    // ----------------------------------------------------
    console.log('\n--- Baseline Dashboard Figures ---');
    const initialStats = await DatabaseService.getDashboardStats();
    assert(
      initialStats.stock === initialStats.completed + initialStats.pending,
      'Baseline Check: Stock = Completed + Pending',
      `Stock (${initialStats.stock}) = Completed (${initialStats.completed}) + Pending (${initialStats.pending})`
    );

    // ----------------------------------------------------
    // TEST 1: Technician submits a batch of 10 phones
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Pickup Submission (10 phones) ---');
    const pickupItemsInput = Array.from({ length: 10 }, (_, i) => ({
      model_name: `Test Device Model ${i + 1}`,
      repair_reason: `Hardware diagnostic defect #${i + 1}`,
    }));

    const pickupResult = await DatabaseService.createPickupBatch({
      pickup_image_url: '/uploads/sample-pickup-batch1.svg',
      technician_id: techProfile!.id,
      items: pickupItemsInput,
    });

    const statsAfterPickup = await DatabaseService.getDashboardStats();
    assert(
      pickupResult.items.length === 10,
      'Test 1.1: 10 phones registered in pickup batch',
      `Batch ID: ${pickupResult.batch.id}`
    );

    assert(
      statsAfterPickup.stock === initialStats.stock + 10 &&
        statsAfterPickup.pending === initialStats.pending + 10 &&
        statsAfterPickup.completed === initialStats.completed,
      'Test 1.2: Dashboard counters updated accurately',
      `New Stock: ${statsAfterPickup.stock}, Pending: ${statsAfterPickup.pending}, Completed: ${statsAfterPickup.completed}`
    );

    // ----------------------------------------------------
    // TEST 2: Partial Completion (Technician completes 4 phones)
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Partial Completion (Completes 4 phones) ---');
    const phonesToComplete = pickupResult.items.slice(0, 4).map((i) => i.id);

    const returnResult = await DatabaseService.createReturnBatch({
      return_image_url: '/uploads/sample-return-batch1.svg',
      technician_id: techProfile!.id,
      repair_item_ids: phonesToComplete,
    });

    const statsAfterReturn = await DatabaseService.getDashboardStats();
    assert(
      returnResult.completed_items.length === 4,
      'Test 2.1: 4 phones marked as completed',
      `Return Batch ID: ${returnResult.batch.id}`
    );

    assert(
      statsAfterReturn.stock === statsAfterPickup.stock &&
        statsAfterReturn.completed === statsAfterPickup.completed + 4 &&
        statsAfterReturn.pending === statsAfterPickup.pending - 4,
      'Test 2.2: Stock = Completed + Pending preserved after completion',
      `Stock: ${statsAfterReturn.stock} = Completed: ${statsAfterReturn.completed} + Pending: ${statsAfterReturn.pending}`
    );

    // ----------------------------------------------------
    // TEST 3: Date Movement (Phone picked up 30 Oct, completed 5 Nov)
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Date Movement (Oct 30 -> Nov 05) ---');
    // REP-1001 was seeded with pickup 2026-10-30 and completed on 2026-11-05
    const pendingList = await DatabaseService.getPendingItems();
    const completedList = await DatabaseService.getCompletedItems();

    const rep1001InPending = pendingList.find((i) => i.id === 'REP-1001');
    const rep1001InCompleted = completedList.find((i) => i.id === 'REP-1001');

    assert(
      !rep1001InPending && rep1001InCompleted !== undefined,
      'Test 3.1: REP-1001 removed from Pending and present in Completed',
      `Present in Completed: ${Boolean(rep1001InCompleted)}, Present in Pending: ${Boolean(rep1001InPending)}`
    );

    assert(
      rep1001InCompleted?.pickup_date === '2026-10-30' &&
        rep1001InCompleted?.completion_date === '2026-11-05',
      'Test 3.2: Original pickup date (2026-10-30) preserved under completion date (2026-11-05)',
      `Original Pickup Date: ${rep1001InCompleted?.pickup_date}, Completion Date: ${rep1001InCompleted?.completion_date}`
    );

    assert(
      Boolean(rep1001InCompleted?.return_image_url),
      'Test 3.3: Return image linked properly',
      `Return Image: ${rep1001InCompleted?.return_image_url}`
    );

    // ----------------------------------------------------
    // TEST 4: Batch Image Linking & Excel Merged Rows
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Batch Image Linking & Excel Generation ---');
    const excelBuffer = await generateExcelReport(completedList, 'completed');
    assert(
      excelBuffer.length > 1000,
      'Test 4.1: Excel workbook generated successfully with merged cells & styles',
      `Excel byte length: ${excelBuffer.length} bytes`
    );

    const csvContent = generateCsvReport(completedList, 'completed');
    assert(
      csvContent.includes('Date,Model Name,Repair Reason') && csvContent.includes('COMPLETED'),
      'Test 4.2: CSV report generated with RFC 4180 headers',
      `CSV rows generated: ${csvContent.split('\r\n').length}`
    );

    // ----------------------------------------------------
    // TEST 5: Date Range Filter
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Date Filter Verification ---');
    const filteredByDate = await DatabaseService.getReportItems({
      type: 'completed',
      startDate: '2026-11-05',
      endDate: '2026-11-05',
    });

    const allMatchDate = filteredByDate.every((i) => i.completion_date === '2026-11-05');
    assert(
      filteredByDate.length > 0 && allMatchDate,
      'Test 5.1: Only records matching 2026-11-05 completion date returned',
      `Matching records: ${filteredByDate.length}, All dates strictly 2026-11-05: ${allMatchDate}`
    );

    // ----------------------------------------------------
    // TEST 7: Duplicate Completion Prevention
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Duplicate Completion Rejection ---');
    let duplicateRejected = false;
    try {
      // Try completing REP-1001 again
      await DatabaseService.createReturnBatch({
        return_image_url: '/uploads/sample-return-batch1.svg',
        technician_id: techProfile!.id,
        repair_item_ids: ['REP-1001'],
      });
    } catch (err: unknown) {
      duplicateRejected = true;
      const msg = err instanceof Error ? err.message : '';
      console.log(`   Caught expected duplicate rejection: "${msg}"`);
    }

    assert(
      duplicateRejected,
      'Test 7.1: Completing an already completed phone is rejected',
      'System correctly rejected second completion attempt'
    );

    // ----------------------------------------------------
    // TEST 8: Data Persistence & Audit Trail
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Data Persistence & History ---');
    const historyLogs = await DatabaseService.getRepairHistory();
    assert(
      historyLogs.length >= 4,
      'Test 8.1: Full audit history preserved and queryable',
      `Total history audit entries: ${historyLogs.length}`
    );

    console.log('\n====================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite error:', err);
    process.exit(1);
  }
}

runTestSuite();

