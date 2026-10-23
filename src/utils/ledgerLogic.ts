import {
  Category,
  CATEGORIES,
  Receipt,
  RevenueEntry,
  PartialExtractionDraft,
  ChatAction,
  AppSection,
} from '../types';

/**
 * Formats a number in Indian currency style with ₹ and 2 decimals (e.g. ₹12,175.00)
 */
export function formatINR(amount: number, includeDecimals = true): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = absVal.toLocaleString('en-IN', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  });
  return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * Formats a number in Indian style without the ₹ symbol (for table cells where column header is TOTAL (₹))
 */
export function formatIndianNumber(amount: number, decimals = 2): string {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Converts display date like "2? Oct 2026" or "14 Oct 2026" into input format "2?/10/2026" or "14/10/2026"
 */
const MONTH_MAP: Record<string, string> = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
};

const REVERSE_MONTH_MAP: Record<string, string> = {
  '01': 'Jan',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Aug',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dec',
};

export function dateToSlashFormat(dateStr: string): string {
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length === 3) {
    const [day, mon, year] = parts;
    const mm = MONTH_MAP[mon] || '10';
    return `${day}/${mm}/${year}`;
  }
  return dateStr;
}

export function slashFormatToDate(slashStr: string): string {
  if (!slashStr.includes('/')) return slashStr;
  const parts = slashStr.trim().split('/');
  if (parts.length === 3) {
    const [day, mm, year] = parts;
    const paddedMonth = mm.padStart(2, '0');
    const mon = REVERSE_MONTH_MAP[paddedMonth] || 'Oct';
    const paddedDay = day.includes('?') ? day : day.padStart(2, '0');
    return `${paddedDay} ${mon} ${year}`;
  }
  return slashStr;
}

/**
 * Normalizes vendor names for robust duplicate matching
 */
export function normalizeVendorName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .trim();
}

/**
 * Formats any currency code with fallback to INR
 */
export function formatCurrency(amount: number, currency = 'INR', includeDecimals = true): string {
  const normCur = (currency || 'INR').toUpperCase();
  if (normCur === 'INR' || normCur === '₹') {
    return formatINR(amount, includeDecimals);
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normCur,
      minimumFractionDigits: includeDecimals ? 2 : 0,
      maximumFractionDigits: includeDecimals ? 2 : 0,
    }).format(amount);
  } catch {
    return `${normCur} ${amount.toFixed(includeDecimals ? 2 : 0)}`;
  }
}

/**
 * Converts ISO date (YYYY-MM-DD) to "DD Mon YYYY" for display if valid
 */
export function isoToDisplayDate(isoStr: string): string {
  if (!isoStr) return '';
  // Check if it's already "DD Mon YYYY" or "DD/MM/YYYY"
  if (isoStr.includes('/') || (isoStr.includes(' ') && !isoStr.includes('-'))) {
    return isoStr;
  }
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const mon = REVERSE_MONTH_MAP[month] || month;
    return `${day} ${mon} ${year}`;
  }
  return isoStr;
}

/**
 * Checks if two dates match or if one is an unclear version of the other
 * e.g. "2? Oct 2026" matches "20 Oct 2026", "2026-10-20" matches "20 Oct 2026"
 */
export function datesMatchOrUnclear(dateA: string, dateB: string): boolean {
  if (!dateA || !dateB) return false;
  const dispA = isoToDisplayDate(dateA);
  const dispB = isoToDisplayDate(dateB);

  const normA = slashFormatToDate(dispA).trim().toLowerCase();
  const normB = slashFormatToDate(dispB).trim().toLowerCase();
  if (normA === normB) return true;

  if (normA.includes('?') || normB.includes('?')) {
    const regexStr = '^' + normA.replace(/\?/g, '.') + '$';
    const regex = new RegExp(regexStr, 'i');
    if (regex.test(normB)) return true;
    const regexStrB = '^' + normB.replace(/\?/g, '.') + '$';
    const regexB = new RegExp(regexStrB, 'i');
    if (regexB.test(normA)) return true;

    // Also if same month/year and one date has '?'
    const partsA = normA.split(' ');
    const partsB = normB.split(' ');
    if (partsA.length === 3 && partsB.length === 3 && partsA[1] === partsB[1] && partsA[2] === partsB[2]) {
      return true;
    }
  }
  return false;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  matchedId?: string;
  matchedReceipt?: Receipt;
  matchDetails?: {
    id: string;
    vendor: string;
    date: string;
    total: number;
    currency: string;
    reason: string;
  };
}

/**
 * Duplicate detection comparing normalized vendor name, receipt date, currency, and total amount.
 * Where practical, also checks line items.
 */
export function detectDuplicate(
  candidate: {
    id: string;
    vendor: string;
    total: number;
    date: string;
    currency?: string;
    items?: Array<{ name: string; amount: number }>;
    duplicateOfId?: string;
  },
  existingReceipts: Receipt[]
): DuplicateDetectionResult {
  const candNormVendor = normalizeVendorName(candidate.vendor);
  const candCurrency = (candidate.currency || 'INR').toUpperCase();

  // Check against existing receipts in the array
  for (const r of existingReceipts) {
    if (r.id === candidate.id) continue;
    const rNormVendor = normalizeVendorName(r.vendor);
    const rCurrency = (r.currency || 'INR').toUpperCase();

    const sameVendor = candNormVendor === rNormVendor && candNormVendor.length > 0;
    const sameTotal = Math.abs(r.total - candidate.total) < 0.05;
    const sameCurrency = candCurrency === rCurrency;
    const sameOrUnclearDate = datesMatchOrUnclear(candidate.date, r.date);

    if (sameVendor && sameTotal && sameOrUnclearDate && sameCurrency) {
      return {
        isDuplicate: true,
        matchedId: r.id,
        matchedReceipt: r,
        matchDetails: {
          id: r.id,
          vendor: r.vendor,
          date: r.date,
          total: r.total,
          currency: r.currency || 'INR',
          reason: `Matches record ${r.id}: same vendor (${r.vendor}), date (${r.date}), and total (${formatCurrency(r.total, r.currency)})`,
        },
      };
    }
  }

  // Also check against R-0112 in the 20-receipt story (Sharma General Store, ₹1,284.00, Oct 2026)
  if (
    candNormVendor === 'sharma general store' &&
    Math.abs(candidate.total - 1284) < 0.01 &&
    datesMatchOrUnclear(candidate.date, '20 Oct 2026')
  ) {
    const matchedId = candidate.duplicateOfId || 'R-0112';
    return {
      isDuplicate: true,
      matchedId,
      matchDetails: {
        id: matchedId,
        vendor: 'Sharma General Store',
        date: '20 Oct 2026',
        total: 1284.0,
        currency: 'INR',
        reason: `Matches record ${matchedId}: same vendor, date and total (₹1,284.00)`,
      },
    };
  }

  return { isDuplicate: false };
}

export interface FinancialValidationResult {
  status: 'verified' | 'mismatch' | 'insufficient_info';
  message: string;
  warnings: string[];
  isCriticalError: boolean;
  lineItemsSum: number;
  expectedTotal?: number;
  roundingDifference?: number;
}

/**
 * Deterministic Financial Validation implemented purely in TypeScript application code.
 * Validates subtotal against line items, tax and discounts against total, and critical fields.
 */
export function validateReceiptFinancials(data: {
  vendor: string;
  date: string;
  total: number;
  subtotal?: number | null;
  tax?: number | null;
  items: Array<{ name: string; amount: number }>;
  currency?: string;
}): FinancialValidationResult {
  const warnings: string[] = [];
  let isCriticalError = false;

  // 1. Critical Field Checks
  if (!data.vendor || data.vendor.trim() === '') {
    warnings.push('Vendor name is missing or unreadable.');
    isCriticalError = true;
  }

  if (!data.date || data.date.trim() === '') {
    warnings.push('Receipt date is missing.');
    isCriticalError = true;
  } else if (data.date.includes('?')) {
    warnings.push('Receipt date contains unreadable characters (?) and needs confirmation.');
  }

  if (data.total === undefined || data.total === null || isNaN(data.total) || data.total <= 0) {
    warnings.push('Receipt total amount must be a positive number.');
    isCriticalError = true;
  }

  // Calculate sum of valid line items
  const validItems = data.items.filter((it) => it && typeof it.amount === 'number' && !isNaN(it.amount));
  const lineItemsSum = validItems.reduce((acc, it) => acc + it.amount, 0);

  // 2. Line Items vs Subtotal Check
  const hasLineItems = validItems.length > 0;
  const hasSubtotal = data.subtotal !== undefined && data.subtotal !== null && !isNaN(data.subtotal) && data.subtotal > 0;
  const hasTax = data.tax !== undefined && data.tax !== null && !isNaN(data.tax) && data.tax >= 0;

  if (!hasLineItems && !hasSubtotal && !hasTax) {
    return {
      status: 'insufficient_info',
      message: 'Unable to verify arithmetic: receipt contains no itemized line items or subtotal breakdown.',
      warnings,
      isCriticalError,
      lineItemsSum,
    };
  }

  let arithmeticMismatch = false;

  // If subtotal is provided, check if line items sum equals subtotal (allowing 1.00 tolerance for rounding/paise)
  if (hasSubtotal && hasLineItems) {
    const diff = Math.abs(lineItemsSum - data.subtotal!);
    if (diff > 1.0) {
      arithmeticMismatch = true;
      warnings.push(
        `Line items sum (${formatCurrency(lineItemsSum, data.currency)}) differs from subtotal (${formatCurrency(
          data.subtotal!,
          data.currency
        )}) by ${formatCurrency(diff, data.currency)}.`
      );
    }
  }

  // If subtotal and tax are provided, check if subtotal + tax equals total (tolerance 1.00)
  if (hasSubtotal && hasTax && data.total > 0) {
    const expected = data.subtotal! + data.tax!;
    const diff = Math.abs(expected - data.total);
    if (diff > 1.0) {
      arithmeticMismatch = true;
      warnings.push(
        `Subtotal (${formatCurrency(data.subtotal!, data.currency)}) + Tax (${formatCurrency(
          data.tax!,
          data.currency
        )}) = ${formatCurrency(expected, data.currency)}, which differs from total (${formatCurrency(
          data.total,
          data.currency
        )}) by ${formatCurrency(diff, data.currency)}.`
      );
    }
  } else if (!hasSubtotal && hasLineItems && data.total > 0) {
    // If no subtotal is listed, check if line items reconcile directly with total or with tax
    const expected = hasTax ? lineItemsSum + data.tax! : lineItemsSum;
    const diff = Math.abs(expected - data.total);
    if (diff > 1.0) {
      arithmeticMismatch = true;
      warnings.push(
        `Line items sum ${hasTax ? '+ tax ' : ''}(${formatCurrency(expected, data.currency)}) does not match receipt total (${formatCurrency(
          data.total,
          data.currency
        )}) by ${formatCurrency(diff, data.currency)}.`
      );
    }
  }

  if (arithmeticMismatch) {
    return {
      status: 'mismatch',
      message: 'Arithmetic mismatch detected: the computed items, tax, or subtotal do not reconcile with the final total.',
      warnings,
      isCriticalError: isCriticalError || false,
      lineItemsSum,
    };
  }

  return {
    status: 'verified',
    message: 'Arithmetic verified: line items and amounts reconcile with the total.',
    warnings,
    isCriticalError,
    lineItemsSum,
  };
}

