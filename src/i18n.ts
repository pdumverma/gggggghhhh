import { LanguageCode, LanguageOption } from './types';

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'en',
    displayScript: 'English',
    englishName: 'English',
    speechCode: 'en-IN',
    sampleGreeting: 'Manage bills & expenses in English',
  },
  {
    code: 'hi',
    displayScript: 'हिंदी (Hindi)',
    englishName: 'Hindi',
    speechCode: 'hi-IN',
    sampleGreeting: 'अपने दुकान के बिल और खर्चे हिंदी में देखें',
  },
  {
    code: 'hinglish',
    displayScript: 'Hinglish',
    englishName: 'Hinglish',
    speechCode: 'en-IN',
    sampleGreeting: 'Apne dukan ke bills aur kharche Hinglish me manage karein',
  },
  {
    code: 'mr',
    displayScript: 'मराठी (Marathi)',
    englishName: 'Marathi',
    speechCode: 'mr-IN',
    sampleGreeting: 'दुकानाची बिले आणि खर्च मराठीत पहा',
  },
  {
    code: 'gu',
    displayScript: 'ગુજરાતી (Gujarati)',
    englishName: 'Gujarati',
    speechCode: 'gu-IN',
    sampleGreeting: 'દુકાનના બિલ અને ખર્ચ ગુજરાતીમાં જુઓ',
  },
  {
    code: 'bn',
    displayScript: 'বাংলা (Bengali)',
    englishName: 'Bengali',
    speechCode: 'bn-IN',
    sampleGreeting: 'দোকানের বিল এবং খরচ বাংলায় পরিচালনা করুন',
  },
  {
    code: 'ta',
    displayScript: 'தமிழ் (Tamil)',
    englishName: 'Tamil',
    speechCode: 'ta-IN',
    sampleGreeting: 'கடை பில்கள் மற்றும் செலவுகளை தமிழில் நிர்வகிக்கவும்',
  },
  {
    code: 'te',
    displayScript: 'తెలుగు (Telugu)',
    englishName: 'Telugu',
    speechCode: 'te-IN',
    sampleGreeting: 'దుకాణం బిల్లులు మరియు ఖర్చులను తెలుగులో నిర్వహించండి',
  },
  {
    code: 'kn',
    displayScript: 'ಕನ್ನಡ (Kannada)',
    englishName: 'Kannada',
    speechCode: 'kn-IN',
    sampleGreeting: 'ಅಂಗಡಿ ಬಿಲ್‌ಗಳು ಮತ್ತು ವೆಚ್ಚಗಳನ್ನು ಕನ್ನಡದಲ್ಲಿ ನಿರ್ವಹಿಸಿ',
  },
  {
    code: 'ml',
    displayScript: 'മലയാളം (Malayalam)',
    englishName: 'Malayalam',
    speechCode: 'ml-IN',
    sampleGreeting: 'കടയിലെ ബില്ലുകളും ചെലവുകളും മലയാളത്തിൽ കൈകാര്യം ചെയ്യുക',
  },
  {
    code: 'pa',
    displayScript: 'ਪੰਜਾਬੀ (Punjabi)',
    englishName: 'Punjabi',
    speechCode: 'pa-IN',
    sampleGreeting: 'ਦੁਕਾਨ ਦੇ ਬਿੱਲ ਅਤੇ ਖਰਚੇ ਪੰਜਾਬੀ ਵਿੱਚ ਦੇਖੋ',
  },
];

export function getLanguageOption(code: LanguageCode): LanguageOption {
  return LANGUAGE_OPTIONS.find((l) => l.code === code) || LANGUAGE_OPTIONS[0];
}

export interface TranslationStrings {
  // Navigation
  navScan: string;
  navUpload: string;
  navReview: string;
  navRecords: string;
  navInsights: string;
  navSettings: string;
  navLogout: string;
  languageLabel: string;

  // Scan Screen & Sheet
  scanTitle: string;
  scanSubtitle: string;
  scanBillBtn: string;
  uploadPhotoBtn: string;
  uploadRegisterBtn: string;
  startVideoScanBtn: string;
  frameGuideHint: string;
  cameraDeniedMessage: string;
  cameraFallbackActive: string;

  // Toasts (Feature 3)
  toastBillReceived: string;
  toastBillAddedTapReview: string;
  toastDuplicateAddedTapReview: string;
  toastRegisterAdded: (count: number) => string;

  // Register Upload (Feature 4)
  registerFoundTitle: (count: number) => string;
  registerAddAllBtn: string;
  registerPleaseConfirm: string;
  registerSourceTag: string;

