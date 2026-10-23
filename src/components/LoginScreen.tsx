import React, { useState, useRef } from 'react';
import { ShieldCheck, Mail, Smartphone, RefreshCw, CheckCircle2 } from 'lucide-react';
import { signInWithGooglePopup } from '../firebase';
import { BrandWordmark } from './BrandWordmark';
import { playTactileClick, playTactilePop } from '../utils/soundEffects';

interface LoginScreenProps {
  onLoginSuccess: (personalIdentifier?: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'mobile' | 'email'>('email');
  const [contactValue, setContactValue] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dispatchedCode, setDispatchedCode] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [passwordHintShown, setPasswordHintShown] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleModeSwitch = (newMode: 'mobile' | 'email') => {
    setMode(newMode);
    setOtpSent(false);
    setError(null);
    setStatusMessage(null);
    setDispatchedCode(null);
    setOtpDigits(['', '', '', '', '', '']);
    setContactValue('');
  };

  const requestOtpFromServer = async () => {
    const cleanValue = contactValue.trim();
    if (!cleanValue) {
      setError(
        mode === 'mobile'
          ? 'Please enter your personal 10-digit mobile number'
          : 'Please enter your personal email address'
      );
      return;
    }

    setIsSendingOtp(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanValue, mode }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Could not send verification OTP. Please check your details.');
        return;
      }

