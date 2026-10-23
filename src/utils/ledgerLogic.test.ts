import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_RECEIPTS } from '../seedData';
import {
  calculateLedgerMetrics,
  detectDuplicate,
  answerSpendingQuestion,
  generateConfirmedCSV,
  formatINR,
  dateToSlashFormat,
  slashFormatToDate,
  validateReceiptFinancials,
  buildPartialDraftFromReceipt,
  parseMessyLanguageBillCommand,
} from './ledgerLogic';
import { Receipt } from '../types';

test('calculateLedgerMetrics computes exact initial totals from confirmed seed records only', () => {
  const metrics = calculateLedgerMetrics(SEED_RECEIPTS);

  // 6 confirmed receipts: 2450 + 3120 + 865 + 1640 + 1800 + 2300 = 12175
  assert.equal(metrics.confirmedCount, 6);
  assert.equal(metrics.needsReviewCount, 1);
  assert.equal(metrics.duplicateCount, 1);
  assert.equal(metrics.totalSpend, 12175);
  assert.equal(metrics.totalCost, 12175);
  assert.equal(metrics.totalRevenue, 32400);
  assert.equal(metrics.totalProfit, 32400 - 12175);
  assert.equal(metrics.financialSeries.length, 4);
  assert.equal(Math.round(metrics.averageReceipt), 2029);
  assert.equal(metrics.reviewBadgeCount, 7);
  assert.equal(metrics.storyReviewedCount, 7);
  assert.equal(metrics.storyNeedsAttentionCount, 3);
  assert.equal(metrics.storyProgressPercent, 35);

  // Top category: Utilities ₹3,120 · 25.6%
  assert.ok(metrics.topCategory);
  assert.equal(metrics.topCategory.category, 'Utilities');
  assert.equal(metrics.topCategory.amount, 3120);
  assert.equal(metrics.topCategory.percentage, 25.6);

  // Check all 6 category percentages sorted high to low
  const expectedOrder = [
    { category: 'Utilities', amount: 3120, percentage: 25.6 },
    { category: 'Supplies & Stock', amount: 2450, percentage: 20.1 },
    { category: 'Marketing', amount: 2300, percentage: 18.9 },
    { category: 'Transport', amount: 1800, percentage: 14.8 },
    { category: 'Packaging', amount: 1640, percentage: 13.5 },
    { category: 'Office', amount: 865, percentage: 7.1 },
  ];

  assert.deepEqual(
    metrics.categoryBreakdown.map(({ category, amount, percentage }) => ({
      category,
      amount,
      percentage,
    })),
    expectedOrder
  );
});

test('confirming an unreviewed receipt updates totals, badge count, and percentages live', () => {
  const updated: Receipt[] = SEED_RECEIPTS.map((r) =>
    r.id === 'R-0108' ? { ...r, status: 'confirmed' as const } : r
  );
  const metrics = calculateLedgerMetrics(updated);

  assert.equal(metrics.confirmedCount, 7);
  assert.equal(metrics.totalSpend, 12175 + 410);
  assert.equal(metrics.reviewBadgeCount, 6);
  assert.equal(metrics.storyReviewedCount, 8);
  assert.equal(metrics.storyNeedsAttentionCount, 2);
});

test('detectDuplicate flags same vendor + same total + same/unclear date', () => {
  const r0107 = SEED_RECEIPTS.find((r) => r.id === 'R-0107')!;
  const result = detectDuplicate(r0107, SEED_RECEIPTS);
  assert.equal(result.isDuplicate, true);
  assert.equal(result.matchedId, 'R-0112');

  const newDup: Receipt = {
    ...SEED_RECEIPTS[0],
    id: 'R-0199',
    date: '0? Oct 2026',
  };
  const dupResult = detectDuplicate(newDup, SEED_RECEIPTS);
  assert.equal(dupResult.isDuplicate, true);
  assert.equal(dupResult.matchedId, 'R-0101');
});

test('answerSpendingQuestion sums confirmed records only and warns about unconfirmed', () => {
  const res = answerSpendingQuestion('How much did I spend on transport?', SEED_RECEIPTS);
  assert.equal(
    res.text,
    'You spent ₹1,800.00 on Transport this month, from 1 confirmed receipt (Sunrise Fuel, 09 Oct). The R-0108 courier receipt is still unreviewed, so it is not counted.'
  );
  assert.deepEqual(res.sources, ['R-0105']);

  const unknown = answerSpendingQuestion('How much did I spend on flights to Mars?', SEED_RECEIPTS);
  assert.equal(unknown.text, 'That is not in your confirmed records.');
  assert.deepEqual(unknown.sources, []);
});

test('formatINR and date conversions work accurately', () => {
  assert.equal(formatINR(12175), '₹12,175.00');
  assert.equal(formatINR(12175, false), '₹12,175');
  assert.equal(dateToSlashFormat('2? Oct 2026'), '2?/10/2026');
  assert.equal(slashFormatToDate('20/10/2026'), '20 Oct 2026');

  const csv = generateConfirmedCSV(SEED_RECEIPTS);
  const lines = csv.split('\n');
  assert.equal(lines.length, 7); // 1 header + 6 confirmed rows
  assert.ok(!csv.includes('City Courier')); // R-0108 is needs_review
});