  // Headings & Buttons across existing screens
  uploadHeading: string;
  uploadSubheading: string;
  reviewHeading: string;
  confirmAndSaveBtn: string;
  saveDraftBtn: string;
  markDuplicateBtn: string;
  skipBtn: string;
  recordsHeading: string;
  exportCsvBtn: string;
  confirmedTotalLabel: string;
  statusConfirmed: string;
  statusNeedsReview: string;
  statusPossibleDuplicate: string;
  insightsHeading: string;
  insightsSubheading: string;
  totalSpendLabel: string;
  averageReceiptLabel: string;
  topCategoryLabel: string;
  duplicatesCaughtLabel: string;
  spendByCategoryHeading: string;
  askYourRecordsHeading: string;
  settingsHeading: string;

  // Sahayak Chatbot (Feature 5)
  chatbotName: string;
  chatbotSubtitle: string;
  chatbotPlaceholder: string;
  chatbotSend: string;
  chatbotMicStart: string;
  chatbotMicListening: string;
  chatbotSpeakReply: string;
  chatbotOpenInReview: (id: string) => string;
  chatbotGreeting: string;

  // Video Session (Feature 6)
  videoWatchingBanner: string;
  videoBillsCaught: (count: number) => string;
  videoEndCall: string;
  videoMute: string;
  videoUnmute: string;
  videoSwitchCamera: string;
  videoSummaryTitle: (added: number, duplicates: number) => string;
  videoReviewNowBtn: string;
  videoCardAdded: string;
  videoCardDuplicate: string;
  videoVoiceCatch: (vendor: string, amountStr: string, isDup: boolean) => string;
}

const EN_STRINGS: TranslationStrings = {
  navScan: 'Scan',
  navUpload: 'Upload',
  navReview: 'Review',
  navRecords: 'Records',
  navInsights: 'Insights',
  navSettings: 'Settings',
  navLogout: 'Logout',
  languageLabel: 'Language',

  scanTitle: 'Scan Shop Bill',
  scanSubtitle: 'Point your camera at a bill or register page for instant AI extraction',
  scanBillBtn: 'Scan Bill',
  uploadPhotoBtn: 'Upload photo',
  uploadRegisterBtn: 'Upload register page',
  startVideoScanBtn: 'Start video scan',
  frameGuideHint: 'Align bill edges inside the frame — unclear fields will be flagged for review',
  cameraDeniedMessage:
    'Camera or microphone access is blocked. Please allow camera permission in your browser address bar, or use the live preview / upload buttons below.',
  cameraFallbackActive: 'Ready to capture bill frame',

  toastBillReceived: 'Bill received — adding to Records…',
  toastBillAddedTapReview: '1 bill added to Records — tap to review',
  toastDuplicateAddedTapReview: 'Possible duplicate flagged in Records — tap to review',
  toastRegisterAdded: (count) => `${count} register entries added to Records (Needs review) — tap to review`,

  registerFoundTitle: (count) => `We found ${count} entries in this register page`,
  registerAddAllBtn: 'Add all to Records',
  registerPleaseConfirm: 'please confirm',
  registerSourceTag: 'Register',

  uploadHeading: 'AI Receipt Scanner',
  uploadSubheading: 'Scan fabric invoices, garment supplies, tailor receipts, and packaging bills using Gemini AI',
  reviewHeading: 'Review receipt',
  confirmAndSaveBtn: 'Confirm & save',
  saveDraftBtn: 'Save draft',
  markDuplicateBtn: 'Mark duplicate',
  skipBtn: 'Skip',
  recordsHeading: 'Records',
  exportCsvBtn: 'Export CSV',
  confirmedTotalLabel: 'Confirmed total',
  statusConfirmed: 'Confirmed',
  statusNeedsReview: 'Needs review',
  statusPossibleDuplicate: 'Possible duplicate',
  insightsHeading: 'Insights',
  insightsSubheading: 'Built only from confirmed records',
  totalSpendLabel: 'Total spend',
  averageReceiptLabel: 'Average receipt',
  topCategoryLabel: 'Top category',
  duplicatesCaughtLabel: 'Duplicates caught',
  spendByCategoryHeading: 'Spend by category',
  askYourRecordsHeading: 'Ask your records',
  settingsHeading: 'Settings',

  chatbotName: 'Sahayak',
  chatbotSubtitle: 'Confirmed Ledger Assistant',
  chatbotPlaceholder: 'Ask totals, biggest expense, or say "scan a bill"...',
  chatbotSend: 'Send',
  chatbotMicStart: 'Speak question',
  chatbotMicListening: 'Listening...',
  chatbotSpeakReply: 'Listen to reply',
  chatbotOpenInReview: (id) => `Open ${id} in Review`,
  chatbotGreeting: 'Namaste! I am Sahayak. Ask me about your confirmed spend, biggest expense, or tell me to "open records", "show my duplicates", or "scan a bill".',

  videoWatchingBanner: 'AI is watching — show your bills one by one',
  videoBillsCaught: (count) => `${count} bill${count === 1 ? '' : 's'} caught`,
  videoEndCall: 'End call',
  videoMute: 'Mute',
  videoUnmute: 'Unmute',
  videoSwitchCamera: 'Switch camera',
  videoSummaryTitle: (added, duplicates) =>
    `Video session complete: ${added} bill${added === 1 ? '' : 's'} added to Records (Needs review), ${duplicates} possible duplicate${duplicates === 1 ? '' : 's'} skipped`,
  videoReviewNowBtn: 'Review them now',
  videoCardAdded: 'Added to Records · Needs review',
  videoCardDuplicate: 'Possible duplicate · Skipped',
  videoVoiceCatch: (vendor, amountStr, isDup) =>
    isDup
      ? `Possible duplicate skipped — ${vendor}, ${amountStr}`
      : `Caught 1 bill — ${vendor}, ${amountStr} — added to Records`,
};