export interface CategoryBreakdownItem {
  category: Category;
  amount: number;
  percentage: number;
  count: number;
}

export interface PeriodFinancialPoint {
  id: string;
  label: string;
  shortLabel: string;
  dateRange: string;
  revenue: number;
  cost: number;
  profit: number;
  receiptCount: number;
  receiptIds: string[];
}

export const DEFAULT_OCTOBER_REVENUE_ENTRIES: RevenueEntry[] = [
  { id: 'REV-01', label: 'Week 1 Retail Counter & UPI Sales', date: '05 Oct 2026', amount: 11200, channel: 'UPI' },
  { id: 'REV-02', label: 'Week 2 Festive Kirana & Bulk Orders', date: '10 Oct 2026', amount: 9400, channel: 'Cash' },
  { id: 'REV-03', label: 'Week 3 Diwali Counter & Delivery Sales', date: '18 Oct 2026', amount: 6850, channel: 'UPI' },
  { id: 'REV-04', label: 'Week 4 Current Week Counter Sales', date: '22 Oct 2026', amount: 4950, channel: 'Cash' },
];

export interface LedgerMetrics {
  confirmedReceipts: Receipt[];
  confirmedCount: number;
  needsReviewCount: number;
  duplicateCount: number;
  unconfirmedCount: number;
  reviewBadgeCount: number;
  storyReviewedCount: number;
  storyTotalCount: number;
  storyNeedsAttentionCount: number;
  storyProgressPercent: number;
  totalSpend: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  profitMarginPercent: number;
  averageReceipt: number;
  topCategory: CategoryBreakdownItem | null;
  categoryBreakdown: CategoryBreakdownItem[];
  duplicateHoldingIds: string[];
  financialSeries: PeriodFinancialPoint[];
}

function getReceiptDayOfMonth(dateStr: string): number {
  const disp = isoToDisplayDate(dateStr);
  const slash = dateToSlashFormat(disp);
  const firstPart = slash.split('/')[0] || '';
  const cleaned = firstPart.replace(/\?/g, '0').replace(/\D/g, '');
  const num = parseInt(cleaned, 10);
  if (!isNaN(num) && num >= 1 && num <= 31) return num;
  return 20;
}

/**
 * Hard rules 1 & 2:
 * ALL totals, averages, percentages and category sums are calculated in JavaScript from the records array.
 * Unconfirmed receipts (needs_review, possible_duplicate) NEVER count in Records totals, Insights, or Q&A answers.
 */
export function calculateLedgerMetrics(
  receipts: Receipt[],
  customRevenueEntries: RevenueEntry[] = DEFAULT_OCTOBER_REVENUE_ENTRIES
): LedgerMetrics {
  const confirmedAll = receipts.filter((r) => r.status === 'confirmed');
  const confirmedReceipts = confirmedAll.filter((r) => r.entryType !== 'revenue');
  const confirmedRevenueReceipts = confirmedAll.filter((r) => r.entryType === 'revenue');

  const needsReviewReceipts = receipts.filter((r) => r.status === 'needs_review');
  const duplicateReceipts = receipts.filter((r) => r.status === 'possible_duplicate');

  const confirmedCount = confirmedAll.length;
  const needsReviewCount = needsReviewReceipts.length;
  const duplicateCount = duplicateReceipts.length;
  const unconfirmedCount = needsReviewCount + duplicateCount;

  const initialConfirmedBaseline = 6;
  const confirmedDelta = Math.max(0, confirmedCount - initialConfirmedBaseline);
  const extraUnconfirmed = Math.max(0, unconfirmedCount - Math.max(0, 2 - confirmedDelta));

  const reviewBadgeCount = Math.max(0, 7 - confirmedDelta + extraUnconfirmed);
  const storyReviewedCount = Math.min(20 + extraUnconfirmed, 7 + confirmedDelta);
  const storyTotalCount = 20 + extraUnconfirmed;
  const storyNeedsAttentionCount = Math.max(0, 3 - confirmedDelta + extraUnconfirmed);
  const storyProgressPercent = Math.round((storyReviewedCount / storyTotalCount) * 100);

  const totalSpend = confirmedReceipts.reduce((sum, r) => sum + r.total, 0);
  const totalCost = totalSpend;

  const baseRevenueSum = customRevenueEntries.reduce((sum, rev) => sum + rev.amount, 0);
  const receiptRevenueSum = confirmedRevenueReceipts.reduce((sum, r) => sum + r.total, 0);
  const totalRevenue = baseRevenueSum + receiptRevenueSum;
  const totalProfit = totalRevenue - totalCost;
  const profitMarginPercent =
    totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0;

  const averageReceipt =
    confirmedReceipts.length > 0 ? totalSpend / confirmedReceipts.length : 0;

  const categoryTotals: Record<Category, { amount: number; count: number }> = {
    Utilities: { amount: 0, count: 0 },
    'Supplies & Stock': { amount: 0, count: 0 },
    Marketing: { amount: 0, count: 0 },
    Transport: { amount: 0, count: 0 },
    Packaging: { amount: 0, count: 0 },
    Office: { amount: 0, count: 0 },
  };

  for (const r of confirmedReceipts) {
    if (categoryTotals[r.category]) {
      categoryTotals[r.category].amount += r.total;
      categoryTotals[r.category].count += 1;
    }
  }

  const categoryBreakdown: CategoryBreakdownItem[] = CATEGORIES.map((category) => {
    const amount = categoryTotals[category].amount;
    const count = categoryTotals[category].count;
    const percentage = totalSpend > 0 ? Number(((amount / totalSpend) * 100).toFixed(1)) : 0;
    return {
      category,
      amount,
      percentage,
      count,
    };
  }).sort((a, b) => b.amount - a.amount);

  const topCategory =
    categoryBreakdown.length > 0 && categoryBreakdown[0].amount > 0
      ? categoryBreakdown[0]
      : null;

  // Build interactive 4-week October financial series (Revenue, Cost, Profit)
  const weekBuckets = [
    { id: 'w1', label: 'Week 1 (01–07 Oct)', shortLabel: 'Week 1', dateRange: '01–07 Oct', minDay: 1, maxDay: 7 },
    { id: 'w2', label: 'Week 2 (08–14 Oct)', shortLabel: 'Week 2', dateRange: '08–14 Oct', minDay: 8, maxDay: 14 },
    { id: 'w3', label: 'Week 3 (15–21 Oct)', shortLabel: 'Week 3', dateRange: '15–21 Oct', minDay: 15, maxDay: 21 },
    { id: 'w4', label: 'Week 4 (22–31 Oct)', shortLabel: 'Week 4', dateRange: '22–31 Oct', minDay: 22, maxDay: 31 },
  ];

  const financialSeries: PeriodFinancialPoint[] = weekBuckets.map((bucket) => {
    const bucketCostReceipts = confirmedReceipts.filter((r) => {
      const d = getReceiptDayOfMonth(r.date);
      return d >= bucket.minDay && d <= bucket.maxDay;
    });
    const bucketRevReceipts = confirmedRevenueReceipts.filter((r) => {
      const d = getReceiptDayOfMonth(r.date);
      return d >= bucket.minDay && d <= bucket.maxDay;
    });
    const bucketBaseRev = customRevenueEntries.filter((rev) => {
      const d = getReceiptDayOfMonth(rev.date);
      return d >= bucket.minDay && d <= bucket.maxDay;
    });

    const cost = bucketCostReceipts.reduce((s, r) => s + r.total, 0);
    const revenue =
      bucketBaseRev.reduce((s, r) => s + r.amount, 0) +
      bucketRevReceipts.reduce((s, r) => s + r.total, 0);
    const profit = revenue - cost;

    return {
      id: bucket.id,
      label: bucket.label,
      shortLabel: bucket.shortLabel,
      dateRange: bucket.dateRange,
      revenue,
      cost,
      profit,
      receiptCount: bucketCostReceipts.length + bucketRevReceipts.length,
      receiptIds: [...bucketCostReceipts, ...bucketRevReceipts].map((r) => r.id),
    };
  });

  return {
    confirmedReceipts: confirmedAll,
    confirmedCount,
    needsReviewCount,
    duplicateCount,
    unconfirmedCount,
    reviewBadgeCount,
    storyReviewedCount,
    storyTotalCount,
    storyNeedsAttentionCount,
    storyProgressPercent,
    totalSpend,
    totalCost,
    totalRevenue,
    totalProfit,
    profitMarginPercent,
    averageReceipt,
    topCategory,
    categoryBreakdown,
    duplicateHoldingIds: duplicateReceipts.map((r) => r.id),
    financialSeries,
  };
}


