import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  BookOpen,
  Video,
  RefreshCw,
  X,
  AlertCircle,
  PlusCircle,
  PenTool,
  Sparkles,
} from 'lucide-react';
import { LanguageCode } from '../types';
import { getTranslations } from '../i18n';
import { playTactileClick, playTactilePop } from '../utils/soundEffects';

interface ScanScreenProps {
  language: LanguageCode;
  onBackgroundScanBill: (payload: {
    base64Data: string;
    mimeType: string;
    fileName: string;
    imageUrl?: string;
    sourceTag?: 'Scan' | 'Upload';
    noteText?: string;
  }) => void;
  onUploadRegisterPage: (payload: {
    base64Data: string;
    mimeType: string;
    fileName: string;
  }) => void;
  onStartVideoSession: () => void;
  onOpenQuickAdd?: () => void;
  isPopupSheet?: boolean;
  onCloseSheet?: () => void;
}

function createPaperReceiptSvgDataUrl(opts: {
  title: string;
  subtitle: string;
  billNo: string;
  dateText: string;
  items: Array<{ name: string; amount: string }>;
  totalText: string;
  badgeText: string;
}): string {
  const itemRowsSvg = opts.items
    .map(
      (it, idx) => `
      <text x="55" y="${215 + idx * 32}" font-family="Inter, -apple-system, sans-serif" font-size="14" fill="#E4E4E7">${it.name}</text>
      <text x="445" y="${215 + idx * 32}" font-family="monospace" font-size="14" font-weight="bold" text-anchor="end" fill="#10B981">${it.amount}</text>
    `
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="380" viewBox="0 0 500 380">
    <rect x="20" y="12" width="460" height="356" rx="14" fill="#141417" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
    <rect x="20" y="12" width="460" height="4" rx="2" fill="#10B981"/>
    <text x="250" y="52" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="600" text-anchor="middle" fill="#FFFFFF">${opts.title}</text>
    <text x="250" y="74" font-family="Inter, -apple-system, sans-serif" font-size="12" text-anchor="middle" fill="#A1A1AA">${opts.subtitle}</text>
    <rect x="175" y="86" width="150" height="22" rx="6" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.25)"/>
    <text x="250" y="101" font-family="monospace" font-size="11" font-weight="600" text-anchor="middle" fill="#34D399">${opts.badgeText}</text>
    <line x1="45" y1="122" x2="455" y2="122" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <text x="55" y="146" font-family="monospace" font-size="13" font-weight="600" fill="#E4E4E7">${opts.billNo}</text>
    <text x="445" y="146" font-family="monospace" font-size="13" text-anchor="end" fill="#FBBF24">${opts.dateText}</text>
    <rect x="45" y="160" width="410" height="28" rx="6" fill="#1C1C21" stroke="rgba(255,255,255,0.06)"/>
    <text x="55" y="178" font-family="monospace" font-size="11" font-weight="600" fill="#71717A">DESCRIPTION</text>
    <text x="445" y="178" font-family="monospace" font-size="11" font-weight="600" text-anchor="end" fill="#71717A">AMOUNT</text>
    ${itemRowsSvg}
    <line x1="45" y1="295" x2="455" y2="295" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <rect x="45" y="306" width="410" height="42" rx="8" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.2)"/>
    <text x="60" y="332" font-family="Inter, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#FFFFFF">TOTAL</text>
    <text x="440" y="332" font-family="monospace" font-size="17" font-weight="700" text-anchor="end" fill="#34D399">${opts.totalText}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SAMPLE_BILLS = [
  {
    id: 'kirana',
    label: 'Verma Wholesale Bill (₹2,450 · Complete)',
    fileName: 'verma_kirana_bill.jpg',
    assetPath: createPaperReceiptSvgDataUrl({
      title: 'VERMA WHOLESALE KIRANA',
      subtitle: 'Anaj Mandi, Sohna Road, Gurugram · GSTIN 06AABCV7812K1Z8',
      billNo: 'Bill No: VK-209',
      dateText: 'Date: 24/10/2026',
      items: [
        { name: 'Fortune Mustard Oil 1L (x10)', amount: '₹1,650.00' },
        { name: 'Tata Salt 1kg Pack (x25)', amount: '₹800.00' },
      ],
      totalText: '₹2,450.00',
      badgeText: 'TAX INVOICE · KIRANA',
    }),
  },
  {
    id: 'handwritten_note',
    label: 'Handwritten Note Slip (Name + Price + Date)',
    fileName: 'handwritten_note_slip.jpg',
    assetPath: createPaperReceiptSvgDataUrl({
      title: 'Raju Kirana & Milk Note',
      subtitle: 'Handwritten Slip (Parchi) · Name, Price & Date Only',
      billNo: 'Slip Note',
      dateText: 'Date: 23/10/2026',
      items: [{ name: 'Handwritten Note: Raju Milk & Curd', amount: '₹850.00' }],
      totalText: '₹850.00',
      badgeText: 'HANDWRITTEN NOTE',
    }),
  },
  {
    id: 'torn_partial',
    label: 'Torn Bill — Missing Price (Opens AI Completion Popup)',
    fileName: 'torn_partial_bill.jpg',
    assetPath: createPaperReceiptSvgDataUrl({
      title: 'APNA KIRANA WHOLESALER',
      subtitle: 'Old Mandi Road · Bottom Total Torn Off',
      billNo: 'Bill No: AK-19',
      dateText: 'Date: 25/10/2026',
      items: [{ name: 'Basmati Rice 25kg Sack', amount: '[TORN / UNCLEAR]' }],
      totalText: '₹ ???',
      badgeText: 'PARTIAL AI SCAN',
    }),
  },
  {
    id: 'duplicate',
    label: 'Sharma General Store (₹2,450 · Duplicate Test)',
    fileName: 'sharma_duplicate_bill.jpg',
    assetPath: createPaperReceiptSvgDataUrl({
      title: 'SHARMA GENERAL STORE',
      subtitle: 'Shop 14, Main Market, Sohna · GSTIN 06AABCS1429B1Z5',
      billNo: 'Bill No: 4471',
      dateText: 'Date: 03/10/2026',
      items: [
        { name: 'Toor Dal 10kg & Refined Sugar', amount: '₹2,130.00' },
        { name: 'Tea Dust 1kg', amount: '₹320.00' },
      ],
      totalText: '₹2,450.00',
      badgeText: 'DUPLICATE CHECK BILL',
    }),
  },
];