const HI_STRINGS: TranslationStrings = {
  navScan: 'स्कैन (Scan)',
  navUpload: 'अपलोड (Upload)',
  navReview: 'समीक्षा (Review)',
  navRecords: 'रिकॉर्ड्स (Records)',
  navInsights: 'हिसाब (Insights)',
  navSettings: 'सेटिंग्स (Settings)',
  navLogout: 'लॉग आउट',
  languageLabel: 'भाषा (Language)',

  scanTitle: 'दुकान का बिल स्कैन करें',
  scanSubtitle: 'तुरंत विवरण निकालने के लिए कैमरे को बिल या खाता रजिस्टर पर रखें',
  scanBillBtn: 'Scan Bill (बिल स्कैन करें)',
  uploadPhotoBtn: 'Upload photo (फोटो अपलोड करें)',
  uploadRegisterBtn: 'Upload register page (खाता पन्ना अपलोड करें)',
  startVideoScanBtn: 'Start video scan (वीडियो स्कैन)',
  frameGuideHint: 'बिल को फ्रेम के अंदर रखें — अस्पष्ट अक्षर समीक्षा के लिए चिह्नित होंगे',
  cameraDeniedMessage:
    'कैमरा या माइक की अनुमति बंद है। कृपया ब्राउज़र की सेटिंग में कैमरा अनुमति दें, या नीचे दिए गए विकल्पों का उपयोग करें।',
  cameraFallbackActive: 'बिल स्कैन करने के लिए तैयार',

  toastBillReceived: 'Bill received — adding to Records… (बिल मिल गया — रिकॉर्ड्स में जोड़ा जा रहा है…)',
  toastBillAddedTapReview: '1 bill added to Records — tap to review (1 बिल रिकॉर्ड्स में जुड़ा — समीक्षा के लिए टैप करें)',
  toastDuplicateAddedTapReview: 'Possible duplicate — संभावित डुप्लीकेट रिकॉर्ड्स में जुड़ा — समीक्षा के लिए टैप करें',
  toastRegisterAdded: (count) => `${count} खाता प्रविष्टियाँ रिकॉर्ड्स में जुड़ीं (Needs review) — समीक्षा करें`,

  registerFoundTitle: (count) => `We found ${count} entries in this register page (इस खाता पन्ने में ${count} एंट्री मिलीं)`,
  registerAddAllBtn: 'Add all to Records (सभी को रिकॉर्ड्स में जोड़ें)',
  registerPleaseConfirm: 'please confirm (कृपया पुष्टि करें)',
  registerSourceTag: 'Register',

  uploadHeading: 'AI रसीद स्कैनर (Upload)',
  uploadSubheading: 'Gemini AI से कपड़े के बिल, दर्जी रसीद और पैकेजिंग बिल स्कैन करें',
  reviewHeading: 'रसीद की समीक्षा (Review receipt)',
  confirmAndSaveBtn: 'Confirm & save (पुष्टि करें और सहेजें)',
  saveDraftBtn: 'ड्राफ्ट सहेजें',
  markDuplicateBtn: 'डुप्लीकेट चिह्नित करें',
  skipBtn: 'आगे बढ़ें (Skip)',
  recordsHeading: 'रिकॉर्ड्स (Records)',
  exportCsvBtn: 'Export CSV (CSV डाउनलोड)',
  confirmedTotalLabel: 'कुल पक्का खर्च (Confirmed total)',
  statusConfirmed: 'Confirmed',
  statusNeedsReview: 'Needs review',
  statusPossibleDuplicate: 'Possible duplicate',
  insightsHeading: 'खर्च विश्लेषण (Insights)',
  insightsSubheading: 'केवल पक्के (Confirmed) रिकॉर्ड्स से गणना',
  totalSpendLabel: 'कुल खर्च (Total spend)',
  averageReceiptLabel: 'औसत बिल (Average receipt)',
  topCategoryLabel: 'सबसे बड़ा मद (Top category)',
  duplicatesCaughtLabel: 'पकड़े गए डुप्लीकेट',
  spendByCategoryHeading: 'मद के अनुसार खर्च (Spend by category)',
  askYourRecordsHeading: 'अपने रिकॉर्ड्स से पूछें',
  settingsHeading: 'सेटिंग्स (Settings)',

  chatbotName: 'Sahayak',
  chatbotSubtitle: 'आपका दुकान खाता सहायक',
  chatbotPlaceholder: 'खर्च पूछें या कहें "मेरा डुप्लीकेट दिखाओ", "बिल स्कैन करो"...',
  chatbotSend: 'पूछें',
  chatbotMicStart: 'बोलकर पूछें',
  chatbotMicListening: 'सुन रहा हूँ...',
  chatbotSpeakReply: 'जवाब सुनें',
  chatbotOpenInReview: (id) => `${id} को Review में खोलें`,
  chatbotGreeting: 'नमस्ते! मैं सहायक हूँ। आप मुझसे इस महीने का पक्का खर्च, सबसे बड़ा खर्च पूछ सकते हैं, या कहें "रिकॉर्ड्स खोलो", "डुप्लीकेट दिखाओ" या "बिल स्कैन करो"।',

  videoWatchingBanner: 'AI is watching — show your bills one by one (AI देख रहा है — एक-एक करके बिल दिखाएं)',
  videoBillsCaught: (count) => `${count} bills caught (${count} बिल मिले)`,
  videoEndCall: 'End call (कॉल समाप्त करें)',
  videoMute: 'Mute (म्यूट)',
  videoUnmute: 'Unmute (अनम्यूट)',
  videoSwitchCamera: 'Switch camera (कैमरा बदलें)',
  videoSummaryTitle: (added, duplicates) =>
    `Video session complete: ${added} bills added to Records (Needs review), ${duplicates} possible duplicate skipped`,
  videoReviewNowBtn: 'Review them now (अभी समीक्षा करें)',
  videoCardAdded: 'Added to Records · Needs review',
  videoCardDuplicate: 'Possible duplicate · Skipped',
  videoVoiceCatch: (vendor, amountStr, isDup) =>
    isDup
      ? `यह बिल डुप्लीकेट लग रहा है — ${vendor}, ${amountStr} — छोड़ दिया गया है`
      : `एक बिल मिल गया — ${vendor}, ${amountStr} — रिकॉर्ड्स में डाल दिया है`,
};