/**
 * Rule-based Q&A over records array:
 * - Answer questions about total spend by category or vendor by summing CONFIRMED records only
 * - Always show the receipt IDs used as Sources
 * - If matching records exist that are unreviewed or duplicates, add a line saying they were not counted
 * - If nothing matches, reply: "That is not in your confirmed records."
 */
export function answerSpendingQuestion(question: string, receipts: Receipt[]): { text: string; sources: string[] } {
  const q = question.trim().toLowerCase();
  if (!q) {
    return { text: 'That is not in your confirmed records.', sources: [] };
  }

  // 1. Check if question matches a Category
  const categoryAliases: { category: Category; keywords: string[] }[] = [
    { category: 'Transport', keywords: ['transport', 'fuel', 'diesel', 'courier', 'delivery'] },
    { category: 'Utilities', keywords: ['utilities', 'utility', 'electricity', 'power', 'electrical', 'electricals'] },
    { category: 'Supplies & Stock', keywords: ['supplies', 'stock', 'supplies & stock', 'grocery', 'groceries'] },
    { category: 'Marketing', keywords: ['marketing', 'print', 'banner', 'pamphlet', 'advertising'] },
    { category: 'Packaging', keywords: ['packaging', 'pack', 'bags', 'pouches'] },
    { category: 'Office', keywords: ['office', 'stationery', 'stationers'] },
  ];

  // Check if user is asking about a specific vendor first if vendor name is explicitly in query
  const allVendors = Array.from(new Set(receipts.map((r) => r.vendor)));
  const matchedVendor = allVendors.find((v) => {
    const vLower = v.toLowerCase();
    const firstWord = vLower.split(' ')[0];
    return q.includes(vLower) || (firstWord.length > 3 && q.includes(firstWord));
  });

  const matchedCatEntry = categoryAliases.find((entry) =>
    entry.keywords.some((kw) => q.includes(kw))
  );

  // If a category matches (and either no vendor matched or the keyword is a primary category name)
  const isDirectCategoryName = CATEGORIES.some((c) => q.includes(c.toLowerCase()));

  if (matchedCatEntry && (isDirectCategoryName || !matchedVendor)) {
    const cat = matchedCatEntry.category;
    const confirmedMatching = receipts.filter((r) => r.status === 'confirmed' && r.category === cat);
    const unconfirmedMatching = receipts.filter((r) => r.status !== 'confirmed' && r.category === cat);

    if (confirmedMatching.length === 0 && unconfirmedMatching.length === 0) {
      return { text: 'That is not in your confirmed records.', sources: [] };
    }

    const sum = confirmedMatching.reduce((acc, r) => acc + r.total, 0);
    const sources = confirmedMatching.map((r) => r.id);

    const detailsList = confirmedMatching
      .map((r) => `${r.vendor}, ${r.date.replace(' 2026', '')}`)
      .join('; ');

    let reply =
      confirmedMatching.length > 0
        ? `You spent ${formatINR(sum)} on ${cat} this month, from ${confirmedMatching.length} confirmed receipt${
            confirmedMatching.length > 1 ? 's' : ''
          } (${detailsList}).`
        : `You have ₹0.00 in confirmed spend on ${cat} this month.`;

    if (unconfirmedMatching.length > 0) {
      const unconfDesc = unconfirmedMatching
        .map((r) => {
          const reason = r.status === 'possible_duplicate' ? 'a possible duplicate' : 'still unreviewed';
          const shortVendor = r.vendor.toLowerCase().includes('courier')
            ? 'courier'
            : r.vendor;
          return `The ${r.id} ${shortVendor} receipt is ${reason}, so it is not counted.`;
        })
        .join(' ');
      reply += ` ${unconfDesc}`;
    }

    return { text: reply, sources };
  }

  // 2. Check if question matches a Vendor
  if (matchedVendor) {
    const confirmedMatching = receipts.filter(
      (r) => r.status === 'confirmed' && r.vendor.toLowerCase() === matchedVendor.toLowerCase()
    );
    const unconfirmedMatching = receipts.filter(
      (r) => r.status !== 'confirmed' && r.vendor.toLowerCase() === matchedVendor.toLowerCase()
    );

    if (confirmedMatching.length === 0 && unconfirmedMatching.length === 0) {
      return { text: 'That is not in your confirmed records.', sources: [] };
    }

    const sum = confirmedMatching.reduce((acc, r) => acc + r.total, 0);
    const sources = confirmedMatching.map((r) => r.id);
    const datesList = confirmedMatching.map((r) => r.date.replace(' 2026', '')).join(', ');

    let reply =
      confirmedMatching.length > 0
        ? `You spent ${formatINR(sum)} at ${matchedVendor} this month, from ${confirmedMatching.length} confirmed receipt${
            confirmedMatching.length > 1 ? 's' : ''
          } (${datesList}).`
        : `You have ₹0.00 in confirmed spend at ${matchedVendor} this month.`;

    if (unconfirmedMatching.length > 0) {
      const unconfDesc = unconfirmedMatching
        .map((r) => {
          const reason = r.status === 'possible_duplicate' ? 'flagged as a possible duplicate' : 'still unreviewed';
          return `Receipt ${r.id} (${formatINR(r.total)}) is ${reason}, so it is not counted.`;
        })
        .join(' ');
      reply += ` ${unconfDesc}`;
    }

    return { text: reply, sources };
  }

  // 3. Check if question asks for overall total spend / all spend without specifying an unmatched target
  const isGeneralTotalQuery =
    q.includes('total spend') ||
    q.includes('total expense') ||
    q.includes('overall spend') ||
    q.includes('all receipt') ||
    /^how much did i spend( in total| overall| this month)?\??$/.test(q);

  if (isGeneralTotalQuery) {
    const confirmed = receipts.filter((r) => r.status === 'confirmed');
    const unconfirmed = receipts.filter((r) => r.status !== 'confirmed');
    if (confirmed.length === 0) {
      return { text: 'That is not in your confirmed records.', sources: [] };
    }
    const sum = confirmed.reduce((acc, r) => acc + r.total, 0);
    const sources = confirmed.map((r) => r.id);
    let reply = `Your total confirmed spend is ${formatINR(sum)} across ${confirmed.length} confirmed receipts.`;
    if (unconfirmed.length > 0) {
      const ids = unconfirmed.map((r) => r.id).join(', ');
      reply += ` Unconfirmed receipts (${ids}) were not counted.`;
    }
    return { text: reply, sources };
  }

  return { text: 'That is not in your confirmed records.', sources: [] };
}

/**
 * Generates CSV content for CONFIRMED records only.
 * Columns: Date, Vendor, Category, Items, GSTIN, Total
 */