export const ScanScreen: React.FC<ScanScreenProps> = ({
  language,
  onBackgroundScanBill,
  onUploadRegisterPage,
  onStartVideoSession,
  onOpenQuickAdd,
  isPopupSheet = false,
  onCloseSheet,
}) => {
  const t = getTranslations(language);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const registerInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [selectedSampleIdx, setSelectedSampleIdx] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [handwrittenNoteText, setHandwrittenNoteText] = useState('');

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    let mounted = true;

    async function initCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (mounted) {
          setCameraActive(false);
          setCameraError(t.cameraDeniedMessage);
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        currentStream = stream;
        if (mounted) {
          setCameraActive(true);
          setCameraError(null);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }
      } catch {
        if (mounted) {
          setCameraActive(false);
          setCameraError(t.cameraDeniedMessage);
        }
      }
    }

    initCamera();

    return () => {
      mounted = false;
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, t.cameraDeniedMessage]);

  const handleCaptureAndScan = async () => {
    playTactileClick();
    setIsCapturing(true);
    try {
      if (
        cameraActive &&
        videoRef.current &&
        videoRef.current.videoWidth > 0 &&
        videoRef.current.videoHeight > 0
      ) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const base64Data = dataUrl.split(',')[1] || '';
          onBackgroundScanBill({
            base64Data,
            mimeType: 'image/jpeg',
            fileName: `camera_scan_${Date.now()}.jpg`,
            imageUrl: dataUrl,
            sourceTag: 'Scan',
          });
          if (isPopupSheet && onCloseSheet) onCloseSheet();
          return;
        }
      }

      const sample = SAMPLE_BILLS[selectedSampleIdx] || SAMPLE_BILLS[0];
      const base64Data = 'U2FtcGxlIEJpbGwgSW1hZ2UgRGF0YQ==';
      const imageUrl: string | undefined = sample.assetPath;

      onBackgroundScanBill({
        base64Data,
        mimeType: 'image/jpeg',
        fileName: sample.fileName,
        imageUrl,
        sourceTag: 'Scan',
      });
      if (isPopupSheet && onCloseSheet) onCloseSheet();
    } finally {
      setIsCapturing(false);
    }
  };

  const handleScanHandwrittenNoteText = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = handwrittenNoteText.trim();
    if (!raw) return;
    playTactileClick();
    onBackgroundScanBill({
      base64Data: btoa(unescape(encodeURIComponent(raw))),
      mimeType: 'text/plain',
      fileName: 'handwritten_note.txt',
      sourceTag: 'Scan',
      noteText: raw,
    });
    setHandwrittenNoteText('');
    if (isPopupSheet && onCloseSheet) onCloseSheet();
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playTactilePop();
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = typeof reader.result === 'string' ? reader.result : '';
      const base64Data = resultStr.includes(',') ? resultStr.split(',')[1] : '';
      onBackgroundScanBill({
        base64Data: base64Data || 'U2FtcGxl',
        mimeType: file.type || 'image/jpeg',
        fileName: file.name,
        imageUrl: file.type.startsWith('image/') ? resultStr : undefined,
        sourceTag: 'Upload',
      });
      if (isPopupSheet && onCloseSheet) onCloseSheet();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRegisterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playTactilePop();
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = typeof reader.result === 'string' ? reader.result : '';
      const base64Data = resultStr.includes(',') ? resultStr.split(',')[1] : '';
      onUploadRegisterPage({
        base64Data: base64Data || 'U2FtcGxlUmVnaXN0ZXI=',
        mimeType: file.type || 'image/jpeg',
        fileName: file.name,
      });
      if (isPopupSheet && onCloseSheet) onCloseSheet();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleQuickRegisterDemo = () => {
    playTactileClick();
    onUploadRegisterPage({
      base64Data: 'U2FtcGxlS2hhdGFSZWdpc3RlclBhZ2U=',
      mimeType: 'image/jpeg',
      fileName: 'october_khata_register_page.jpg',
    });
    if (isPopupSheet && onCloseSheet) onCloseSheet();
  };

  const activeSample = SAMPLE_BILLS[selectedSampleIdx] || SAMPLE_BILLS[0];

  const scannerContent = (
    <div className="w-full max-w-[960px] mx-auto space-y-4">
      {/* Viewfinder fallback notice */}
      {cameraError && (
        <div
          role="status"
          className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 text-[12px] text-amber-300 flex items-center justify-between gap-3 flex-wrap"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{cameraError}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-zinc-400">
              Sample bill:
            </span>
            <select
              aria-label="Select sample bill for viewfinder"
              data-testid="scan-sample-select"
              value={selectedSampleIdx}
              onChange={(e) => {
                playTactilePop();
                setSelectedSampleIdx(Number(e.target.value));
              }}
              className="bg-[#141417] border border-white/[0.08] rounded-md px-2 py-1 text-[11.5px] font-medium text-zinc-200 focus:outline-none cursor-pointer"
            >
              {SAMPLE_BILLS.map((b, idx) => (
                <option key={b.id} value={idx}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Viewfinder Card */}
      <div className="card-obsidian rounded-xl p-4 sm:p-5">
        <div className="relative w-full h-[320px] sm:h-[420px] rounded-lg bg-[#0A0A0E] border border-white/[0.06] overflow-hidden flex items-center justify-center">
          {cameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full relative flex items-center justify-center p-4">
              <img
                src={activeSample.assetPath}
                alt={activeSample.label}
                referrerPolicy="no-referrer"
                className="max-h-[90%] max-w-[92%] object-contain rounded-md opacity-95 shadow-2xl"
              />
            </div>
          )}

          {/* Laser Scanning Line Animation */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10B981] animate-pulse absolute top-1/2 -translate-y-1/2 opacity-75" />
          </div>

          {/* Frame Reticles */}
          <div className="pointer-events-none absolute inset-4 sm:inset-6 border border-white/10 rounded-lg flex flex-col justify-between p-3">
            <div className="flex items-center justify-between">
              <span className="w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-black/60 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                {t.frameGuideHint}
              </span>
              <span className="w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
            </div>

            <div className="flex items-center justify-between">
              <span className="w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
              <span className="text-[10px] font-mono text-zinc-400 bg-black/60 px-2 py-0.5 rounded border border-white/5">
                Printed bills &amp; handwritten notes
              </span>
              <span className="w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br" />
            </div>
          </div>

          {/* Switch Camera Button */}
          <button
            type="button"
            onClick={() => {
              playTactilePop();
              setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
            }}
            aria-label={t.videoSwitchCamera}
            className="btn-tactile absolute top-3 right-3 z-10 p-2 rounded-lg bg-black/70 hover:bg-black/90 text-white border border-white/10 backdrop-blur-md transition-colors cursor-pointer"
            title={t.videoSwitchCamera}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          ref={photoInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,image/*"
          onChange={handlePhotoFileChange}
          className="hidden"
        />
        <input
          ref={registerInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/*"
          onChange={handleRegisterFileChange}
          className="hidden"
        />

        {/* Primary Action Button Row */}
        <div className="mt-4 flex flex-col items-center">
          <div className="w-full sm:max-w-[560px] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              data-testid="big-scan-bill-btn"
              disabled={isCapturing}
              onClick={handleCaptureAndScan}
              className="btn-tactile w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium text-[13.5px] shadow-[0_2px_12px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>{t.scanBillBtn}</span>
            </button>

            {onOpenQuickAdd && (
              <button
                type="button"
                data-testid="scan-one-tap-manual-btn"
                onClick={() => {
                  playTactileClick();
                  onOpenQuickAdd();
                }}
                className="btn-tactile w-full py-2.5 px-4 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-100 border border-white/[0.09] font-medium text-[13.5px] flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>One-Tap Manual Entry</span>
              </button>
            )}
          </div>

          {/* Secondary Actions */}
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap w-full">
            <button
              type="button"
              onClick={() => {
                playTactileClick();
                photoInputRef.current?.click();
              }}
              className="btn-tactile-subtle px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-zinc-300 font-medium text-[11.5px] flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-zinc-400" />
              <span>{t.uploadPhotoBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleQuickRegisterDemo}
              className="btn-tactile-subtle px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-zinc-300 font-medium text-[11.5px] flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
              <span>{t.uploadRegisterBtn}</span>
            </button>

            <button
              type="button"
              data-testid="scan-test-partial-popup-btn"
              onClick={() => {
                playTactileClick();
                onBackgroundScanBill({
                  base64Data: 'U2FtcGxlIEJpbGwgSW1hZ2UgRGF0YQ==',
                  mimeType: 'image/jpeg',
                  fileName: 'torn_partial_bill.jpg',
                  imageUrl: SAMPLE_BILLS[2].assetPath,
                  sourceTag: 'Scan',
                });
                if (isPopupSheet && onCloseSheet) onCloseSheet();
              }}
              className="btn-tactile-subtle px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 font-medium text-[11.5px] flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Scan Torn Bill (AI Popup)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTactileClick();
                if (isPopupSheet && onCloseSheet) onCloseSheet();
                onStartVideoSession();
              }}
              className="btn-tactile-subtle px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] font-medium text-[11.5px] flex items-center gap-1.5 cursor-pointer"
            >
              <Video className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.startVideoScanBtn}</span>
            </button>
          </div>
        </div>

        {/* Handwritten Note Fast Converter Bar */}
        <form
          onSubmit={handleScanHandwrittenNoteText}
          className="mt-4 pt-3.5 border-t border-white/[0.06] flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        >
          <div className="flex items-center gap-1.5 text-[11.5px] font-mono text-zinc-400 shrink-0">
            <PenTool className="w-3.5 h-3.5 text-emerald-400" />
            <span>Note Slip:</span>
          </div>
          <input
            type="text"
            data-testid="scan-handwritten-note-input"
            value={handwrittenNoteText}
            onChange={(e) => setHandwrittenNoteText(e.target.value)}
            placeholder='Write rough note e.g. "Raju Milk, 850, 23 Oct 2026"'
            className="flex-1 px-3 py-1.5 rounded-md border border-white/[0.08] bg-[#0E0E12] text-[12.5px] text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none"
          />
          <button
            type="submit"
            data-testid="scan-handwritten-note-submit"
            className="btn-tactile px-3 py-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] font-medium text-[11.5px] cursor-pointer shrink-0"
          >
            Convert Note
          </button>
        </form>
      </div>
    </div>
  );

  if (isPopupSheet) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick Scan Bill Sheet"
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      >
        <div className="card-obsidian-elevated rounded-t-2xl sm:rounded-2xl border border-white/10 w-full max-w-[940px] p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.07]">
            <div>
              <h2 className="text-[17px] font-medium text-white tracking-tight">{t.scanTitle}</h2>
              <p className="text-[11.5px] text-zinc-400">{t.scanSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                playTactileClick();
                if (onCloseSheet) onCloseSheet();
              }}
              aria-label="Close scan sheet"
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {scannerContent}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0A0A0C] text-zinc-100">
      <header className="bg-[#0E0E12] border-b border-white/[0.07] px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-semibold text-white tracking-tight leading-tight">
            {t.scanTitle}
          </h1>
          <p className="text-[12px] sm:text-[12.5px] text-zinc-400 mt-0.5">{t.scanSubtitle}</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenQuickAdd && (
            <button
              type="button"
              onClick={() => {
                playTactileClick();
                onOpenQuickAdd();
              }}
              className="btn-tactile px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 font-medium text-[12.5px] flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Manual Entry</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              playTactileClick();
              onStartVideoSession();
            }}
            className="btn-tactile px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium text-[12.5px] flex items-center gap-1.5 cursor-pointer"
          >
            <Video className="w-3.5 h-3.5" />
            <span>{t.startVideoScanBtn}</span>
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-8 max-w-[1340px] w-full mx-auto">{scannerContent}</div>
    </div>
  );
};
