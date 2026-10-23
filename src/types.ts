export type Category =
  | 'Utilities'
  | 'Supplies & Stock'
  | 'Marketing'
  | 'Transport'
  | 'Packaging'
  | 'Office';

export const CATEGORIES: Category[] = [
  'Utilities',
  'Supplies & Stock',
  'Marketing',
  'Transport',
  'Packaging',
  'Office',
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Utilities: '#0D9F6E',
  'Supplies & Stock': '#FFB800',
  Marketing: '#E5488C',
  Transport: '#10B981',
  Packaging: '#17A673',
  Office: '#F97316',
};

export const CATEGORY_BAR_CLASSES: Record<Category, string> = {
  Utilities: 'bg-[#0D9F6E]',
  'Supplies & Stock': 'bg-[#FFB800]',
  Marketing: 'bg-[#E5488C]',
  Transport: 'bg-[#10B981]',
  Packaging: 'bg-[#17A673]',
  Office: 'bg-[#F97316]',
};

export const CATEGORY_TAG_CLASSES: Record<Category, string> = {
  Utilities: 'bg-[#DDF7EE] text-[#0D9F6E] border-[#0D9F6E]/25',
  'Supplies & Stock': 'bg-[#FFF1CC] text-[#8A6100] border-[#FFB800]/40',
  Marketing: 'bg-[#FCE8F1] text-[#B82062] border-[#E5488C]/30',
  Transport: 'bg-[#E6F9F3] text-[#047857] border-[#10B981]/30',
  Packaging: 'bg-[#E2F6EA] text-[#0B7A43] border-[#17A673]/30',
  Office: 'bg-[#FFF0E5] text-[#C2410C] border-[#F97316]/30',
};

export type ReceiptStatus = 'confirmed' | 'needs_review' | 'possible_duplicate';

export type LanguageCode =
  | 'en'
  | 'hi'
  | 'hinglish'
  | 'mr'
  | 'gu'
  | 'bn'
  | 'ta'
  | 'te'
  | 'kn'
  | 'ml'
  | 'pa';

export type SpeechCode =
  | 'en-IN'
  | 'hi-IN'
  | 'mr-IN'
  | 'gu-IN'
  | 'bn-IN'
  | 'ta-IN'
  | 'te-IN'
  | 'kn-IN'
  | 'ml-IN'
  | 'pa-IN';

export interface LanguageOption {
  code: LanguageCode;
  displayScript: string;
  englishName: string;
  speechCode: SpeechCode;
  sampleGreeting: string;
}

export interface ReceiptItem {
  name: string;
  amount: number;
  quantity?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
}

export interface Receipt {
  id: string;
  vendor: string;
  date: string;
  category: Category;
  items: ReceiptItem[];
  total: number;
  status: ReceiptStatus;
  unclearFields: string[];
  fileName: string;
  gstin?: string;
  address?: string;
  billNo?: string;
  duplicateOfId?: string;
  imageUrl?: string;
  fileType?: string;
  currency?: string;
  subtotal?: number | null;
  tax?: number | null;
  confidenceScore?: number;
  overrideConfirmed?: boolean;
  arithmeticMismatch?: boolean;
  arithmeticMessage?: string;
  sourceTag?: 'Scan' | 'Upload' | 'Register' | 'Video' | 'Manual' | 'Voice' | 'Chat';
  entryType?: 'cost' | 'revenue';
}

export interface RevenueEntry {
  id: string;
  label: string;
  date: string;
  amount: number;
  channel?: 'Cash' | 'UPI' | 'Wholesale' | 'Online';
}

export interface PartialExtractionDraft {
  mode: 'incomplete_scan' | 'manual_one_tap';
  vendor: string;
  date: string;
  amount: string;
  category: Category;
  itemNote: string;
  billNo?: string;
  gstin?: string;
  entryType?: 'cost' | 'revenue';
  missingFields: Array<'vendor' | 'date' | 'amount' | 'category' | 'itemNote'>;
  recognizedFields: Array<'vendor' | 'date' | 'amount' | 'category' | 'itemNote'>;
  sourceLabel?: string;
  imageUrl?: string;
  fileName?: string;
  rawText?: string;
}

export interface RegisterRowEntry {
  id: string;
  selected: boolean;
  vendorOrPerson: string;
  itemOrNote: string;
  amount: number | null;
  date: string;
  category: Category;
  unclearFields: string[];
  needsConfirmation: boolean;
}

export interface QueuedUpload {
  id: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  imageUrl?: string;
  base64Data?: string;
  status: 'queued' | 'reading' | 'error';
  errorMessage?: string;
}

export interface ExtractedReceiptData {
  vendor_name: string | null;
  receipt_date: string | null;
  currency: string | null;
  items: Array<{
    name: string;
    quantity?: number | null;
    unit_price?: number | null;
    line_total?: number | null;
  }>;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  confidence_score: number;
  unclear_fields: string[];
  suggested_category: string | null;
  is_receipt?: boolean;
  not_receipt_reason?: string | null;
  bill_number?: string | null;
  gstin?: string | null;
  address?: string | null;
}

export interface ChatAction {
  type:
    | 'navigate'
    | 'open_scan'
    | 'open_review'
    | 'show_duplicates'
    | 'added_record'
    | 'open_completion_popup';
  section?: AppSection;
  receiptId?: string;
  label?: string;
  draft?: PartialExtractionDraft;
  createdReceipt?: Receipt;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: string[];
  unreviewedIds?: string[];
  action?: ChatAction;
}

export interface ShopSettings {
  shopName: string;
  ownerName: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  currencySymbol: string;
  duplicateDetectionEnabled: boolean;
  flagUnclearDates: boolean;
  autoCategorizeReceipts: boolean;
  monthlyBudget: number;
}

export type AppSection = 'Scan' | 'Upload' | 'Review' | 'Records' | 'Insights' | 'Settings';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  receiptId?: string;
  actionLabel?: string;
}