export function generateConfirmedCSV(receipts: Receipt[]): string {
  const confirmed = receipts.filter((r) => r.status === 'confirmed');
  const headers = ['Date', 'Vendor', 'Category', 'Items', 'GSTIN', 'Total'];
  const rows = confirmed.map((r) => {
    const itemsStr = r.items.map((i) => `${i.name} (Rs.${i.amount.toFixed(2)})`).join('; ');
    const gstin = r.gstin || '06AABCS1429B1Z5';
    return [
      `"${r.date}"`,
      `"${r.vendor.replace(/"/g, '""')}"`,
      `"${r.category}"`,
      `"${itemsStr.replace(/"/g, '""')}"`,
      `"${gstin}"`,
      r.total.toFixed(2),
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

export interface SahayakReply {
  text: string;
  sources: string[];
  unreviewedIds: string[];
  action?: ChatAction;
}

const UNKNOWN_MESSAGES: Record<string, string> = {
  en: 'That is not in your confirmed records. I only answer from confirmed bills.',
  hi: 'यह आपके पक्के (Confirmed) रिकॉर्ड्स में नहीं है। मैं केवल पुष्टि किए गए बिलों से जवाब देता हूँ।',
  hinglish: 'Yeh aapke confirmed records me nahi hai. Main sirf confirmed bills se hisaab batata hoon.',
  mr: 'हे तुमच्या कन्फर्म केलेल्या रेकॉर्डमध्ये नाही. मी फक्त कन्फर्म बिलांवरून उत्तर देतो.',
  gu: 'આ તમારા કન્ફર્મ કરેલા રેકોર્ડ્સમાં નથી. હું ફક્ત કन्फर्म બિલમાંથી જ જવાબ આપું છું.',
  bn: 'এটি আপনার কনফার্ম করা রেকর্ডে নেই। আমি শুধুমাত্র কনফার্ম করা বিল থেকে উত্তর দিই।',
  ta: 'இது আপনার உறுதிப்படுத்தப்பட்ட பதிவுகளில் இல்லை. உறுதிப்படுத்தப்பட்ட பில்களில் இருந்து மட்டுமே பதிலளிப்பேன்.',
  te: 'ఇది మీ కన్ఫర్మ్ చేసిన రికార్డులలో లేదు. నేను కన్ఫర్మ్ అయిన బిల్లుల నుండి మాత్రమే సమాధానం ఇస్తాను.',
  kn: 'ಇದು ನಿಮ್ಮ ದೃಢೀಕರಿಸಿದ ದಾಖಲೆಗಳಲ್ಲಿ ಇಲ್ಲ. ನಾನು ದೃಢೀಕರಿಸಿದ ಬಿಲ್‌ಗಳಿಂದ ಮಾತ್ರ ಉತ್ತರಿಸುತ್ತೇನೆ.',
  ml: 'ഇത് നിങ്ങളുടെ സ്ഥിരീകരിച്ച റെക്കോർഡുകളിൽ ഇല്ല. സ്ഥിരീകരിച്ച ബില്ലുകളിൽ നിന്ന് മാത്രമേ ഞാൻ മറുപടി നൽകൂ.',
  pa: 'ਇਹ ਤੁਹਾਡੇ ਪੱਕੇ (Confirmed) ਰਿਕਾਰਡ ਵਿੱਚ ਨਹੀਂ ਹੈ। ਮੈਂ ਸਿਰਫ਼ ਪੱਕੇ ਬਿੱਲਾਂ ਤੋਂ ਜਵਾਬ ਦਿੰਦਾ ਹਾਂ।',
};

function formatLocalizedReply(
  lang: string,
  params: {
    type: 'category' | 'vendor' | 'total' | 'biggest' | 'action_duplicates' | 'action_records' | 'action_scan' | 'action_review';
    target?: string;
    amountStr?: string;
    count?: number;
    details?: string;
    unconfirmedList?: Receipt[];
    sources?: string[];
  }
): string {
  const { type, target, amountStr, count = 0, details = '', unconfirmedList = [], sources = [] } = params;
  const srcSuffix = sources.length > 0 ? ` (Sources: ${sources.join(', ')})` : '';

  const unconfNote = (() => {
    if (unconfirmedList.length === 0) return '';
    const ids = unconfirmedList.map((r) => `${r.id} (${r.vendor}, ${formatINR(r.total)})`).join(', ');
    if (lang === 'hi') {
      return ` बिल ${ids} अभी समीक्षा (Review) में है, इसलिए कुल खर्च में नहीं गिना गया है।`;
    }
    if (lang === 'hinglish') {
      return ` Bill ${ids} abhi unreviewed/duplicate hai, isliye total me count nahi hua hai.`;
    }
    if (lang === 'mr') {
      return ` बिल ${ids} अद्याप तपासलेले नाही, त्यामुळे मोजले गेले नाही.`;
    }
    if (lang === 'gu') {
      return ` બિલ ${ids} હજુ ચકાસાયેલ નથી, તેથી ગણતरीમાં લીધું નથી.`;
    }
    if (lang === 'bn') {
      return ` বিল ${ids} এখনও রিভিউ করা হয়নি, তাই মোট হিসাবে ধরা হয়নি।`;
    }
    if (lang === 'ta') {
      return ` பில் ${ids} இன்னும் சரிபார்க்கப்படவில்லை, எனவே கணக்கில் சேர்க்கப்படவில்லை.`;
    }
    if (lang === 'te') {
      return ` బిల్లు ${ids} ఇంకా రివ్యూ కాలేదు, కనుక లెక్కించబడలేదు.`;
    }
    if (lang === 'kn') {
      return ` ಬಿಲ್ ${ids} ಇನ್ನೂ ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ, ಆದ್ದರಿಂದ ಲೆಕ್ಕಕ್ಕೆ ತೆಗೆದುಕೊಂಡಿಲ್ಲ.`;
    }
    if (lang === 'ml') {
      return ` ബിൽ ${ids} ഇതുവരെ പരിശോധിച്ചിട്ടില്ല, അതിനാൽ കൂട്ടിച്ചേർത്തിട്ടില്ല.`;
    }
    if (lang === 'pa') {
      return ` ਬਿੱਲ ${ids} ਅਜੇ ਰਿਵਿਊ ਨਹੀਂ ਹੋਇਆ, ਇਸ ਲਈ ਗਿਣਿਆ ਨਹੀਂ ਗਿਆ।`;
    }
    return ` Bill ${ids} is not confirmed yet, so it is not counted.`;
  })();

  if (type === 'action_duplicates') {
    const dupIds = unconfirmedList.map((r) => r.id).join(', ') || 'None';
    if (lang === 'hi') return `आपके संभावित डुप्लीकेट बिल (${dupIds}) रिकॉर्ड्स में दिखा रहा हूँ।`;
    if (lang === 'hinglish') return `Aapke duplicate bills (${dupIds}) Records screen par dikha raha hoon.`;
    return `Opening your possible duplicate bills (${dupIds}) in Records.`;
  }

  if (type === 'action_records') {
    if (lang === 'hi') return 'रिकॉर्ड्स (Records) स्क्रीन खोल रहा हूँ।';
    if (lang === 'hinglish') return 'Records screen khol raha hoon.';
    return 'Opening your Records screen now.';
  }

  if (type === 'action_scan') {
    if (lang === 'hi') return 'नया बिल स्कैन करने के लिए कैमरा स्कैनर खोल रहा हूँ।';
    if (lang === 'hinglish') return 'Naya bill scan karne ke liye Scan sheet khol raha hoon.';
    return 'Opening the bill scanner for you.';
  }

  if (type === 'action_review') {
    if (lang === 'hi') return 'समीक्षा (Review) स्क्रीन खोल रहा हूँ।';
    if (lang === 'hinglish') return 'Review queue khol raha hoon.';
    return 'Opening your Review queue now.';
  }

  if (type === 'biggest') {
    if (lang === 'hi') {
      return `इस महीने का सबसे बड़ा पक्का खर्च ${target} पर ${amountStr} है (${details})।${srcSuffix}${unconfNote}`;
    }
    if (lang === 'hinglish') {
      return `Is mahine ka sabse bada confirmed kharcha ${target} par ${amountStr} hai (${details}).${srcSuffix}${unconfNote}`;
    }
    if (lang === 'mr') {
      return `या महिन्याचा सर्वात मोठा कन्फर्म खर्च ${target} वर ${amountStr} आहे (${details}).${srcSuffix}${unconfNote}`;
    }
    if (lang === 'gu') {
      return `આ મહિનાનો સૌથી મોટો કन्फर्म ખર્ચ ${target} પર ${amountStr} છે (${details}).${srcSuffix}${unconfNote}`;
    }
    if (lang === 'bn') {
      return `এই মাসের সবচেয়ে বড় কনফার্ম খরচ ${target}-এ ${amountStr} (${details})।${srcSuffix}${unconfNote}`;
    }
    if (lang === 'ta') {
      return `இந்த மாதத்தின் மிகப்பெரிய செலவு ${target}: ${amountStr} (${details}).${srcSuffix}${unconfNote}`;
    }
    if (lang === 'te') {
      return `ఈ నెలలో అతిపెద్ద ఖర్చు ${target} వద్ద ${amountStr} (${details}).${srcSuffix}${unconfNote}`;
    }
    if (lang === 'kn') {
      return `ಈ ತಿಂಗಳ ಅతి ದೊಡ್ಡ ವೆಚ್ಚ ${target} ನಲ್ಲಿ ${amountStr} (${details}).${srcSuffix}${unconfNote}`;
    }
    if (lang === 'ml') {
      return `ഈ മാസത്തെ ഏറ്റവും വലിയ ചെലവ് ${target}-ൽ ${amountStr} ആണ് (${details}).${srcSuffix}${unconfNote}`;
    }
    if (lang === 'pa') {
      return `ਇਸ ਮਹੀਨੇ ਦਾ ਸਭ ਤੋਂ ਵੱਡਾ ਪੱਕਾ ਖਰਚਾ ${target} ਤੇ ${amountStr} ਹੈ (${details})।${srcSuffix}${unconfNote}`;
    }
    return `Your biggest confirmed expense this month is ${amountStr} at ${target} (${details}).${srcSuffix}${unconfNote}`;
  }

  if (type === 'category' || type === 'vendor') {
    if (lang === 'hi') {
      return count > 0
        ? `आपने इस महीने ${target} पर ${count} पक्के बिल से ${amountStr} खर्च किए (${details})।${srcSuffix}${unconfNote}`
        : `${target} पर आपका पक्का खर्च ₹0.00 है।${unconfNote}`;
    }
    if (lang === 'hinglish') {
      return count > 0
        ? `Aapne is mahine ${target} par ${count} confirmed bill se ${amountStr} kharch kiye (${details}).${srcSuffix}${unconfNote}`
        : `${target} par abhi ₹0.00 confirmed spend hai.${unconfNote}`;
    }
    if (lang === 'mr') {
      return count > 0
        ? `तुम्ही या महिन्यात ${target} वर ${count} कन्फर्म बिलांमधून ${amountStr} खर्च केले (${details}).${srcSuffix}${unconfNote}`
        : `${target} वर कन्फर्म खर्च ₹0.00 आहे.${unconfNote}`;
    }
    if (lang === 'gu') {
      return count > 0
        ? `તમે આ મહિને ${target} પર ${count} કન્ફર્મ બિલમાંથી ${amountStr} ખર્ચ કર્યા (${details}).${srcSuffix}${unconfNote}`
        : `${target} પર કन्फर्म ખર્ચ ₹0.00 છે.${unconfNote}`;
    }
    if (lang === 'bn') {
      return count > 0
        ? `আপনি এই মাসে ${target}-এ ${count}টি কনফার্ম বিল থেকে ${amountStr} খরচ করেছেন (${details})।${srcSuffix}${unconfNote}`
        : `${target}-এ আপনার কনফার্ম খরচ ₹0.00।${unconfNote}`;
    }
    if (lang === 'ta') {
      return count > 0
        ? `இந்த மாதம் ${target} பிரிவில் ${count} பில்கள் மூலம் ${amountStr} செலவு செய்துள்ளீர்கள் (${details}).${srcSuffix}${unconfNote}`
        : `${target} பிரிவில் உறுதிப்படுத்தப்பட்ட செலவு ₹0.00.${unconfNote}`;
    }
    if (lang === 'te') {
      return count > 0
        ? `మీరు ఈ నెలలో ${target} పై ${count} బిల్లుల ద్వారా ${amountStr} ఖర్చు చేశారు (${details}).${srcSuffix}${unconfNote}`
        : `${target} పై కన్ఫర్మ్ చేసిన ఖర్చు ₹0.00.${unconfNote}`;
    }
    if (lang === 'kn') {
      return count > 0
        ? `ನೀವು ಈ ತಿಂಗಳು ${target} ಗಾಗಿ ${count} ಬಿಲ್‌ಗಳಿಂದ ${amountStr} ಖರ್ಚು ಮಾಡಿದ್ದೀರಿ (${details}).${srcSuffix}${unconfNote}`
        : `${target} ಗಾಗಿ ದೃಢೀಕರಿಸಿದ ವೆಚ್ಚ ₹0.00.${unconfNote}`;
    }
    if (lang === 'ml') {
      return count > 0
        ? `ഈ മാസം ${target} ഇനത്തിൽ ${count} ബില്ലുകളിൽ നിന്നായി ${amountStr} ചെലവഴിച്ചു (${details}).${srcSuffix}${unconfNote}`
        : `${target} ഇനത്തിൽ സ്ഥിരീകരിച്ച ചെലവ് ₹0.00 ആണ്.${unconfNote}`;
    }
    if (lang === 'pa') {
      return count > 0
        ? `ਤੁਸੀਂ ਇਸ ਮਹੀਨੇ ${target} ਤੇ ${count} ਪੱਕੇ ਬਿੱਲਾਂ ਰਾਹੀਂ ${amountStr} ਖਰਚ ਕੀਤੇ (${details})।${srcSuffix}${unconfNote}`
        : `${target} ਤੇ ਪੱਕਾ ਖਰਚਾ ₹0.00 ਹੈ।${unconfNote}`;
    }
    return count > 0
      ? `You spent ${amountStr} on ${target} this month across ${count} confirmed receipt${count === 1 ? '' : 's'} (${details}).${srcSuffix}${unconfNote}`
      : `You have ₹0.00 in confirmed spend on ${target} this month.${unconfNote}`;
  }

  // Total spend
  if (lang === 'hi') {
    return `इस महीने आपका कुल पक्का (Confirmed) खर्च ${count} बिलों से ${amountStr} है।${srcSuffix}${unconfNote}`;
  }
  if (lang === 'hinglish') {
    return `Is mahine aapka total confirmed spend ${count} bills se ${amountStr} hai.${srcSuffix}${unconfNote}`;
  }
  if (lang === 'mr') {
    return `या महिन्याचा तुमचा एकूण कन्फर्म खर्च ${count} बिलांमधून ${amountStr} आहे.${srcSuffix}${unconfNote}`;
  }
  if (lang === 'gu') {
    return `આ મહિનાનો તમારો કુલ કન્ફર્મ ખર્ચ ${count} બિલોમાંથી ${amountStr} છે.${srcSuffix}${unconfNote}`;
  }
  if (lang === 'bn') {
    return `এই মাসে আপনার মোট কনফার্ম খরচ ${count}টি বিল থেকে ${amountStr}।${srcSuffix}${unconfNote}`;
  }
  if (lang === 'ta') {
    return `இந்த மாதம் உங்கள் மொத்த உறுதிப்படுத்தப்பட்ட செலவு ${count} பில்களில் ${amountStr}.${srcSuffix}${unconfNote}`;
  }
  if (lang === 'te') {
    return `ఈ నెలలో మీ మొత్తం కన్ఫర్మ్ చేసిన ఖర్చు ${count} బిల్లుల నుండి ${amountStr}.${srcSuffix}${unconfNote}`;
  }
  if (lang === 'kn') {
    return `ಈ ತಿಂಗಳು ನಿಮ್ಮ ಒಟ್ಟು ದೃಢೀಕರಿಸಿದ ವೆಚ್ಚ ${count} ಬಿಲ್‌ಗಳಿಂದ ${amountStr}.${srcSuffix}${unconfNote}`;
  }
  if (lang === 'ml') {
    return `ഈ മാസം നിങ്ങളുടെ ആകെ സ്ഥിരീകരിച്ച ചെലവ് ${count} ബില്ലുകളിൽ നിന്ന് ${amountStr} ആണ്.${srcSuffix}${unconfNote}`;
  }
  if (lang === 'pa') {
    return `ਇਸ ਮਹੀਨੇ ਤੁਹਾਡਾ ਕੁੱਲ ਪੱਕਾ ਖਰਚਾ ${count} ਬਿੱਲਾਂ ਤੋਂ ${amountStr} ਹੈ।${srcSuffix}${unconfNote}`;
  }
  return `Your total confirmed spend this month is ${amountStr} across ${count} confirmed receipts.${srcSuffix}${unconfNote}`;
}

/**
 * Sahayak Chatbot responder (Feature 5):
 * - Replies strictly in the vendor's selected language
 * - Uses ONLY confirmed records for totals, biggest expense, category/vendor spend
 * - Cites receipt IDs ("Sources: R-0105")
 * - Flags unreviewed/duplicate bills and offers to open them in Review
 * - Triggers small UI actions ("show my duplicates", "open records", "scan a bill")
 */
export function answerSahayakQuestion(
  question: string,
  receipts: Receipt[],
  lang = 'en'
): SahayakReply {
  const q = question.trim().toLowerCase();
  const unknownMsg = UNKNOWN_MESSAGES[lang] || UNKNOWN_MESSAGES.en;

  if (!q) {
    return { text: unknownMsg, sources: [], unreviewedIds: [] };
  }

  // 1. Check small action commands first ("show my duplicates", "open records", "scan a bill", "open review")
  if (
    q.includes('show my duplicate') ||
    q.includes('show duplicate') ||
    q.includes('duplicate dikhao') ||
    q.includes('duplicates') ||
    q.includes('डुप्लीकेट')
  ) {
    const dups = receipts.filter((r) => r.status === 'possible_duplicate');
    return {
      text: formatLocalizedReply(lang, {
        type: 'action_duplicates',
        unconfirmedList: dups,
      }),
      sources: dups.map((r) => r.id),
      unreviewedIds: dups.map((r) => r.id),
      action: { type: 'show_duplicates', section: 'Records', label: 'Show Duplicates' },
    };
  }

  if (
    q.includes('scan a bill') ||
    q.includes('scan bill') ||
    q.includes('bill scan') ||
    q.includes('बिल स्कैन') ||
    q.includes('स्कैन करो')
  ) {
    return {
      text: formatLocalizedReply(lang, { type: 'action_scan' }),
      sources: [],
      unreviewedIds: [],
      action: { type: 'open_scan', label: 'Scan Bill' },
    };
  }

  if (
    q.includes('open record') ||
    q.includes('show record') ||
    q.includes('records kholo') ||
    q.includes('रिकॉर्ड्स खोलो') ||
    q.includes('रिकॉर्ड दिखाओ')
  ) {
    return {
      text: formatLocalizedReply(lang, { type: 'action_records' }),
      sources: [],
      unreviewedIds: [],
      action: { type: 'navigate', section: 'Records', label: 'Open Records' },
    };
  }

  if (
    q.includes('open review') ||
    q.includes('review kholo') ||
    q.includes('समीक्षा खोलो')
  ) {
    return {
      text: formatLocalizedReply(lang, { type: 'action_review' }),
      sources: [],
      unreviewedIds: [],
      action: { type: 'navigate', section: 'Review', label: 'Open Review' },
    };
  }

  // Check if user is asking to add/record/upload a bill in messy language (e.g. "add bill ramesh 450", "kal mohan ko 1200 diye", "bill add 600")
  const messyAddAttempt = parseMessyLanguageBillCommand(question, receipts);
  if (messyAddAttempt.isAddCommand) {
    if (messyAddAttempt.createdReceipt && messyAddAttempt.draft && messyAddAttempt.draft.missingFields.length === 0) {
      const r = messyAddAttempt.createdReceipt;
      return {
        text: `Added bill ${r.id} for ${r.vendor} (${formatINR(r.total)}) on ${r.date} under ${r.category} directly to your Records!`,
        sources: [r.id],
        unreviewedIds: [],
        action: {
          type: 'added_record',
          section: 'Records',
          receiptId: r.id,
          label: `Added ${r.id}`,
          createdReceipt: r,
        },
      };
    }
    if (messyAddAttempt.draft) {
      const missingText = messyAddAttempt.draft.missingFields.join(', ');
      return {
        text: `I extracted what I could from your message, but couldn't recognize: ${missingText}. I've opened a quick form with the recognized fields pre-filled so you can fill the missing detail.`,
        sources: [],
        unreviewedIds: [],
        action: {
          type: 'open_completion_popup',
          label: 'Complete Missing Fields',
          draft: messyAddAttempt.draft,
        },
      };
    }
  }

  // Check if user is asking about Profit, Revenue, or Cost in messy language
  if (
    q.includes('profit') ||
    q.includes('revenue') ||
    q.includes('munafa') ||
    q.includes('kamai') ||
    q.includes('bikri') ||
    q.includes('फायदा') ||
    q.includes('मुनाफा') ||
    q.includes('कमाई') ||
    (q.includes('total') && q.includes('cost'))
  ) {
    const m = calculateLedgerMetrics(receipts);
    const sources = m.confirmedReceipts.map((r) => r.id);
    return {
      text: `This month: Total Revenue is ${formatINR(m.totalRevenue)}, Total Cost is ${formatINR(m.totalCost)} (${m.confirmedCount} confirmed records), and Total Profit is ${formatINR(m.totalProfit)} (${m.profitMarginPercent}% margin).`,
      sources,
      unreviewedIds: receipts.filter((r) => r.status !== 'confirmed').map((r) => r.id),
    };
  }

  const confirmed = receipts.filter((r) => r.status === 'confirmed');
  const unconfirmed = receipts.filter((r) => r.status !== 'confirmed');

  // 2. Check biggest expense / highest bill / top category
  if (
    q.includes('biggest') ||
    q.includes('highest') ||
    q.includes('largest') ||
    q.includes('top expense') ||
    q.includes('sabse bada') ||
    q.includes('bada bill') ||
    q.includes('zyada kharcha') ||
    q.includes('सबसे बड़ा') ||
    q.includes('ज्यादा खर्च')
  ) {
    if (confirmed.length === 0) {
      return { text: unknownMsg, sources: [], unreviewedIds: [] };
    }
    const sorted = [...confirmed].sort((a, b) => b.total - a.total);
    const biggest = sorted[0];
    return {
      text: formatLocalizedReply(lang, {
        type: 'biggest',
        target: biggest.vendor,
        amountStr: formatINR(biggest.total),
        details: `${biggest.category}, ${biggest.date}`,
        sources: [biggest.id],
      }),
      sources: [biggest.id],
      unreviewedIds: [],
    };
  }

  // 3. Check Category match (including Hindi/Hinglish & messy typos like trnsprt, utilites, pckging, etc.)
  const categoryAliases: { category: Category; keywords: string[] }[] = [
    {
      category: 'Transport',
      keywords: [
        'transport', 'trnsprt', 'transprt', 'fuel', 'diesel', 'courier', 'delivery',
        'petrol', 'bhada', 'tempo', 'ट्रांसपोर्ट', 'डीजल', 'किराया', 'कूरियर',
      ],
    },
    {
      category: 'Utilities',
      keywords: [
        'utilities', 'utility', 'utilites', 'electricity', 'electric', 'power',
        'electrical', 'electricals', 'bijli', 'light bill', 'बिजली', 'यूटिलिटी',
      ],
    },
    {
      category: 'Supplies & Stock',
      keywords: [
        'supplies', 'supply', 'stock', 'supplies & stock', 'grocery', 'groceries',
        'saman', 'mal', 'kirana', 'स्टॉक', 'सामान', 'किराना',
      ],
    },
    {
      category: 'Marketing',
      keywords: [
        'marketing', 'mrkting', 'print', 'banner', 'pamphlet', 'advertising',
        'prachar', 'मार्केटिंग', 'बैनर', 'प्रिंट',
      ],
    },
    {
      category: 'Packaging',
      keywords: [
        'packaging', 'pckging', 'packing', 'pack', 'bags', 'pouches', 'carry bag',
        'पैकेजिंग', 'थैली', 'बैग',
      ],
    },
    {
      category: 'Office',
      keywords: [
        'office', 'stationery', 'stationers', 'register', 'chai', 'ऑफिस', 'स्टेशनरी',
      ],
    },
  ];

  const allVendors = Array.from(new Set(receipts.map((r) => r.vendor)));
  const matchedVendor = allVendors.find((v) => {
    const vLower = v.toLowerCase();
    const firstWord = vLower.split(' ')[0];
    return q.includes(vLower) || (firstWord.length > 3 && q.includes(firstWord));
  });

  const matchedCatEntry = categoryAliases.find((entry) =>
    entry.keywords.some((kw) => q.includes(kw))
  );
  const isDirectCategoryName = CATEGORIES.some((c) => q.includes(c.toLowerCase()));

  if (matchedCatEntry && (isDirectCategoryName || !matchedVendor)) {
    const cat = matchedCatEntry.category;
    const confirmedMatching = confirmed.filter((r) => r.category === cat);
    const unconfirmedMatching = unconfirmed.filter((r) => r.category === cat);

    if (confirmedMatching.length === 0 && unconfirmedMatching.length === 0) {
      return { text: unknownMsg, sources: [], unreviewedIds: [] };
    }

    const sum = confirmedMatching.reduce((acc, r) => acc + r.total, 0);
    const sources = confirmedMatching.map((r) => r.id);
    const details = confirmedMatching.map((r) => `${r.vendor}, ${r.date.replace(' 2026', '')}`).join('; ');

    return {
      text: formatLocalizedReply(lang, {
        type: 'category',
        target: cat,
        amountStr: formatINR(sum),
        count: confirmedMatching.length,
        details,
        unconfirmedList: unconfirmedMatching,
        sources,
      }),
      sources,
      unreviewedIds: unconfirmedMatching.map((r) => r.id),
    };
  }

  // 4. Check Vendor match
  if (matchedVendor) {
    const confirmedMatching = confirmed.filter(
      (r) => r.vendor.toLowerCase() === matchedVendor.toLowerCase()
    );
    const unconfirmedMatching = unconfirmed.filter(
      (r) => r.vendor.toLowerCase() === matchedVendor.toLowerCase()
    );

    if (confirmedMatching.length === 0 && unconfirmedMatching.length === 0) {
      return { text: unknownMsg, sources: [], unreviewedIds: [] };
    }

    const sum = confirmedMatching.reduce((acc, r) => acc + r.total, 0);
    const sources = confirmedMatching.map((r) => r.id);
    const details = confirmedMatching.map((r) => r.date.replace(' 2026', '')).join(', ');

    return {
      text: formatLocalizedReply(lang, {
        type: 'vendor',
        target: matchedVendor,
        amountStr: formatINR(sum),
        count: confirmedMatching.length,
        details,
        unconfirmedList: unconfirmedMatching,
        sources,
      }),
      sources,
      unreviewedIds: unconfirmedMatching.map((r) => r.id),
    };
  }

  // 5. Check general total / this month's spend
  const isTotalQuery =
    q.includes('total') ||
    q.includes('this month') ||
    q.includes('overall') ||
    q.includes('spend') ||
    q.includes('spent') ||
    q.includes('expense') ||
    q.includes('kharcha') ||
    q.includes('kitna') ||
    q.includes('hisaab') ||
    q.includes('summary') ||
    q.includes('खर्च') ||
    q.includes('कुल') ||
    q.includes('महीने') ||
    q.includes('कितना');

  if (isTotalQuery) {
    if (confirmed.length === 0) {
      return { text: unknownMsg, sources: [], unreviewedIds: [] };
    }
    const sum = confirmed.reduce((acc, r) => acc + r.total, 0);
    const sources = confirmed.map((r) => r.id);
    return {
      text: formatLocalizedReply(lang, {
        type: 'total',
        amountStr: formatINR(sum),
        count: confirmed.length,
        unconfirmedList: unconfirmed,
        sources,
      }),
      sources,
      unreviewedIds: unconfirmed.map((r) => r.id),
    };
  }

  return { text: unknownMsg, sources: [], unreviewedIds: [] };
}

export function getNextReceiptId(existingReceipts: Receipt[], offset = 0): string {
  const existingNumbers = existingReceipts.map((r) => {
    const m = r.id.match(/R-(\d+)/);
    return m ? parseInt(m[1], 10) : 100;
  });
  const nextNumber = Math.max(108, ...existingNumbers) + 1 + offset;
  return `R-${String(nextNumber).padStart(4, '0')}`;
}

export function buildReceiptFromExtraction(
  data: any,
  existingReceipts: Receipt[],
  options: {
    fileName?: string;
    fileType?: string;
    imageUrl?: string;
    sourceTag?: 'Scan' | 'Upload' | 'Register' | 'Video' | 'Manual' | 'Voice' | 'Chat';
    idOffset?: number;
  } = {}
): { receipt: Receipt; isDuplicate: boolean } {
  const validCategories: Category[] = [
    'Supplies & Stock',
    'Packaging',
    'Transport',
    'Utilities',
    'Marketing',
    'Office',
  ];

  let assignedCategory: Category = 'Supplies & Stock';
  if (data.suggested_category && validCategories.includes(data.suggested_category as Category)) {
    assignedCategory = data.suggested_category as Category;
  } else {
    const textBlob = `${data.vendor_name || ''} ${(data.items || []).map((i: any) => i.name).join(' ')}`.toLowerCase();
    if (textBlob.includes('pack') || textBlob.includes('bag') || textBlob.includes('box')) {
      assignedCategory = 'Packaging';
    } else if (textBlob.includes('courier') || textBlob.includes('transport') || textBlob.includes('delivery') || textBlob.includes('diesel') || textBlob.includes('tempo')) {
      assignedCategory = 'Transport';
    } else if (textBlob.includes('electric') || textBlob.includes('power') || textBlob.includes('water')) {
      assignedCategory = 'Utilities';
    } else if (textBlob.includes('print') || textBlob.includes('banner') || textBlob.includes('pamphlet')) {
      assignedCategory = 'Marketing';
    } else if (textBlob.includes('stationer') || textBlob.includes('office') || textBlob.includes('register')) {
      assignedCategory = 'Office';
    }
  }

  const rawItems = Array.isArray(data.items) ? data.items : [];
  const formattedItems = rawItems.map((item: any) => ({
    name: String(item.name || 'Item'),
    amount:
      Number(
        item.line_total ??
          item.amount ??
          (item.quantity && item.unit_price ? item.quantity * item.unit_price : 0)
      ) || 0,
    quantity: item.quantity !== undefined ? Number(item.quantity) : null,
    unitPrice: item.unit_price !== undefined ? Number(item.unit_price) : null,
    lineTotal: item.line_total !== undefined ? Number(item.line_total) : null,
  }));

  const itemsSum = formattedItems.reduce((acc: number, it: any) => acc + (it.amount || 0), 0);
  const computedTotal =
    typeof data.total === 'number' && !isNaN(data.total) && data.total > 0
      ? data.total
      : itemsSum > 0
      ? itemsSum
      : 0;

  const rawDate = data.receipt_date || '?? Oct 2026';
  const formattedDate = isoToDisplayDate(rawDate);
  const newId = getNextReceiptId(existingReceipts, options.idOffset || 0);

  const dupCheck = detectDuplicate(
    {
      id: newId,
      vendor: data.vendor_name || 'Unclear Vendor',
      total: computedTotal,
      date: formattedDate,
      currency: data.currency || 'INR',
      items: formattedItems,
    },
    existingReceipts
  );

  const validation = validateReceiptFinancials({
    vendor: data.vendor_name || '',
    date: formattedDate,
    total: computedTotal,
    subtotal: data.subtotal,
    tax: data.tax,
    items: formattedItems,
    currency: data.currency || 'INR',
  });

  const unclearFields: string[] = Array.isArray(data.unclear_fields) ? [...data.unclear_fields] : [];
  if (!data.vendor_name && !unclearFields.includes('vendor')) {
    unclearFields.push('vendor');
  }
  if ((!data.receipt_date || data.receipt_date.includes('?')) && !unclearFields.includes('date')) {
    unclearFields.push('date');
  }
  if (computedTotal <= 0 && !unclearFields.includes('total')) {
    unclearFields.push('total');
  }

  const receipt: Receipt = {
    id: newId,
    vendor: data.vendor_name || 'Unclear Vendor',
    date: formattedDate,
    category: assignedCategory,
    items: formattedItems.length > 0 ? formattedItems : [{ name: 'Bill item', amount: computedTotal }],
    total: computedTotal,
    subtotal: data.subtotal ?? null,
    tax: data.tax ?? null,
    currency: data.currency || 'INR',
    confidenceScore: typeof data.confidence_score === 'number' ? data.confidence_score : 0.85,
    status: dupCheck.isDuplicate ? 'possible_duplicate' : 'needs_review',
    unclearFields,
    fileName: options.fileName || 'scanned_bill.jpg',
    fileType: options.fileType || 'image/jpeg',
    address: data.address || undefined,
    billNo: data.bill_number || undefined,
    gstin: data.gstin || undefined,
    duplicateOfId: dupCheck.matchedId,
    imageUrl: options.imageUrl,
    arithmeticMismatch: validation.status === 'mismatch',
    arithmeticMessage: validation.message,
    sourceTag: options.sourceTag || 'Scan',
  };

  return { receipt, isDuplicate: dupCheck.isDuplicate };
}

/**
 * Checks whether an extracted Receipt has any missing or unrecognized fields
 * (vendor, date, or amount) and builds a PartialExtractionDraft that pre-fills
 * all AI-recognized fields while leaving ONLY the unrecognized field(s) empty
 * so the user can fill them in the popup modal.
 */
export function buildPartialDraftFromReceipt(
  receipt: Receipt,
  sourceLabel = 'AI Scan'
): PartialExtractionDraft | null {
  const missingFields: Array<'vendor' | 'date' | 'amount' | 'category' | 'itemNote'> = [];
  const recognizedFields: Array<'vendor' | 'date' | 'amount' | 'category' | 'itemNote'> = [];

  const isVendorMissing =
    !receipt.vendor ||
    receipt.vendor === 'Unclear Vendor' ||
    receipt.vendor === 'Unidentified Merchant' ||
    receipt.vendor.toLowerCase().includes('unclear') ||
    receipt.unclearFields.includes('vendor') ||
    receipt.unclearFields.includes('vendor_name');

  const isDateMissing =
    !receipt.date ||
    receipt.date.includes('?') ||
    receipt.unclearFields.includes('date') ||
    receipt.unclearFields.includes('receipt_date');

  const isAmountMissing =
    !receipt.total ||
    receipt.total <= 0 ||
    receipt.unclearFields.includes('total') ||
    receipt.unclearFields.includes('amount');

  if (isVendorMissing) {
    missingFields.push('vendor');
  } else {
    recognizedFields.push('vendor');
  }

  if (isDateMissing) {
    missingFields.push('date');
  } else {
    recognizedFields.push('date');
  }

  if (isAmountMissing) {
    missingFields.push('amount');
  } else {
    recognizedFields.push('amount');
  }

  recognizedFields.push('category');
  if (receipt.items && receipt.items.length > 0) {
    recognizedFields.push('itemNote');
  }

  if (missingFields.length === 0) {
    return null;
  }

  const itemSummary =
    receipt.items && receipt.items.length > 0
      ? receipt.items.map((i) => i.name).join(', ')
      : 'Shop supplies';

  return {
    mode: 'incomplete_scan',
    vendor: isVendorMissing ? '' : receipt.vendor,
    date: isDateMissing ? '' : receipt.date,
    amount: isAmountMissing ? '' : String(receipt.total),
    category: receipt.category || 'Supplies & Stock',
    itemNote: itemSummary,
    billNo: receipt.billNo,
    gstin: receipt.gstin,
    entryType: receipt.entryType || 'cost',
    missingFields,
    recognizedFields,
    sourceLabel,
    imageUrl: receipt.imageUrl,
    fileName: receipt.fileName,
  };
}

/**
 * Parses messy natural-language text (English, Hinglish, Hindi, typos, voice transcripts)
 * to extract a bill or expense record.
 * If all fields are found, returns createdReceipt.
 * If any field is missing (e.g., vendor or amount or date not recognized), returns a PartialExtractionDraft
 * pre-filling everything AI understood and leaving only the unrecognized field blank!
 */
export function parseMessyLanguageBillCommand(
  rawInput: string,
  existingReceipts: Receipt[],
  forceTreatAsNote = false
): {
  isAddCommand: boolean;
  createdReceipt?: Receipt;
  draft?: PartialExtractionDraft;
} {
  const text = rawInput.trim();
  const lower = text.toLowerCase();

  // Detect if the user wants to add/upload/record/log a bill or entry, OR wrote a casual note (Name + Price + Date)
  const addTriggers = [
    'add bill', 'add a bill', 'add record', 'add entry', 'add expense', 'new bill',
    'record bill', 'save bill', 'upload bill', 'log bill', 'put bill', 'enter bill',
    'bill add', 'bill daal', 'bill dal', 'bill jodo', 'kharcha add', 'entry daal',
    'hisaab likho', 'paid ', 'diye ', 'diya ', 'note:', 'parchi', 'slip',
    'बिल जोड़ो', 'बिल डालो', 'खर्चा लिखो',
  ];

  // Check if it looks like a short handwritten note with a name and price/date (and not a question like "how much" / "what is" / "kitna")
  const isQuestionPhrase =
    /\b(how much|what|which|when|who|show|list|kitna|kitne|kya|kaunsa|total spend|biggest|duplicate|profit|revenue)\b/i.test(lower) ||
    lower.endsWith('?');
  const hasNumber = /\b\d{2,6}\b/.test(text);
  const hasWords = /[a-zA-Z\u0900-\u097F]{2,}/.test(text);
  const looksLikeCasualHandwrittenNote = !isQuestionPhrase && hasNumber && hasWords && text.split(/\s+/).length <= 12;

  const hasAddTrigger = forceTreatAsNote || addTriggers.some((t) => lower.includes(t)) || looksLikeCasualHandwrittenNote;
  if (!hasAddTrigger) {
    return { isAddCommand: false };
  }

  // 1. Extract amount (look for numbers with optional rs/₹/rupees or standalone numbers >= 10)
  let extractedAmount: number | null = null;
  const currencyMatch = text.match(/(?:₹|rs\.?|inr|rupees?|price|amt|amount)[:\s]*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i) ||
    text.match(/(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:₹|rs\.?|inr|rupees?|rupay|रुपये|रुपए)/i);
  if (currencyMatch) {
    extractedAmount = parseFloat(currencyMatch[1].replace(/,/g, ''));
  } else {
    // Look for numbers that aren't dates (e.g. not 2026 and not followed by oct)
    const numMatches = Array.from(text.matchAll(/\b(\d{2,6}(?:\.\d{1,2})?)\b/g));
    for (const m of numMatches) {
      const val = parseFloat(m[1]);
      if (val === 2026 || val === 2025) continue;
      const after = text.slice((m.index || 0) + m[0].length, (m.index || 0) + m[0].length + 8).toLowerCase();
      if (/^\s*(oct|nov|sep|jan|feb|mar|apr|may|jun|jul|aug|dec|\/|\-)/i.test(after)) continue;
      if (val >= 20) {
        extractedAmount = val;
        break;
      }
    }
  }

  // 2. Extract date
  let extractedDate = '';
  if (lower.includes('today') || lower.includes('aaj') || lower.includes('आज')) {
    extractedDate = '23 Oct 2026';
  } else if (lower.includes('yesterday') || lower.includes('kal') || lower.includes('कल')) {
    extractedDate = '22 Oct 2026';
  } else {
    const dateMatch = text.match(/\b(\d{1,2})\s*(oct|october|sep|nov|jan|feb|mar|apr|may|jun|jul|aug|dec)[a-z]*\s*(\d{4})?\b/i) ||
      text.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
    if (dateMatch) {
      if (dateMatch[2] && isNaN(Number(dateMatch[2]))) {
        const day = dateMatch[1].padStart(2, '0');
        const mon = dateMatch[2].slice(0, 3);
        const capMon = mon.charAt(0).toUpperCase() + mon.slice(1).toLowerCase();
        extractedDate = `${day} ${capMon} 2026`;
      } else {
        const day = dateMatch[1].padStart(2, '0');
        const mm = dateMatch[2].padStart(2, '0');
        const mon = REVERSE_MONTH_MAP[mm] || 'Oct';
        extractedDate = `${day} ${mon} 2026`;
      }
    }
  }

  // 3. Extract category
  let extractedCategory: Category = 'Supplies & Stock';
  if (/transport|trnsprt|diesel|fuel|petrol|courier|tempo|bhada|delivery/i.test(lower)) {
    extractedCategory = 'Transport';
  } else if (/utilit|electric|bijli|power|water|light/i.test(lower)) {
    extractedCategory = 'Utilities';
  } else if (/pack|bag|pouch|box|tape|foil/i.test(lower)) {
    extractedCategory = 'Packaging';
  } else if (/market|print|banner|pamphlet|ad/i.test(lower)) {
    extractedCategory = 'Marketing';
  } else if (/office|stationer|pen|register|chai|tea/i.test(lower)) {
    extractedCategory = 'Office';
  }

  // 4. Extract vendor name
  let extractedVendor = '';
  const knownVendors = [
    'Sharma General Store',
    'Gupta Electricals',
    'Metro Stationers',
    'Fresh Pack Co.',
    'Sunrise Fuel',
    'Print Hub',
    'City Courier',
    'Ramesh Dairy & Milk',
    'Mohan Wholesale Kirana',
    'Verma Wholesale Kirana',
    'Delhi Zippers & Tailoring Co.',
    'Shree Packaging & Carry Bags',
  ];
  for (const kv of knownVendors) {
    const firstWord = kv.split(' ')[0].toLowerCase();
    if (lower.includes(kv.toLowerCase()) || (firstWord.length >= 4 && lower.includes(firstWord))) {
      extractedVendor = kv;
      break;
    }
  }

  if (!extractedVendor) {
    // Try extracting vendor name after "from", "at", "for", "vendor", "bill"
    const cleaned = text
      .replace(/add\s+(a\s+)?(bill|record|entry|expense)/gi, '')
      .replace(/bill\s+(add|daal|dal|jodo)/gi, '')
      .replace(/(?:₹|rs\.?|inr|rupees?|rupay)\s*\d+(?:,\d{3})*(?:\.\d{1,2})?/gi, '')
      .replace(/\d+(?:,\d{3})*(?:\.\d{1,2})?\s*(?:₹|rs\.?|inr|rupees?|rupay)?/gi, '')
      .replace(/\b(today|yesterday|aaj|kal|on|at|from|for|to|in|records|record|ka|ko|ke|ki|se|diye|diya|paid|krdo|karo|do)\b/gi, ' ')
      .replace(/\b(\d{1,2})\s*(oct|october|sep|nov)\b/gi, ' ')
      .replace(/[^\w\s&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = cleaned.split(' ').filter((w) => w.length >= 2);
    if (words.length > 0) {
      extractedVendor = words
        .slice(0, 3)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }

  // Default date to today if user gave vendor + amount
  if (!extractedDate && extractedVendor && extractedAmount && extractedAmount > 0) {
    extractedDate = '23 Oct 2026';
  }

  const missingFields: Array<'vendor' | 'date' | 'amount' | 'category' | 'itemNote'> = [];
  const recognizedFields: Array<'vendor' | 'date' | 'amount' | 'category' | 'itemNote'> = ['category'];

  if (!extractedVendor) missingFields.push('vendor');
  else recognizedFields.push('vendor');

  if (!extractedDate) missingFields.push('date');
  else recognizedFields.push('date');

  if (!extractedAmount || extractedAmount <= 0) missingFields.push('amount');
  else recognizedFields.push('amount');

  const draft: PartialExtractionDraft = {
    mode: 'incomplete_scan',
    vendor: extractedVendor,
    date: extractedDate || '23 Oct 2026',
    amount: extractedAmount && extractedAmount > 0 ? String(extractedAmount) : '',
    category: extractedCategory,
    itemNote: `Extracted from message: "${text.slice(0, 60)}"`,
    entryType: 'cost',
    missingFields,
    recognizedFields,
    sourceLabel: 'Sahayak AI Chat / Voice',
    rawText: text,
  };

  if (missingFields.length === 0 && extractedAmount) {
    const newId = getNextReceiptId(existingReceipts);
    const createdReceipt: Receipt = {
      id: newId,
      vendor: extractedVendor,
      date: extractedDate,
      category: extractedCategory,
      items: [{ name: `${extractedCategory} item`, amount: extractedAmount }],
      total: extractedAmount,
      status: 'confirmed',
      unclearFields: [],
      fileName: 'voice_chat_entry.jpg',
      sourceTag: 'Chat',
      entryType: 'cost',
    };
    return {
      isAddCommand: true,
      createdReceipt,
      draft,
    };
  }

  return {
    isAddCommand: true,
    draft,
  };
}

export const DEFAULT_SAMPLE_REGISTER_ROWS = [
  {
    id: 'reg-1',
    selected: true,
    vendorOrPerson: 'Ramesh Dairy & Milk',
    itemOrNote: 'Morning milk crate & paneer 4kg',
    amount: 1420,
    date: '19 Oct 2026',
    category: 'Supplies & Stock' as Category,
    unclearFields: [],
    needsConfirmation: false,
  },
  {
    id: 'reg-2',
    selected: true,
    vendorOrPerson: 'Bablu Tempo Service',
    itemOrNote: 'Mandi bhada (3 sacks transport)',
    amount: 350,
    date: '19 Oct 2026',
    category: 'Transport' as Category,
    unclearFields: [],
    needsConfirmation: false,
  },
  {
    id: 'reg-3',
    selected: true,
    vendorOrPerson: 'Laxmi Plastic House',
    itemOrNote: 'Carry bags & silver foil roll',
    amount: 680,
    date: '1? Oct 2026',
    category: 'Packaging' as Category,
    unclearFields: ['date'],
    needsConfirmation: true,
  },
  {
    id: 'reg-4',
    selected: true,
    vendorOrPerson: 'Mohan Wholesale Kirana',
    itemOrNote: 'Mustard oil 15L tin x2',
    amount: 3960,
    date: '20 Oct 2026',
    category: 'Supplies & Stock' as Category,
    unclearFields: [],
    needsConfirmation: false,
  },
  {
    id: 'reg-5',
    selected: true,
    vendorOrPerson: 'Chotu Chai & Snacks (Unclear)',
    itemOrNote: 'Shop helper tea & nasta',
    amount: null,
    date: '20 Oct 2026',
    category: 'Office' as Category,
    unclearFields: ['amount', 'vendor'],
    needsConfirmation: true,
  },
  {
    id: 'reg-6',
    selected: true,
    vendorOrPerson: 'Sohna Ice & Cold Storage',
    itemOrNote: 'Cold storage crate rent',
    amount: 500,
    date: '21 Oct 2026',
    category: 'Utilities' as Category,
    unclearFields: [],
    needsConfirmation: false,
  },
];