const HINGLISH_STRINGS: TranslationStrings = {
  navScan: 'Scan',
  navUpload: 'Upload',
  navReview: 'Review',
  navRecords: 'Records',
  navInsights: 'Insights',
  navSettings: 'Settings',
  navLogout: 'Logout',
  languageLabel: 'Bhasha / Language',

  scanTitle: 'Dukan ka Bill Scan Karein',
  scanSubtitle: 'Bill ya khata register ke upar camera rakhein, AI turant read karega',
  scanBillBtn: 'Scan Bill',
  uploadPhotoBtn: 'Upload photo',
  uploadRegisterBtn: 'Upload register page',
  startVideoScanBtn: 'Start video scan',
  frameGuideHint: 'Bill ko frame ke andar rakhein — unclear fields amber highlight honge',
  cameraDeniedMessage:
    'Camera ya mic permission off hai. Browser address bar se camera allow karein, ya neeche diye buttons se photo upload karein.',
  cameraFallbackActive: 'Bill scan ke liye ready hai',

  toastBillReceived: 'Bill received — adding to Records…',
  toastBillAddedTapReview: '1 bill added to Records — tap to review',
  toastDuplicateAddedTapReview: 'Possible duplicate mila — Records me add hua, tap to review',
  toastRegisterAdded: (count) => `${count} khata entries Records me add ho gayi (Needs review) — tap to review`,

  registerFoundTitle: (count) => `We found ${count} entries in this register page`,
  registerAddAllBtn: 'Add all to Records',
  registerPleaseConfirm: 'please confirm',
  registerSourceTag: 'Register',

  uploadHeading: 'AI Receipt Scanner',
  uploadSubheading: 'Apne dukan ke bills, kapde ke invoices aur khata pages upload karein',
  reviewHeading: 'Review receipt',
  confirmAndSaveBtn: 'Confirm & save',
  saveDraftBtn: 'Save draft',
  markDuplicateBtn: 'Mark duplicate',
  skipBtn: 'Skip',
  recordsHeading: 'Records',
  exportCsvBtn: 'Export CSV',
  confirmedTotalLabel: 'Confirmed total',
  statusConfirmed: 'Confirmed',
  statusNeedsReview: 'Needs review',
  statusPossibleDuplicate: 'Possible duplicate',
  insightsHeading: 'Insights',
  insightsSubheading: 'Sirf confirmed records se banaya gaya hisaab',
  totalSpendLabel: 'Total spend',
  averageReceiptLabel: 'Average receipt',
  topCategoryLabel: 'Top category',
  duplicatesCaughtLabel: 'Duplicates caught',
  spendByCategoryHeading: 'Spend by category',
  askYourRecordsHeading: 'Ask your records',
  settingsHeading: 'Settings',

  chatbotName: 'Sahayak',
  chatbotSubtitle: 'Aapka Dukan Hisaab Assistant',
  chatbotPlaceholder: 'Kharcha puchein ya bolein "show my duplicates", "scan a bill"...',
  chatbotSend: 'Bhejein',
  chatbotMicStart: 'Bol kar puchein',
  chatbotMicListening: 'Sun raha hoon...',
  chatbotSpeakReply: 'Jawab sunein',
  chatbotOpenInReview: (id) => `${id} ko Review me kholein`,
  chatbotGreeting: 'Namaste! Main Sahayak hoon. Aap mujhse confirmed bills ka total, sabse bada kharcha puch sakte hain, ya bolein "open records", "show my duplicates", ya "scan a bill".',

  videoWatchingBanner: 'AI is watching — show your bills one by one',
  videoBillsCaught: (count) => `${count} bills caught`,
  videoEndCall: 'End call',
  videoMute: 'Mute',
  videoUnmute: 'Unmute',
  videoSwitchCamera: 'Switch camera',
  videoSummaryTitle: (added, duplicates) =>
    `Video session complete: ${added} bills added to Records (Needs review), ${duplicates} possible duplicate skipped`,
  videoReviewNowBtn: 'Review them now',
  videoCardAdded: 'Added to Records · Needs review',
  videoCardDuplicate: 'Possible duplicate · Skipped',
  videoVoiceCatch: (vendor, amountStr, isDup) =>
    isDup
      ? `Possible duplicate skip kiya — ${vendor}, ${amountStr}`
      : `Ek bill mil gaya — ${vendor}, ${amountStr} — Records me daal diya hai`,
};

