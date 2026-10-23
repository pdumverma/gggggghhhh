import React, { useEffect, useRef, useState } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Activity,
} from 'lucide-react';
import { LanguageCode, Receipt } from '../types';
import { getLanguageOption, getTranslations } from '../i18n';
import {
  buildReceiptFromExtraction,
  formatINR,
  normalizeVendorName,
} from '../utils/ledgerLogic';
import { playTactileSound } from '../utils/soundEffects';

interface VideoBillSessionModalProps {
  language: LanguageCode;
  existingReceipts: Receipt[];
  onCatchReceipt: (newReceipt: Receipt) => void;
  onErrorToast: (reason: string) => void;
  onClose: () => void;
  onReviewThemNow: (firstCaughtId?: string) => void;
}

interface CaughtCardItem {
  id: string;
  vendor: string;
  total: number;
  isDuplicateSkipped: boolean;
}

interface PrintableSampleBill {
  fileName: string;
  label: string;
  shopTitle: string;
  address: string;
  gstin: string;
  billNo: string;
  dateText: string;
  items: Array<{ name: string; qty: string; amount: string }>;
  totalText: string;
}

const SAMPLE_VIEWFINDER_BILLS: PrintableSampleBill[] = [
  {
    fileName: 'verma_kirana_bill.jpg',
    label: 'Bill 1: Verma Wholesale Kirana (₹2,350)',
    shopTitle: 'VERMA WHOLESALE KIRANA',
    address: 'Anaj Mandi, Sohna Road, Gurugram',
    gstin: 'GSTIN: 06AABCV7812K1Z8',
    billNo: 'Bill No: VK-209',
    dateText: 'Date: 21/10/2026',
    items: [
      { name: 'Fortune Mustard Oil 1L', qty: '10', amount: '1650.00' },
      { name: 'Tata Salt 1kg Pack', qty: '25', amount: '700.00' },
    ],
    totalText: 'Rs. 2350.00',
  },
  {
    fileName: 'delhi_zippers_tailoring.jpg',
    label: 'Bill 2: Delhi Zippers & Tailoring (₹1,100)',
    shopTitle: 'DELHI ZIPPERS & TAILORING CO.',
    address: 'Sadar Bazar, Main Market, Delhi',
    gstin: 'GSTIN: 07AAECD1120B1Z4',
    billNo: 'Bill No: DZ-408',
    dateText: 'Date: 19/10/2026',
    items: [
      { name: 'Metal Zippers 8 inch (100 pcs)', qty: '1', amount: '640.00' },
      { name: 'Stitching Thread Boxes', qty: '2', amount: '460.00' },
    ],
    totalText: 'Rs. 1100.00',
  },
  {
    fileName: 'shree_packaging_bags.jpg',
    label: 'Bill 3: Shree Packaging House (₹1,420)',
    shopTitle: 'SHREE PACKAGING & CARRY BAGS',
    address: 'Plot 42, Industrial Area, Gurugram',
    gstin: 'GSTIN: 06AABCS9912E1Z1',
    billNo: 'Bill No: SP-812',
    dateText: 'Date: 20/10/2026',
    items: [
      { name: 'Non-Woven Carry Bags 500pc', qty: '1', amount: '1150.00' },
      { name: 'Brown Packing Tape Rolls', qty: '6', amount: '270.00' },
    ],
    totalText: 'Rs. 1420.00',
  },
  {
    fileName: 'sharma_duplicate_bill.jpg',
    label: 'Bill 4: Sharma General Store (₹1,284 · Duplicate)',
    shopTitle: 'SHARMA GENERAL STORE',
    address: 'Shop 14, Main Market, Sohna',
    gstin: 'GSTIN: 06AABCS1429B1Z5',
    billNo: 'Bill No: 4471',
    dateText: 'Date: 20/10/2026',
    items: [
      { name: 'Basmati Rice 5kg', qty: '1', amount: '540.00' },
      { name: 'Sunflower Oil 1L', qty: '1', amount: '189.00' },
      { name: 'Primer Paper A4 & Tape', qty: '1', amount: '555.00' },
    ],
    totalText: 'Rs. 1284.00',
  },
];

