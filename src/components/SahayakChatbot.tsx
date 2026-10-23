import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  X,
  Volume2,
  Mic,
  MicOff,
  Send,
  ArrowUpRight,
  PhoneCall,
  PhoneOff,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  AppSection,
  ChatMessage,
  LanguageCode,
  PartialExtractionDraft,
  Receipt,
} from '../types';
import { getLanguageOption, getTranslations } from '../i18n';
import {
  answerSahayakQuestion,
  formatINR,
  parseMessyLanguageBillCommand,
} from '../utils/ledgerLogic';
import { playTactileClick, playTactilePop } from '../utils/soundEffects';

interface SahayakChatbotProps {
  language: LanguageCode;
  receipts: Receipt[];
  onNavigate: (section: AppSection) => void;
  onOpenScanSheet: () => void;
  onOpenReceiptInReview: (receiptId: string) => void;
  onShowDuplicatesInRecords: () => void;
  onAddConfirmedReceipt?: (receipt: Receipt) => void;
  onOpenPartialCompletionModal?: (draft: PartialExtractionDraft) => void;
}

export const SahayakChatbot: React.FC<SahayakChatbotProps> = ({
  language,
  receipts,
  onNavigate,
  onOpenScanSheet,
  onOpenReceiptInReview,
  onShowDuplicatesInRecords,
  onAddConfirmedReceipt,
  onOpenPartialCompletionModal,
}) => {
  const t = getTranslations(language);
  const langOption = getLanguageOption(language);

  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [voiceCallStatus, setVoiceCallStatus] = useState<string>('Ready');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'sahayak-welcome',
      role: 'assistant',
      text: t.chatbotGreeting,
      sources: [],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const voiceCallActiveRef = useRef<boolean>(false);

  useEffect(() => {
    voiceCallActiveRef.current = isVoiceCallActive;
  }, [isVoiceCallActive]);

  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === 'sahayak-welcome' ? { ...m, text: t.chatbotGreeting } : m
      )
    );
  }, [language, t.chatbotGreeting]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const speakText = (text: string) => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langOption.speechCode;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // ignore if speechSynthesis unavailable
    }
  };

  const handleProcessQuery = async (rawQuery: string, fromVoice = false) => {
    const trimmed = rawQuery.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `sahayak-u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const reply = answerSahayakQuestion(trimmed, receipts, language);

    // If local deterministic parser didn't match an add command, check if server Gemini messy-language parser can extract it
    if (
      !reply.action &&
      /\b(bill|add|record|paid|diye|kharcha|note|rs|₹|\d{3,})\b/i.test(trimmed) &&
      !/\b(how much|what|which|show|total|profit|revenue|biggest|duplicate)\b/i.test(trimmed)
    ) {
      try {
        const res = await fetch('/api/chat-sahayak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed, language }),
        });
        const aiData = await res.json();
        if (aiData?.aiHandled && aiData.intent === 'add_bill') {
          const fallbackParse = parseMessyLanguageBillCommand(
            `${aiData.vendor_name || ''} ${aiData.amount || ''} ${aiData.date || ''}`.trim() || trimmed,
            receipts,
            true
          );
          if (fallbackParse.createdReceipt && onAddConfirmedReceipt) {
            const tagged: Receipt = {
              ...fallbackParse.createdReceipt,
              sourceTag: fromVoice ? 'Voice' : 'Chat',
            };
            onAddConfirmedReceipt(tagged);
            const botMsg: ChatMessage = {
              id: `sahayak-b-${Date.now() + 1}`,
              role: 'assistant',
              text:
                aiData.reply ||
                `Added ${tagged.vendor} (${formatINR(tagged.total, false)}) on ${tagged.date} directly to your Confirmed Records!`,
              sources: [tagged.id],
              action: {
                type: 'added_record',
                receiptId: tagged.id,
                createdReceipt: tagged,
              },
            };
            setMessages((prev) => [...prev, userMsg, botMsg]);
            setInputVal('');
            if (fromVoice || voiceCallActiveRef.current) speakText(botMsg.text);
            return;
          } else if (fallbackParse.draft && onOpenPartialCompletionModal) {
            onOpenPartialCompletionModal(fallbackParse.draft);
          }
        }
      } catch {
        // continue with deterministic reply
      }
    }

    const botMsg: ChatMessage = {
      id: `sahayak-b-${Date.now() + 1}`,
      role: 'assistant',
      text: reply.text,
      sources: reply.sources,
      unreviewedIds: reply.unreviewedIds,
      action: reply.action,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInputVal('');

    if (fromVoice || voiceCallActiveRef.current) {
      speakText(reply.text);
    }

    if (reply.action) {
      if (reply.action.type === 'added_record' && reply.action.createdReceipt && onAddConfirmedReceipt) {
        const tagged: Receipt = {
          ...reply.action.createdReceipt,
          sourceTag: fromVoice ? 'Voice' : 'Chat',
        };
        onAddConfirmedReceipt(tagged);
      } else if (
        reply.action.type === 'open_completion_popup' &&
        reply.action.draft &&
        onOpenPartialCompletionModal
      ) {
        onOpenPartialCompletionModal(reply.action.draft);
      } else if (reply.action.type === 'show_duplicates') {
        onShowDuplicatesInRecords();
      } else if (reply.action.type === 'open_scan') {
        onOpenScanSheet();
      } else if (reply.action.type === 'navigate' && reply.action.section) {
        onNavigate(reply.action.section);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessQuery(inputVal, false);
  };

  const startSpeechRecognition = (continuousCallMode: boolean) => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setVoiceCallStatus('Voice call ready — type or tap a voice command below');
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = langOption.speechCode;
      recognition.continuous = continuousCallMode;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        if (continuousCallMode) {
          setVoiceCallStatus(`Listening in ${langOption.displayScript}… Speak your bill or question`);
        }
      };
      recognition.onend = () => {
        setIsListening(false);
        if (voiceCallActiveRef.current) {
          try {
            recognition.start();
          } catch {
            // ignore
          }
        }
      };
      recognition.onerror = () => {
        setIsListening(false);
        if (continuousCallMode) {
          setVoiceCallStatus('Voice Call connected — tap a quick voice phrase or speak');
        }
      };
      recognition.onresult = (event: any) => {
        const lastIdx = event.results.length - 1;
        const transcript = event.results?.[lastIdx]?.[0]?.transcript;
        if (transcript) {
          setVoiceCallStatus(`Heard: "${transcript}"`);
          handleProcessQuery(transcript, true);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const toggleMicSpeechRecognition = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }
    startSpeechRecognition(false);
  };

  const toggleVoiceCall = () => {
    if (isVoiceCallActive) {
      setIsVoiceCallActive(false);
      voiceCallActiveRef.current = false;
      try {
        recognitionRef.current?.stop();
        window.speechSynthesis?.cancel();
      } catch {
        // ignore
      }
      setIsListening(false);
      setVoiceCallStatus('Call ended');
      return;
    }

    setIsVoiceCallActive(true);
    voiceCallActiveRef.current = true;
    setVoiceCallStatus('Live Voice Call active — say a bill or question');
    speakText('Namaste! Sahayak voice call is active. Tell me any bill to add to your records or ask about your profit and spend.');
    startSpeechRecognition(true);
  };

  return (
    <>
      {/* Floating Chat & Voice Call Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Sahayak Assistant Chat"
          className="fixed bottom-32 md:bottom-20 left-3 sm:left-5 z-40 w-[380px] max-w-[calc(100vw-24px)] card-obsidian-elevated rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden text-zinc-100"
        >
          {/* Header */}
          <div className="bg-[#0E0E12] border-b border-white/[0.07] px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-[13px] text-emerald-400 shrink-0">
                <span>S</span>
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#0E0E12]" />
              </div>
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium text-white leading-tight truncate">
                  {t.chatbotName}
                </div>
                <div className="text-[10.5px] text-zinc-400 font-mono flex items-center gap-1.5">
                  <span>{langOption.displayScript}</span>
                  <span>·</span>
                  <span>Voice AI</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                data-testid="chatbot-voice-call-btn"
                onClick={() => {
                  playTactileClick();
                  toggleVoiceCall();
                }}
                className={`btn-tactile px-2.5 py-1 rounded-md text-[11px] font-mono font-medium flex items-center gap-1 transition-all cursor-pointer ${
                  isVoiceCallActive
                    ? 'bg-rose-500 text-white animate-pulse shadow-sm'
                    : 'bg-white/[0.06] text-zinc-200 hover:bg-white/[0.1] border border-white/[0.08]'
                }`}
              >
                {isVoiceCallActive ? (
                  <>
                    <PhoneOff className="w-3 h-3" />
                    <span>End</span>
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-3 h-3 text-emerald-400" />
                    <span>Call</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  playTactilePop();
                  setIsOpen(false);
                }}
                aria-label="Close Sahayak chat"
                className="p-1 rounded-md hover:bg-white/[0.06] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Voice Call Banner */}
          {isVoiceCallActive && (
            <div
              data-testid="voice-call-active-banner"
              className="bg-emerald-950/60 border-b border-emerald-500/25 text-white px-3.5 py-2 space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{voiceCallStatus}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  data-testid="voice-sim-add-bill"
                  onClick={() => {
                    playTactileClick();
                    handleProcessQuery('add bill Mohan Kirana 1650 today', true);
                  }}
                  className="btn-tactile px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono cursor-pointer"
                >
                  🎙️ &ldquo;Add bill Mohan Kirana ₹1,650 today&rdquo;
                </button>
                <button
                  type="button"
                  data-testid="voice-sim-partial-bill"
                  onClick={() => {
                    playTactileClick();
                    handleProcessQuery('add bill Sharma Store today', true);
                  }}
                  className="btn-tactile px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-mono cursor-pointer"
                >
                  🎙️ Unclear bill (Missing Price)
                </button>
              </div>
            </div>
          )}

          {/* Quick Suggested Chips */}
          <div className="px-3 py-2 bg-[#0E0E12] border-b border-white/[0.05] flex items-center gap-1.5 overflow-x-auto text-[10.5px] font-mono">
            <button
              type="button"
              data-testid="chat-chip-add-messy-bill"
              onClick={() => {
                playTactileClick();
                handleProcessQuery('bhai add bill Ramesh Dairy 950 aaj ka');
              }}
              className="btn-tactile-subtle px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 hover:border-emerald-500/50 text-emerald-400 whitespace-nowrap cursor-pointer"
            >
              + Ramesh Dairy ₹950
            </button>
            <button
              type="button"
              data-testid="chat-chip-partial-bill"
              onClick={() => {
                playTactileClick();
                handleProcessQuery('add bill Verma Kirana without amount');
              }}
              className="btn-tactile-subtle px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 whitespace-nowrap cursor-pointer"
            >
              Test Missing Price
            </button>
            <button
              type="button"
              onClick={() => {
                playTactileClick();
                handleProcessQuery('total profit and revenue');
              }}
              className="btn-tactile-subtle px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-zinc-300 hover:text-white whitespace-nowrap cursor-pointer"
            >
              Profit &amp; Revenue
            </button>
          </div>

          {/* Messages List */}
          <div className="p-3.5 space-y-2.5 max-h-[300px] min-h-[220px] overflow-y-auto bg-[#0A0A0E]">
            {messages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="bg-white/[0.08] text-white text-[12.5px] font-normal px-3 py-1.5 rounded-lg border border-white/[0.06] max-w-[85%]">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div
                  key={msg.id}
                  className="bg-[#141417] border border-white/[0.06] rounded-lg p-2.5 text-[12.5px] text-zinc-200 space-y-2 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="leading-relaxed">{msg.text}</p>
                    <button
                      type="button"
                      onClick={() => {
                        playTactilePop();
                        speakText(msg.text);
                      }}
                      aria-label={t.chatbotSpeakReply}
                      title={`${t.chatbotSpeakReply} (${langOption.speechCode})`}
                      className="p-1 rounded text-zinc-400 hover:text-emerald-400 hover:bg-white/[0.04] shrink-0 transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Action badge */}
                  {msg.action?.type === 'added_record' && msg.action.createdReceipt && (
                    <div
                      data-testid="chat-added-record-card"
                      className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[11px] font-mono text-emerald-400"
                    >
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Saved {msg.action.createdReceipt.id} · {msg.action.createdReceipt.vendor}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          playTactileClick();
                          onNavigate('Records');
                        }}
                        className="underline cursor-pointer hover:text-white"
                      >
                        View Records →
                      </button>
                    </div>
                  )}

                  {msg.action?.type === 'open_completion_popup' && msg.action.draft && (
                    <button
                      type="button"
                      onClick={() => {
                        playTactileClick();
                        if (onOpenPartialCompletionModal && msg.action?.draft) {
                          onOpenPartialCompletionModal(msg.action.draft);
                        }
                      }}
                      className="btn-tactile w-full p-2 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-[11px] font-mono text-amber-300 cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Fill Missing Field in Modal
                      </span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}

                  {/* Sources chips */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-white/[0.05] text-[10.5px] font-mono text-zinc-500">
                      <span>Sources:</span>
                      {msg.sources.map((srcId) => (
                        <span
                          key={srcId}
                          className="px-1.5 py-0.2 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.06] tabular-nums"
                        >
                          {srcId}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Unreviewed bill in Review */}
                  {msg.unreviewedIds && msg.unreviewedIds.length > 0 && (
                    <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                      {msg.unreviewedIds.map((unconfId) => (
                        <button
                          key={unconfId}
                          type="button"
                          onClick={() => {
                            playTactileClick();
                            onOpenReceiptInReview(unconfId);
                          }}
                          className="btn-tactile-subtle inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] text-[11px] font-mono transition-colors cursor-pointer"
                        >
                          <span>{t.chatbotOpenInReview(unconfId)}</span>
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              playTactileClick();
              handleSubmit(e);
            }}
            className="p-2 bg-[#0E0E12] border-t border-white/[0.06] flex items-center gap-1.5"
          >
            <button
              type="button"
              onClick={() => {
                playTactilePop();
                toggleMicSpeechRecognition();
              }}
              aria-label={isListening ? t.chatbotMicListening : t.chatbotMicStart}
              title={`${t.chatbotMicStart} (${langOption.speechCode})`}
              className={`p-2 rounded-lg transition-colors shrink-0 cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              {isListening ? (
                <MicOff className="w-3.5 h-3.5" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </button>

            <input
              type="text"
              data-testid="sahayak-chat-input"
              aria-label="Ask Sahayak assistant"
              placeholder={
                isListening
                  ? t.chatbotMicListening
                  : 'Ask or type bill (e.g. "Sharma 850 today")…'
              }
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 rounded-lg border border-white/[0.08] bg-[#141417] px-3 py-1.5 text-[12.5px] text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none"
            />

            <button
              type="submit"
              data-testid="sahayak-chat-send"
              aria-label={t.chatbotSend}
              className="btn-tactile p-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Round Floating Chat Button fixed at bottom-LEFT */}
      <button
        type="button"
        onClick={() => {
          playTactilePop();
          setIsOpen((prev) => !prev);
        }}
        aria-label="Open Sahayak chatbot"
        className="btn-tactile fixed bottom-16 md:bottom-5 left-4 md:left-5 z-40 w-12 h-12 md:w-13 md:h-13 rounded-full card-obsidian-elevated border border-emerald-500/30 text-emerald-400 hover:border-emerald-500/60 shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex items-center justify-center cursor-pointer"
      >
        <MessageCircle className="w-5 h-5" />
        <span
          data-testid="chatbot-haldi-dot"
          className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-[#0A0A0C]"
        />
      </button>
    </>
  );
};