function makeRegionalStrings(
  overrides: Partial<TranslationStrings>
): TranslationStrings {
  return {
    ...EN_STRINGS,
    ...overrides,
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationStrings> = {
  en: EN_STRINGS,
  hi: HI_STRINGS,
  hinglish: HINGLISH_STRINGS,
  mr: makeRegionalStrings({
    navScan: 'स्कॅन (Scan)',
    navUpload: 'अपलोड (Upload)',
    navReview: 'तपासणी (Review)',
    navRecords: 'नोंदी (Records)',
    navInsights: 'माहिती (Insights)',
    navSettings: 'सेटिंग्ज (Settings)',
    navLogout: 'लॉग आउट',
    scanTitle: 'दुकानाचे बिल स्कॅन करा',
    scanBillBtn: 'Scan Bill (बिल स्कॅन करा)',
    uploadPhotoBtn: 'Upload photo (फोटो अपलोड करा)',
    uploadRegisterBtn: 'Upload register page (वहीचे पान अपलोड करा)',
    startVideoScanBtn: 'Start video scan (व्हिडिओ स्कॅन)',
    cameraDeniedMessage: 'कॅमेरा किंवा माइकची परवानगी नाकारली आहे. कृपया ब्राउझर सेटिंग्जमध्ये परवानगी द्या.',
    chatbotGreeting: 'नमस्कार! मी सहायक आहे. तुम्ही मला तुमच्या कन्फर्म केलेल्या बिलांचा खर्च विचारू शकता किंवा "open records", "scan a bill" सांगू शकता.',
    videoVoiceCatch: (vendor, amountStr, isDup) =>
      isDup
        ? `संभाव्य डुप्लिकेट वगळले — ${vendor}, ${amountStr}`
        : `एक बिल मिळाले — ${vendor}, ${amountStr} — रेकॉर्डमध्ये जोडले आहे`,
  }),
  gu: makeRegionalStrings({
    navScan: 'સ્કેન (Scan)',
    navUpload: 'અપલોડ (Upload)',
    navReview: 'ચકાસણી (Review)',
    navRecords: 'રેકોર્ડ્સ (Records)',
    navInsights: 'હિસાબ (Insights)',
    navSettings: 'સેટિંગ્સ (Settings)',
    navLogout: 'લૉગ આઉટ',
    scanTitle: 'દુકાનનું બિલ સ્કેન કરો',
    scanBillBtn: 'Scan Bill (બિલ સ્કેન કરો)',
    uploadPhotoBtn: 'Upload photo (ફોટો અપલોડ કરો)',
    uploadRegisterBtn: 'Upload register page (ખાતાવહી પાનું અપલોડ કરો)',
    startVideoScanBtn: 'Start video scan (વિડિયો સ્કેન)',
    cameraDeniedMessage: 'કેમેરા કે માઇકની પરવાનગી બંધ છે. કૃપા કરીને બ્રાઉઝરમાં પરવાનગી આપો.',
    chatbotGreeting: 'નમસ્તે! હું સહાયક છું. તમે મને કન્ફર્મ થયેલા બિલનો હિસાબ પૂછી શકો છો અથવા "open records", "scan a bill" કહી શકો છો.',
    videoVoiceCatch: (vendor, amountStr, isDup) =>
      isDup
        ? `ડુપ્લિકેટ બિલ છોડી દીધું — ${vendor}, ${amountStr}`
        : `એક બિલ મળી ગયું — ${vendor}, ${amountStr} — રેકોર્ડ્સમાં ઉમેરાઈ ગયું છે`,
  }),
  bn: makeRegionalStrings({
    navScan: 'স্ক্যান (Scan)',
    navUpload: 'আপলোড (Upload)',
    navReview: 'রিভিউ (Review)',
    navRecords: 'রেকর্ডস (Records)',
    navInsights: 'হিসাব (Insights)',
    navSettings: 'সেটিংস (Settings)',
    navLogout: 'লগ আউট',
    scanTitle: 'দোকানের বিল স্ক্যান করুন',
    scanBillBtn: 'Scan Bill (বিল স্ক্যান করুন)',
    uploadPhotoBtn: 'Upload photo (ছবি আপলোড করুন)',
    uploadRegisterBtn: 'Upload register page (খাতার পৃষ্ঠা আপলোড করুন)',
    startVideoScanBtn: 'Start video scan (ভিডিও স্ক্যান)',
    cameraDeniedMessage: 'ক্যামেরা বা মাইক্রোফোনের অনুমতি নেই। অনুগ্রহ করে ব্রাউজারে অনুমতি দিন।',
    chatbotGreeting: 'নমস্কার! আমি সহায়ক। আপনার কনফার্ম করা বিলের হিসাব জানতে চান বা বলুন "open records", "scan a bill"।',
    videoVoiceCatch: (vendor, amountStr, isDup) =>
      isDup
        ? `ডুপ্লিকেট বিল বাদ দেওয়া হয়েছে — ${vendor}, ${amountStr}`
        : `একটি বিল পাওয়া গেছে — ${vendor}, ${amountStr} — রেকর্ডে যোগ করা হয়েছে`,
  }),
  ta: makeRegionalStrings({
    navScan: 'ஸ்கேன் (Scan)',
    navUpload: 'அப்লোட் (Upload)',
    navReview: 'சரிபார் (Review)',
    navRecords: 'பதிவுகள் (Records)',
    navInsights: 'விவரங்கள் (Insights)',
    navSettings: 'அமைப்புகள் (Settings)',
    navLogout: 'வெளியேறு',
    scanTitle: 'கடை பில்லை ஸ்கேன் செய்யவும்',
    scanBillBtn: 'Scan Bill (பில் ஸ்கேன்)',
    uploadPhotoBtn: 'Upload photo (புகைப்படம் பதிவேற்று)',
    uploadRegisterBtn: 'Upload register page (கணக்கு நோட்டு பக்கம்)',
    startVideoScanBtn: 'Start video scan (வீடியோ ஸ்கேன்)',
    cameraDeniedMessage: 'கேமரா அல்லது மைக் அனுமதி மறுக்கப்பட்டுள்ளது. பிரவுசரில் அனுமதி வழங்கவும்.',
    chatbotGreeting: 'வணக்கம்! நான் சஹாயக். உறுதிப்படுத்தப்பட்ட பில்களின் செலவுகளைக் கேட்கலாம் அல்லது "open records", "scan a bill" எனக் கூறலாம்.',
    videoVoiceCatch: (vendor, amountStr, isDup) =>
      isDup
        ? `நகல் பில் தவிர்க்கப்பட்டது — ${vendor}, ${amountStr}`
        : `ஒரு பில் கிடைத்தது — ${vendor}, ${amountStr} — பதிவுகளில் சேர்க்கப்பட்டது`,
  }),
  te: makeRegionalStrings({
    navScan: 'స్కాన్ (Scan)',
    navUpload: 'అప్‌లోడ్ (Upload)',
    navReview: 'రివ్యూ (Review)',
    navRecords: 'రికార్డులు (Records)',
    navInsights: 'విశ్లేషణ (Insights)',
    navSettings: 'సెట్టింగ్‌లు (Settings)',
    navLogout: 'లాగ్ అవుట్',
    scanTitle: 'షాప్ బిల్లును స్కాన్ చేయండి',
    scanBillBtn: 'Scan Bill (బిల్లు స్కాన్)',
    uploadPhotoBtn: 'Upload photo (ఫోటో అప్‌లోడ్)',
    uploadRegisterBtn: 'Upload register page (రిజిస్టర్ పేజీ అప్‌లోడ్)',
    startVideoScanBtn: 'Start video scan (వీడియో స్కాన్)',
    cameraDeniedMessage: 'కెమెరా లేదా మైక్ అనుమతి నిరాకరించబడింది. దయచేసి బ్రౌజర్‌లో అనుమతించండి.',
    chatbotGreeting: 'నమస్కారం! నేను సహాయక్. మీ కన్ఫర్మ్ అయిన బిల్లుల ఖర్చుల గురించి అడగండి లేదా "open records", "scan a bill" అని చెప్పండి.',
    videoVoiceCatch: (vendor, amountStr, isDup) =>
      isDup
        ? `డూప్లికేట్ బిల్లు దాటవేయబడింది — ${vendor}, ${amountStr}`
        : `ఒక బిల్లు దొరికింది — ${vendor}, ${amountStr} — రికార్డులలో చేర్చబడింది`,
  }),
  kn: makeRegionalStrings({
    navScan: 'ಸ್ಕ್ಯಾನ್ (Scan)',
    navUpload: 'ಅಪ್‌ಲೋಡ್ (Upload)',
    navReview: 'ಪರಿಶೀಲನೆ (Review)',
    navRecords: 'ದಾಖಲೆಗಳು (Records)',
    navInsights: 'ಒಳನೋಟ (Insights)',
    navSettings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು (Settings)',
    navLogout: 'ಲಾಗ್ ಔಟ್',
    scanTitle: 'ಅಂಗಡಿ ಬಿಲ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    scanBillBtn: 'Scan Bill (ಬಿಲ್ ಸ್ಕ್ಯಾನ್)',
    uploadPhotoBtn: 'Upload photo (ಫೋಟೋ ಅಪ್‌ಲೋಡ್)',
    uploadRegisterBtn: 'Upload register page (ರಿಜಿಸ್ಟರ್ ಪುಟ ಅಪ್‌ಲೋಡ್)',
    startVideoScanBtn: 'Start video scan (ವೀಡಿಯೊ ಸ್ಕ್ಯಾನ್)',
    cameraDeniedMessage: 'ಕ್ಯಾಮೆರಾ ಅಥವಾ ಮೈಕ್ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಅನುಮತಿಸಿ.',
    chatbotGreeting: 'ನಮಸ್ಕಾರ! ನಾನು ಸಹಾಯಕ್. ನಿಮ್ಮ ದೃಢೀಕರಿಸಿದ ಬಿಲ್‌ಗಳ ಖರ್ಚು ಕೇಳಿ ಅಥವಾ "open records", "scan a bill" ಎಂದು ಹೇಳಿ.',
    videoVoiceCatch: (vendor, amountStr, isDup) =>
      isDup
        ? `ನಕಲಿ ಬಿಲ್ ಬಿಟ್ಟುಬಿಡಲಾಗಿದೆ — ${vendor}, ${amountStr}`
        : `ಒಂದು ಬಿಲ್ ಸಿಕ್ಕಿದೆ — ${vendor}, ${amountStr} — ದಾಖಲೆಗಳಿಗೆ ಸೇರಿಸಲಾಗಿದೆ`,
  }),
  ml: makeRegionalStrings({
    navScan: 'സ്കാൻ (Scan)',
    navUpload: 'അപ്‌ലോഡ് (Upload)',
    navReview: 'പരിശോധന (Review)',
    navRecords: 'റെക്കോർഡുകൾ (Records)',
    navInsights: 'കണക്കുകൾ (Insights)',
    navSettings: 'ക്രമീകരണങ്ങൾ (Settings)',
    navLogout: 'ലോഗ് ഔട്ട്',
    scanTitle: 'കടയിലെ ബിൽ സ്കാൻ ചെയ്യുക',
    scanBillBtn: 'Scan Bill (ബിൽ സ്കാൻ)',
    uploadPhotoBtn: 'Upload photo (ഫോട്ടോ അപ്‌ലോഡ്)',
    uploadRegisterBtn: 'Upload register page (രജിസ്റ്റർ പേജ് അപ്‌ലോഡ്)',
    startVideoScanBtn: 'Start video scan (വീഡിയോ സ്കാൻ)',
    cameraDeniedMessage: 'ക്യാമറ അല്ലെങ്കിൽ മൈക്ക് അനുമതി നിഷേധിച്ചു. ബ്രൗസറിൽ അനുമതി നൽകുക.',
    chatbotGreeting: 'നമസ്കാരം! ഞാൻ സഹായക് ആണ്. സ്ഥിരീകരിച്ച ബില്ലുകളെക്കുറിച്ച് ചോദിക്കാം അല്ലെങ്കിൽ "open records", "scan a bill" എന്ന് പറയാം.',
    videoVoiceCatch: (vendor, amountStr, isDup) =>
      isDup
        ? `ഡ്യൂപ്ലിക്കേറ്റ് ബിൽ ഒഴിവാക്കി — ${vendor}, ${amountStr}`
        : `ഒരു ബിൽ ലഭിച്ചു — ${vendor}, ${amountStr} — റെക്കോർഡുകളിൽ ചേർത്തു`,
  }),
  pa: makeRegionalStrings({
    navScan: 'ਸਕੈਨ (Scan)',
    navUpload: 'ਅੱਪਲੋਡ (Upload)',
    navReview: 'ਸਮੀਖਿਆ (Review)',
    navRecords: 'ਰਿਕਾਰਡ (Records)',
    navInsights: 'ਹਿਸਾਬ (Insights)',
    navSettings: 'ਸੈਟਿੰਗਾਂ (Settings)',
    navLogout: 'ਲੌਗ ਆਉਟ',
    scanTitle: 'ਦੁਕਾਨ ਦਾ ਬਿੱਲ ਸਕੈਨ ਕਰੋ',
    scanBillBtn: 'Scan Bill (ਬਿੱਲ ਸਕੈਨ ਕਰੋ)',
    uploadPhotoBtn: 'Upload photo (ਫੋਟੋ ਅੱਪਲੋਡ ਕਰੋ)',
    uploadRegisterBtn: 'Upload register page (ਖਾਤਾ ਰਜਿਸਟਰ ਪੰਨਾ)',
    startVideoScanBtn: 'Start video scan (ਵੀਡੀਓ ਸਕੈਨ)',
    cameraDeniedMessage: 'ਕੈਮਰਾ ਜਾਂ ਮਾਈਕ ਦੀ ਇਜਾਜ਼ਤ ਬੰਦ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਇਜਾਜ਼ਤ ਦਿਓ।',
    chatbotGreeting: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਸਹਾਇਕ ਹਾਂ। ਤੁਸੀਂ ਪੱਕੇ ਬਿੱਲਾਂ ਦਾ ਖਰਚਾ ਪੁੱਛ ਸਕਦੇ ਹੋ ਜਾਂ ਕਹੋ "open records", "scan a bill"।',
    videoVoiceCatch: (vendor, amountStr, isDup) =>
      isDup
        ? `ਡੁਪਲੀਕੇਟ ਬਿੱਲ ਛੱਡ ਦਿੱਤਾ ਗਿਆ — ${vendor}, ${amountStr}`
        : `ਇੱਕ ਬਿੱਲ ਮਿਲ ਗਿਆ — ${vendor}, ${amountStr} — ਰਿਕਾਰਡ ਵਿੱਚ ਪਾ ਦਿੱਤਾ ਹੈ`,
  }),
};

export function getTranslations(lang: LanguageCode): TranslationStrings {
  return TRANSLATIONS[lang] || EN_STRINGS;
}