function drawSampleBillOnCanvas(
  canvas: HTMLCanvasElement,
  bill: PrintableSampleBill
) {
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Deep Green Mint desk background
  ctx.fillStyle = '#064E3B';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Paper receipt sheet
  const rx = 70;
  const ry = 28;
  const rw = 500;
  const rh = 424;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(rx, ry, rw, rh);

  ctx.strokeStyle = '#E9E1CF';
  ctx.lineWidth = 2;
  ctx.strokeRect(rx, ry, rw, rh);

  // Header
  ctx.fillStyle = '#112A22';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(bill.shopTitle, rx + rw / 2, ry + 42);

  ctx.font = '14px Arial, sans-serif';
  ctx.fillStyle = '#4A6B5F';
  ctx.fillText(bill.address, rx + rw / 2, ry + 66);
  ctx.fillText(bill.gstin, rx + rw / 2, ry + 88);

  // Divider
  ctx.strokeStyle = '#E9E1CF';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rx + 24, ry + 104);
  ctx.lineTo(rx + rw - 24, ry + 104);
  ctx.stroke();

  // Meta row
  ctx.textAlign = 'left';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillStyle = '#112A22';
  ctx.fillText(bill.billNo, rx + 28, ry + 130);
  ctx.textAlign = 'right';
  ctx.fillText(bill.dateText, rx + rw - 28, ry + 130);

  // Table header
  ctx.strokeRect(rx + 24, ry + 148, rw - 48, 30);
  ctx.textAlign = 'left';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillText('ITEM DESCRIPTION', rx + 34, ry + 168);
  ctx.textAlign = 'center';
  ctx.fillText('QTY', rx + 330, ry + 168);
  ctx.textAlign = 'right';
  ctx.fillText('AMOUNT (INR)', rx + rw - 34, ry + 168);

  // Line items
  let y = ry + 206;
  ctx.font = '15px Arial, sans-serif';
  for (const item of bill.items) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#112A22';
    ctx.fillText(item.name, rx + 34, y);
    ctx.textAlign = 'center';
    ctx.fillText(item.qty, rx + 330, y);
    ctx.textAlign = 'right';
    ctx.fillText(item.amount, rx + rw - 34, y);
    y += 32;
  }

  // Total box
  ctx.strokeStyle = '#0D9F6E';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rx + 24, ry + 330);
  ctx.lineTo(rx + rw - 24, ry + 330);
  ctx.stroke();

  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillStyle = '#112A22';
  ctx.textAlign = 'left';
  ctx.fillText('GRAND TOTAL', rx + 34, ry + 365);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0D9F6E';
  ctx.fillText(bill.totalText, rx + rw - 34, ry + 365);

  ctx.font = '13px Arial, sans-serif';
  ctx.fillStyle = '#4A6B5F';
  ctx.textAlign = 'center';
  ctx.fillText('TAX INVOICE · PAID IN CASH / UPI', rx + rw / 2, ry + 404);
}