      setOtpSent(true);
      setStatusMessage(data.message || `Verification code sent to ${cleanValue}`);
      setDispatchedCode(data.verificationCode || null);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    } catch (err: any) {
      setError(err?.message || 'Network error while connecting to Resend verification service.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestOtpFromServer();
  };

  const handleOtpChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const next = [...otpDigits];
      next[index] = '';
      setOtpDigits(next);
      setError(null);
      return;
    }

    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split('');
      const next = [...otpDigits];
      chars.forEach((c, idx) => {
        if (index + idx < 6) next[index + idx] = c;
      });
      setOtpDigits(next);
      setError(null);
      const focusIdx = Math.min(5, index + chars.length);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const next = [...otpDigits];
    next[index] = clean;
    setOtpDigits(next);
    setError(null);

    if (index < 5 && clean) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length < 6) {
      setError('Please enter all 6 digits of your personal verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: contactValue.trim(), otp: code }),
      });
      const data = await response.json();
      if (!response.ok || !data.verified) {
        setError(data.error || 'Invalid verification code. Please check and try again.');
        return;
      }
      onLoginSuccess(contactValue.trim());
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleSigningIn(true);
    setError(null);
    try {
      const user = await signInWithGooglePopup();
      onLoginSuccess(user?.email || user?.phoneNumber || undefined);
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In could not complete. Please verify with your personal Email or Mobile OTP above.');
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex flex-col items-center justify-center px-4 py-8 text-zinc-100 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 ambient-glow-emerald" />

      <div className="w-full max-w-[420px] card-obsidian-elevated rounded-2xl p-6 sm:p-8 relative z-10">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <BrandWordmark size="md" showIcon={true} />
        </div>

        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>Secure Personal Shop Ledger</span>
          </span>
        </div>

        <h1 className="text-[20px] font-medium text-white text-center tracking-tight mb-1">
          Shop Account Login
        </h1>
        <p className="text-[12px] text-zinc-400 text-center mb-5">
          Sign in to access your verified ledger, invoices, and analytics
        </p>

        {/* Mode switch tabs */}
        <div
          className="grid grid-cols-2 p-1 bg-[#0E0E12] rounded-lg border border-white/[0.06] mb-5"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'email'}
            onClick={() => {
              playTactilePop();
              handleModeSwitch('email');
            }}
            className={`btn-tactile-subtle py-1.5 text-[12.5px] font-medium rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'email'
                ? 'bg-white/[0.08] text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mail size={13} />
            <span>Personal Email</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'mobile'}
            onClick={() => {
              playTactilePop();
              handleModeSwitch('mobile');
            }}
            className={`btn-tactile-subtle py-1.5 text-[12.5px] font-medium rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'mobile'
                ? 'bg-white/[0.08] text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smartphone size={13} />
            <span>Personal Mobile</span>
          </button>
        </div>

        {!otpSent ? (
          <form onSubmit={(e) => {
            playTactileClick();
            handleSendOtp(e);
          }} className="space-y-4">
            <div>
              <label
                htmlFor="login-contact-input"
                className="block text-[11.5px] font-mono text-zinc-400 mb-1"
              >
                {mode === 'mobile' ? 'Mobile Number' : 'Personal Email'}
              </label>
              <div className="relative flex items-center">
                {mode === 'mobile' && (
                  <span className="absolute left-3 text-[13px] text-zinc-500 font-mono select-none">
                    +91
                  </span>
                )}
                <input
                  id="login-contact-input"
                  data-testid="login-personal-input"
                  type={mode === 'mobile' ? 'tel' : 'email'}
                  value={contactValue}
                  onChange={(e) => {
                    setContactValue(e.target.value);
                    setError(null);
                  }}
                  placeholder={mode === 'mobile' ? 'Enter 10-digit mobile number' : 'name@yourmail.com'}
                  className={`w-full rounded-lg border border-white/[0.08] bg-[#0E0E12] py-2 text-[13px] text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none ${
                    mode === 'mobile' ? 'pl-11 pr-3' : 'px-3'
                  }`}
                />
              </div>
              <p className="text-[10.5px] text-zinc-500 mt-1 font-mono">
                {mode === 'email'
                  ? 'A 6-digit verification code will be dispatched to your email.'
                  : 'A 6-digit verification code will be generated for your mobile number.'}
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="text-[11.5px] text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-md font-medium"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSendingOtp}
              data-testid="send-personal-otp-btn"
              className="btn-tactile w-full py-2 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-zinc-950 font-medium text-[13px] rounded-lg shadow-[0_2px_10px_rgba(16,185,129,0.2)] cursor-pointer"
            >
              {isSendingOtp ? 'Sending verification code…' : 'Send Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => {
            playTactileClick();
            handleVerify(e);
          }} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-zinc-400 truncate pr-2">
                Code sent to{' '}
                <strong className="text-white font-mono">
                  {mode === 'mobile' ? `+91 ${contactValue}` : contactValue}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  playTactilePop();
                  setOtpSent(false);
                  setError(null);
                  setDispatchedCode(null);
                }}
                className="text-[11.5px] text-emerald-400 font-medium hover:underline cursor-pointer shrink-0"
              >
                Change
              </button>
            </div>

            {statusMessage && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11.5px] text-emerald-300 space-y-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
                {dispatchedCode && (
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-500/20 font-mono">
                    <span className="text-zinc-300">
                      Code:{' '}
                      <strong
                        data-testid="dispatched-otp-code"
                        className="text-[13px] font-bold tracking-wider text-emerald-400"
                      >
                        {dispatchedCode}
                      </strong>
                    </span>
                    <button
                      type="button"
                      data-testid="copy-dispatched-otp-btn"
                      onClick={() => {
                        playTactilePop();
                        setOtpDigits(dispatchedCode.split('').slice(0, 6));
                        setError(null);
                      }}
                      className="text-emerald-400 hover:text-white font-medium underline cursor-pointer"
                    >
                      Paste
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 6-box OTP input */}
            <div>
              <label className="block text-[11.5px] font-mono text-zinc-400 mb-2">
                Enter 6-digit verification code
              </label>
              <div className="grid grid-cols-6 gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    aria-label={`OTP digit ${idx + 1}`}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-full h-10 text-center text-[16px] font-mono font-medium text-white rounded-md border border-white/[0.08] bg-[#0E0E12] focus:border-white/20 focus:outline-none tabular-nums"
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">
                  Didn&apos;t receive it?
                </span>
                <button
                  type="button"
                  disabled={isSendingOtp}
                  onClick={() => {
                    playTactileClick();
                    requestOtpFromServer();
                  }}
                  className="text-[11.5px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer inline-flex items-center gap-1"
                >
                  <RefreshCw size={11} className={isSendingOtp ? 'animate-spin' : ''} />
                  <span>Resend</span>
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="text-[11.5px] text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-md font-medium"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isVerifyingOtp}
              data-testid="verify-personal-otp-btn"
              className="btn-tactile w-full py-2 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-zinc-950 font-medium text-[13px] rounded-lg shadow-[0_2px_10px_rgba(16,185,129,0.2)] cursor-pointer"
            >
              {isVerifyingOtp ? 'Verifying…' : 'Open Shop Ledger'}
            </button>
          </form>
        )}

        {/* Google Sign-In */}
        <div className="mt-4 pt-3.5 border-t border-white/[0.06]">
          <button
            type="button"
            disabled={isGoogleSigningIn}
            onClick={() => {
              playTactileClick();
              handleGoogleLogin();
            }}
            className="btn-tactile w-full py-2 px-3 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-zinc-200 font-medium text-[12px] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{isGoogleSigningIn ? 'Signing in with Google…' : 'Continue with Google Account'}</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          playTactilePop();
          setPasswordHintShown(true);
        }}
        className="mt-4 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
      >
        Prefer a password? Set one in Settings after login
      </button>
      {passwordHintShown && (
        <p className="mt-1 text-[11px] text-zinc-400">
          Account password settings are available under Settings tab.
        </p>
      )}
    </div>
  );
};