test('validateReceiptFinancials checks clothing supplier invoice arithmetic', () => {
  // Clear clothing invoice with line items matching total
  const validInvoice = {
    vendor: 'Surat Silk Mills',
    date: '15 Oct 2026',
    subtotal: 10000,
    tax: 500, // 5% GST
    total: 10500,
    items: [
      { name: 'Pure Cotton Fabric (50m)', amount: 6000 },
      { name: 'Chanderi Silk Thans (2 pcs)', amount: 4000 },
    ],
    currency: 'INR',
  };

  const result = validateReceiptFinancials(validInvoice);
  assert.equal(result.status, 'verified');
  assert.equal(result.isCriticalError, false);
  assert.equal(result.lineItemsSum, 10000);
});

test('validateReceiptFinancials flags subtotal/tax/total arithmetic mismatch', () => {
  // Mismatch: 5000 + 3000 = 8000 line items, but subtotal is 7000 and total is 9000
  const mismatchInvoice = {
    vendor: 'Fabrics Wholesale',
    date: '18 Oct 2026',
    subtotal: 7000,
    tax: 500,
    total: 9000, // Expected 7500 or 8500
    items: [
      { name: 'Linen Material', amount: 5000 },
      { name: 'Cotton Lining', amount: 3000 },
    ],
    currency: 'INR',
  };

  const result = validateReceiptFinancials(mismatchInvoice);
  assert.equal(result.status, 'mismatch');
  assert.ok(result.warnings.length > 0);
  assert.ok(result.warnings.some((w) => w.includes('differs from')));
});

test('validateReceiptFinancials flags missing vendor or date as critical errors', () => {
  const missingVendor = {
    vendor: '',
    date: '20 Oct 2026',
    total: 1200,
    items: [{ name: 'Stitching Threads', amount: 1200 }],
  };

  const res1 = validateReceiptFinancials(missingVendor);
  assert.equal(res1.isCriticalError, true);
  assert.ok(res1.warnings.some((w) => w.includes('Vendor name is missing')));

  const missingDate = {
    vendor: 'Tailor Supplies Co',
    date: '',
    total: 1200,
    items: [{ name: 'Zippers', amount: 1200 }],
  };

  const res2 = validateReceiptFinancials(missingDate);
  assert.equal(res2.isCriticalError, true);
  assert.ok(res2.warnings.some((w) => w.includes('Receipt date is missing')));
});

test('validateReceiptFinancials returns insufficient_info when receipt has no breakdown', () => {
  const noBreakdown = {
    vendor: 'Fast Delivery Courier',
    date: '19 Oct 2026',
    total: 350,
    items: [],
  };

  const result = validateReceiptFinancials(noBreakdown);
  assert.equal(result.status, 'insufficient_info');
  assert.ok(result.message.includes('Unable to verify'));
});

test('detectDuplicate catches case-insensitive, punctuation, and currency differences', () => {
  const existing: Receipt[] = [
    {
      id: 'R-0050',
      vendor: 'Shree Balaji Fabrics Pvt. Ltd.',
      date: '12 Oct 2026',
      category: 'Supplies & Stock',
      items: [{ name: 'Cotton roll', amount: 5400 }],
      total: 5400,
      currency: 'INR',
      status: 'confirmed',
      unclearFields: [],
      fileName: 'balaji_01.jpg',
    },
  ];

  const candidate = {
    id: 'R-0200',
    vendor: 'shree balaji fabrics pvt ltd', // lowercase, no period
    date: '12 Oct 2026',
    total: 5400.0,
    currency: 'INR',
  };

  const result = detectDuplicate(candidate, existing);
  assert.equal(result.isDuplicate, true);
  assert.equal(result.matchedId, 'R-0050');
  assert.ok(result.matchDetails?.reason.includes('same vendor'));
});

test('parseMessyLanguageBillCommand extracts handwritten notes (Name, Price, Date) and messy Hinglish bills', () => {
  const completeNote = parseMessyLanguageBillCommand(
    'Raju Milk 850 23 Oct 2026',
    SEED_RECEIPTS,
    true
  );
  assert.equal(completeNote.isAddCommand, true);
  assert.ok(completeNote.createdReceipt);
  assert.equal(completeNote.createdReceipt.total, 850);
  assert.equal(completeNote.createdReceipt.date, '23 Oct 2026');

  const partialMessy = parseMessyLanguageBillCommand(
    'add bill Verma Kirana without amount',
    SEED_RECEIPTS
  );
  assert.equal(partialMessy.isAddCommand, true);
  assert.equal(partialMessy.createdReceipt, undefined);
  assert.ok(partialMessy.draft);
  assert.equal(partialMessy.draft.vendor, 'Verma Wholesale Kirana');
  assert.ok(partialMessy.draft.missingFields.includes('amount'));
  assert.ok(partialMessy.draft.recognizedFields.includes('vendor'));
});

test('buildPartialDraftFromReceipt flags only unrecognized fields and preserves recognized ones', () => {
  const tornReceipt: Receipt = {
    id: 'R-0120',
    vendor: 'Apna Kirana Wholesaler',
    date: '25 Oct 2026',
    category: 'Supplies & Stock',
    items: [{ name: 'Basmati Rice 25kg', amount: 0 }],
    total: 0,
    status: 'needs_review',
    unclearFields: ['total'],
    fileName: 'torn_bill.jpg',
  };

  const draft = buildPartialDraftFromReceipt(tornReceipt);
  assert.ok(draft);
  assert.deepEqual(draft.missingFields, ['amount']);
  assert.ok(draft.recognizedFields.includes('vendor'));
  assert.ok(draft.recognizedFields.includes('date'));
  assert.equal(draft.vendor, 'Apna Kirana Wholesaler');
  assert.equal(draft.date, '25 Oct 2026');
  assert.equal(draft.amount, '');
});