export const VideoBillSessionModal: React.FC<VideoBillSessionModalProps> = ({
  language,
  existingReceipts,
  onCatchReceipt,
  onErrorToast,
  onClose,
  onReviewThemNow,
}) => {
  const t = getTranslations(language);
  const langOption = getLanguageOption(language);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isMuted, setIsMuted] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  // Requirement 1: Live status line on the video screen
  // Shows "Camera on", "Frame sent to AI", "AI replied", or the exact error message if a call fails
  const [liveStatus, setLiveStatus] = useState<string>('Camera on');
  const [liveStatusDetail, setLiveStatusDetail] = useState<string>('');
  const [liveStatusState, setLiveStatusState] = useState<
    'camera_on' | 'sending' | 'replied' | 'error'
  >('camera_on');
  const [framesSentCount, setFramesSentCount] = useState<number>(0);
  const [isSendingFrame, setIsSendingFrame] = useState<boolean>(false);

  const [caughtCards, setCaughtCards] = useState<CaughtCardItem[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const [duplicatesSkipped, setDuplicatesSkipped] = useState(0);
  const [firstCaughtReceiptId, setFirstCaughtReceiptId] = useState<string | undefined>(
    undefined
  );
  const [activeSampleIdx, setActiveSampleIdx] = useState(0);
  const [voiceCommandLog, setVoiceCommandLog] = useState<string | null>(null);

  // Refs for interval access so the 2-second loop never suffers from stale closures
  const cameraActiveRef = useRef<boolean>(false);
  const activeSampleIdxRef = useRef<number>(0);
  const sessionSeenKeysRef = useRef<Set<string>>(new Set());
  const receiptsRef = useRef<Receipt[]>(existingReceipts);
  const isMutedRef = useRef<boolean>(isMuted);
  const sessionEndedRef = useRef<boolean>(sessionEnded);
  const isTimerCallInFlightRef = useRef<boolean>(false);
  const frameCounterRef = useRef<number>(0);

  useEffect(() => {
    receiptsRef.current = existingReceipts;
  }, [existingReceipts]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    sessionEndedRef.current = sessionEnded;
  }, [sessionEnded]);

  useEffect(() => {
    cameraActiveRef.current = cameraActive;
  }, [cameraActive]);

  useEffect(() => {
    activeSampleIdxRef.current = activeSampleIdx;
    if (fallbackCanvasRef.current) {
      const sample =
        SAMPLE_VIEWFINDER_BILLS[activeSampleIdx] || SAMPLE_VIEWFINDER_BILLS[0];
      drawSampleBillOnCanvas(fallbackCanvasRef.current, sample);
    }
  }, [activeSampleIdx, cameraActive]);

  const speakAnnouncement = (text: string) => {
    if (isMutedRef.current) return;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langOption.speechCode;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // ignore speech synthesis errors
    }
  };

  // Capture current video or viewfinder frame as JPEG base64 (Requirement 2)
  const captureCurrentFrameAsJpegBase64 = (): {
    base64Data: string;
    dataUrl: string;
  } | null => {
    // 1. Prefer live hardware <video> stream if active and playing
    if (
      cameraActiveRef.current &&
      videoRef.current &&
      videoRef.current.videoWidth > 0 &&
      videoRef.current.videoHeight > 0
    ) {
      const canvas = document.createElement('canvas');
      const maxDimension = 960;
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      const scale = Math.min(1, maxDimension / Math.max(vw, vh));
      canvas.width = Math.max(1, Math.round(vw * scale));
      canvas.height = Math.max(1, Math.round(vh * scale));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
        if (base64Data.length > 64) {
          return { base64Data, dataUrl };
        }
      }
    }

    // 2. Fallback: capture JPEG base64 from the rendered viewfinder <canvas> on screen
    if (fallbackCanvasRef.current) {
      const sample =
        SAMPLE_VIEWFINDER_BILLS[activeSampleIdxRef.current] ||
        SAMPLE_VIEWFINDER_BILLS[0];
      drawSampleBillOnCanvas(fallbackCanvasRef.current, sample);
      const dataUrl = fallbackCanvasRef.current.toDataURL('image/jpeg', 0.85);
      const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
      if (base64Data.length > 64) {
        return { base64Data, dataUrl };
      }
    }

    return null;
  };

  // Send 1 captured JPEG base64 frame to /api/analyze-receipt (Gemini vision model)
  const captureAndSendFrame = async (trigger: 'timer' | 'manual') => {
    if (sessionEndedRef.current) return;

    // Prevent overlapping timer requests while allowing manual button to always fire immediately
    if (trigger === 'timer' && isTimerCallInFlightRef.current) {
      return;
    }

    const captured = captureCurrentFrameAsJpegBase64();
    if (!captured) {
      if (trigger === 'manual') {
        const msg = 'Camera frame is not ready yet — wait a moment and try again.';
        setLiveStatus(msg);
        setLiveStatusDetail('');
        setLiveStatusState('error');
        onErrorToast(msg);
      }
      return;
    }

    const nextCount = frameCounterRef.current + 1;
    frameCounterRef.current = nextCount;
    setFramesSentCount(nextCount);

    // Requirement 1: Show "Frame sent to AI" immediately when sending
    setLiveStatus('Frame sent to AI');
    setLiveStatusDetail(
      `Frame #${nextCount} · JPEG base64 (${Math.max(
        1,
        Math.round((captured.base64Data.length * 3) / 4 / 1024)
      )} KB)`
    );
    setLiveStatusState('sending');
    setIsSendingFrame(true);

    if (trigger === 'timer') {
      isTimerCallInFlightRef.current = true;
    }

    // Check if URL has ?simulate_video_error=1 for testing visible failures
    const shouldSimulateFailure =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('simulate_video_error') === '1';

    try {
      const res = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: captured.base64Data,
          mimeType: 'image/jpeg',
          fileName: `video_frame_${nextCount}.jpg`,
          source: trigger === 'manual' ? 'video_manual' : 'video_timer',
          simulateFailure: shouldSimulateFailure,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Invalid JSON response from server (HTTP ${res.status})`);
      }

      if (!res.ok || data?.error) {
        const exactError =
          data?.error || `Gemini AI request failed with HTTP ${res.status}`;
        // Requirement 1 & 4: Show exact error message on status line AND as a toast with the reason
        setLiveStatus(exactError);
        setLiveStatusDetail(`Frame #${nextCount} failed`);
        setLiveStatusState('error');
        onErrorToast(exactError);
        return;
      }

      // Requirement 1: Show "AI replied" when Gemini responds
      setLiveStatus('AI replied');
      setLiveStatusState('replied');

      if (data.is_receipt === false) {
        setLiveStatusDetail(
          data.not_receipt_reason ||
            'No bill detected in frame — hold bill steady inside frame'
        );
        return;
      }

      const vendorName = data.vendor_name || 'Unclear Vendor';
      const totalVal = typeof data.total === 'number' ? data.total : 0;
      const vendorKey = `${normalizeVendorName(vendorName)}:${totalVal}`;

      setLiveStatusDetail(`${vendorName} · ${formatINR(totalVal, false)}`);

      // Skip repeats in the same video session on automatic timer ticks
      if (trigger === 'timer' && sessionSeenKeysRef.current.has(vendorKey)) {
        setLiveStatusDetail(
          `${vendorName} (${formatINR(totalVal, false)}) — already caught in session`
        );
        return;
      }
      sessionSeenKeysRef.current.add(vendorKey);

      const { receipt, isDuplicate } = buildReceiptFromExtraction(
        data,
        receiptsRef.current,
        {
          fileName: `video_frame_${nextCount}.jpg`,
          fileType: 'image/jpeg',
          imageUrl: captured.dataUrl,
          sourceTag: 'Video',
          idOffset: nextCount,
        }
      );

      const amountStr = formatINR(receipt.total, false);
      const voiceLine = t.videoVoiceCatch(receipt.vendor, amountStr, isDuplicate);
      speakAnnouncement(voiceLine);

      if (isDuplicate) {
        setDuplicatesSkipped((prev) => prev + 1);
        setCaughtCards((prev) => [
          {
            id: receipt.id,
            vendor: receipt.vendor,
            total: receipt.total,
            isDuplicateSkipped: true,
          },
          ...prev,
        ]);
      } else {
        onCatchReceipt(receipt);
        setAddedCount((prev) => prev + 1);
        setFirstCaughtReceiptId((prev) => prev || receipt.id);
        setCaughtCards((prev) => [
          {
            id: receipt.id,
            vendor: receipt.vendor,
            total: receipt.total,
            isDuplicateSkipped: false,
          },
          ...prev,
        ]);
      }

      // If using sample viewfinder, advance to next sample bill so subsequent frames test additional bills
      if (!cameraActiveRef.current) {
        setActiveSampleIdx((prev) => (prev + 1) % SAMPLE_VIEWFINDER_BILLS.length);
      }
    } catch (err: any) {
      const exactError =
        err?.message || 'Network error while sending video frame to Gemini AI.';
      setLiveStatus(exactError);
      setLiveStatusDetail(`Frame #${nextCount} failed`);
      setLiveStatusState('error');
      onErrorToast(exactError);
    } finally {
      setIsSendingFrame(false);
      if (trigger === 'timer') {
        isTimerCallInFlightRef.current = false;
      }
    }
  };

  // Start camera & voice recognition
  useEffect(() => {
    let stream: MediaStream | null = null;
    let recognition: any = null;
    let mounted = true;

    async function setupMedia() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (mounted) {
          setCameraActive(false);
          cameraActiveRef.current = false;
          setPermissionNotice(t.cameraDeniedMessage);
          setLiveStatus('Camera on');
          setLiveStatusDetail('Sample bill viewfinder ready (hardware camera unavailable)');
          setLiveStatusState('camera_on');
        }
        return;
      }

      try {
        // Request video only so microphone permission never blocks camera video stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (mounted) {
          setCameraActive(true);
          cameraActiveRef.current = true;
          setPermissionNotice(null);
          setLiveStatus('Camera on');
          setLiveStatusDetail('Live camera ready — capturing 1 JPEG frame every 2s');
          setLiveStatusState('camera_on');
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {
              // ignore autoplay block
            });
          }
        }
      } catch (err: any) {
        if (mounted) {
          setCameraActive(false);
          cameraActiveRef.current = false;
          setPermissionNotice(t.cameraDeniedMessage);
          setLiveStatus('Camera on');
          setLiveStatusDetail(
            `Sample viewfinder active (${err?.name || 'camera permission blocked'})`
          );
          setLiveStatusState('camera_on');
        }
      }
    }

    function setupVoiceCommands() {
      const SpeechRecognitionAPI =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) return;

      try {
        recognition = new SpeechRecognitionAPI();
        recognition.lang = langOption.speechCode;
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const lastIdx = event.results.length - 1;
          const transcript = (event.results[lastIdx]?.[0]?.transcript || '')
            .trim()
            .toLowerCase();
          if (!transcript) return;
          setVoiceCommandLog(`"${transcript}"`);

          if (
            transcript.includes('stop') ||
            transcript.includes('end') ||
            transcript.includes('ruko') ||
            transcript.includes('band karo') ||
            transcript.includes('बस') ||
            transcript.includes('रोको')
          ) {
            setSessionEnded(true);
          } else if (
            transcript.includes('mute') ||
            transcript.includes('chup') ||
            transcript.includes('म्यूट')
          ) {
            setIsMuted(true);
          } else if (
            transcript.includes('ye wala bill') ||
            transcript.includes('capture') ||
            transcript.includes('scan')
          ) {
            captureAndSendFrame('manual');
          }
        };

        recognition.start();
      } catch {
        // ignore speech recognition startup error
      }
    }

    setupMedia();
    setupVoiceCommands();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach((tr) => tr.stop());
      }
      if (recognition) {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [facingMode, langOption.speechCode, t.cameraDeniedMessage]);

  // Requirement 2: Periodic frame capture every 2 seconds as JPEG base64 sent to Gemini vision model
  useEffect(() => {
    if (sessionEnded) return;
    const interval = setInterval(() => {
      captureAndSendFrame('timer');
    }, 2000);
    return () => clearInterval(interval);
  }, [sessionEnded]);

  // Summary view when End Call is pressed
  if (sessionEnded) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Video Session Summary"
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      >
        <div className="card-obsidian-elevated rounded-2xl border border-white/[0.09] shadow-2xl max-w-[520px] w-full p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-[20px] font-bold text-zinc-100 tracking-tight leading-snug">
            {t.videoSummaryTitle(addedCount, duplicatesSkipped)}
          </h2>
          <p className="text-[13.5px] text-zinc-400 mt-2">
            All bills added during this session have status <span className="text-amber-400 font-medium">Needs review</span> and will not count in totals until confirmed.
          </p>

          {caughtCards.length > 0 && (
            <div className="mt-5 text-left bg-[#0A0A0C] rounded-xl border border-white/[0.07] p-3.5 space-y-2 max-h-[200px] overflow-y-auto">
              {caughtCards.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-[13px] py-1.5 border-b last:border-b-0 border-white/[0.06]"
                >
                  <div className="font-medium text-zinc-200 truncate pr-2">
                    {c.vendor}
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="font-mono font-bold text-zinc-100 tabular-nums">
                      {formatINR(c.total, false)}
                    </span>
                    <span
                      className={`text-[11px] font-medium flex items-center gap-1 ${
                        c.isDuplicateSkipped ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          c.isDuplicateSkipped ? 'bg-rose-400' : 'bg-amber-400'
                        }`}
                      />
                      {c.isDuplicateSkipped ? 'Duplicate skipped' : 'Needs review'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                playTactileSound('pop');
                onClose();
              }}
              className="btn-tactile px-5 py-3 rounded-xl border border-white/[0.08] bg-[#141417] hover:bg-[#1A1A1F] text-zinc-300 font-semibold text-[13.5px] cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                playTactileSound('chime');
                onReviewThemNow(firstCaughtReceiptId);
              }}
              className="btn-tactile flex-1 py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-bold text-[14px] transition-all cursor-pointer shadow-sm"
            >
              {t.videoReviewNowBtn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live Video Bill Session"
      className="fixed inset-0 z-50 bg-[#0A0A0C] text-[#EDEDEF] flex flex-col justify-between select-none"
    >
      {/* Top Bar: Red recording dot + "AI is watching — show your bills one by one" + Running count + Live Status Line */}
      <div className="relative z-10 bg-[#0A0A0C]/90 backdrop-blur-md px-6 py-3.5 border-b border-white/[0.07] space-y-2.5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="text-[14px] sm:text-[15px] font-semibold text-zinc-100 tracking-tight">
              {t.videoWatchingBanner}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {voiceCommandLog && (
              <span className="text-[12px] text-zinc-300 bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 rounded-full">
                Heard: {voiceCommandLog}
              </span>
            )}
            <span
              data-testid="video-bills-caught-badge"
              className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[12.5px] font-semibold font-mono tabular-nums"
            >
              {t.videoBillsCaught(addedCount)}
            </span>
          </div>
        </div>

        {/* Live Status Line */}
        <div
          role="status"
          aria-live="polite"
          data-testid="video-live-status-line"
          className={`w-full rounded-xl px-3.5 py-2 text-[12.5px] font-medium flex items-center justify-between gap-3 flex-wrap border transition-all ${
            liveStatusState === 'error'
              ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
              : liveStatusState === 'sending'
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : liveStatusState === 'replied'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-[#141417] border-white/[0.07] text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Activity
              className={`w-4 h-4 shrink-0 ${
                liveStatusState === 'sending' ? 'animate-spin text-amber-400' : 'text-emerald-400'
              }`}
            />
            <span data-testid="video-live-status-primary" className="font-semibold text-zinc-100">
              {liveStatus}
            </span>
            {liveStatusDetail && (
              <span className="text-zinc-400 truncate">
                — {liveStatusDetail}
              </span>
            )}
          </div>
          <div className="text-[11.5px] text-zinc-400 font-mono tabular-nums shrink-0">
            Frames sent: {framesSentCount} (every 2s · JPEG base64)
          </div>
        </div>
      </div>

      {/* Center Live Camera Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
        {cameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#0A0A0C]">
            {permissionNotice && (
              <div className="mb-4 max-w-[680px] bg-amber-950/20 text-amber-300 border border-amber-500/30 px-4 py-2.5 rounded-xl text-[12px] flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{permissionNotice}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-zinc-200">Bill in frame:</span>
                  <select
                    aria-label="Select test bill frame"
                    value={activeSampleIdx}
                    onChange={(e) => {
                      playTactileSound('tick');
                      setActiveSampleIdx(Number(e.target.value));
                    }}
                    className="bg-[#141417] border border-white/10 rounded-lg px-2 py-1 text-[11.5px] font-medium text-zinc-200 outline-none"
                  >
                    {SAMPLE_VIEWFINDER_BILLS.map((f, idx) => (
                      <option key={f.fileName} value={idx}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="relative card-obsidian rounded-2xl p-4 max-w-[540px] w-full flex flex-col items-center border border-white/[0.08]">
              <canvas
                ref={fallbackCanvasRef}
                className="max-h-[300px] w-auto object-contain rounded-xl shadow-2xl border border-white/[0.06]"
              />
              <div className="mt-3 text-[12px] text-zinc-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Capturing 1 JPEG frame every 2 seconds · Voice ({langOption.speechCode})
              </div>
            </div>
          </div>
        )}

        {/* Sliding Caught Bill Cards */}
        {caughtCards.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-[520px] px-4 space-y-2 z-20">
            {caughtCards.slice(0, 2).map((card) => (
              <div
                key={card.id}
                data-testid="video-caught-card"
                className="card-obsidian-elevated rounded-xl shadow-2xl border border-white/10 px-4 py-3 flex items-center justify-between gap-3 backdrop-blur-md"
              >
                <div>
                  <div className="text-[13.5px] font-bold text-zinc-100">
                    {card.vendor}
                  </div>
                  <div
                    className={`text-[11.5px] font-medium flex items-center gap-1.5 mt-0.5 ${
                      card.isDuplicateSkipped ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        card.isDuplicateSkipped ? 'bg-rose-400' : 'bg-amber-400'
                      }`}
                    />
                    {card.isDuplicateSkipped ? t.videoCardDuplicate : t.videoCardAdded}
                  </div>
                </div>
                <div className="text-[15.5px] font-mono font-bold text-emerald-400 tabular-nums">
                  {formatINR(card.total, false)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Video Call Controls Bar */}
      <div className="relative z-10 bg-[#0A0A0C]/90 backdrop-blur-md px-6 py-4 flex items-center justify-center gap-3 flex-wrap border-t border-white/[0.07]">
        {/* Manual "Capture this bill now" button */}
        <button
          type="button"
          data-testid="video-capture-now-btn"
          onClick={() => {
            playTactileSound('click');
            captureAndSendFrame('manual');
          }}
          disabled={isSendingFrame}
          className="btn-tactile px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 text-zinc-950 font-bold text-[13.5px] flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Camera className="w-4 h-4" />
          <span>Capture this bill now</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTactileSound('tick');
            setIsMuted((prev) => !prev);
          }}
          aria-label={isMuted ? t.videoUnmute : t.videoMute}
          className={`btn-tactile px-4 py-2.5 rounded-xl font-semibold text-[13px] flex items-center gap-2 cursor-pointer border transition-colors ${
            isMuted
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              : 'bg-[#141417] border-white/[0.08] hover:bg-[#1A1A1F] text-zinc-300'
          }`}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span>{isMuted ? t.videoUnmute : t.videoMute}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTactileSound('click');
            setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
          }}
          aria-label={t.videoSwitchCamera}
          className="btn-tactile px-4 py-2.5 rounded-xl bg-[#141417] border border-white/[0.08] hover:bg-[#1A1A1F] text-zinc-300 font-semibold text-[13px] flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t.videoSwitchCamera}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTactileSound('pop');
            setSessionEnded(true);
          }}
          aria-label={t.videoEndCall}
          className="btn-tactile px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-[13.5px] flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <PhoneOff className="w-4 h-4" />
          <span>{t.videoEndCall}</span>
        </button>
      </div>
    </div>
  );
};

