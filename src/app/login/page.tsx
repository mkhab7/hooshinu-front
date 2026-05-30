"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useRequestOtp, useVerifyOtp } from "@/features/auth/hooks";
import { HooshinuError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Toaster, useToast } from "@/components/ui/Toast";

const PHONE_RE = /^09\d{9}$/;

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const { hydrated, isAuthed } = useAuthStore();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hydrated && isAuthed) router.replace("/dashboard");
  }, [hydrated, isAuthed, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    if (!PHONE_RE.test(phone)) {
      toast.error("شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.");
      return;
    }
    try {
      await requestOtp.mutateAsync(phone);
      setStep("code");
      setCooldown(60);
      setTimeout(() => codeRef.current?.focus(), 100);
      toast.success("کد تأیید ارسال شد.");
    } catch (err) {
      const e2 = err as HooshinuError;
      if (e2.status === 429 && e2.retryAfter) setCooldown(e2.retryAfter);
      toast.error(e2.message);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length < 4) {
      toast.error("کد تأیید را کامل وارد کنید.");
      return;
    }
    try {
      await verifyOtp.mutateAsync({ phone, code: code.trim() });
      router.replace("/dashboard");
    } catch (err) {
      toast.error((err as HooshinuError).message);
    }
  }

  async function resend() {
    if (cooldown > 0) return;
    try {
      await requestOtp.mutateAsync(phone);
      setCooldown(60);
      toast.success("کد مجدداً ارسال شد.");
    } catch (err) {
      const e2 = err as HooshinuError;
      if (e2.status === 429 && e2.retryAfter) setCooldown(e2.retryAfter);
      toast.error(e2.message);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-blob absolute -top-20 end-1/4 size-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="animate-blob absolute bottom-0 start-1/4 size-80 rounded-full bg-violet-500/20 blur-3xl [animation-delay:3s]" />
      </div>
      <Toaster />
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="animate-blob mb-4 flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-400 to-violet-600 text-white shadow-2xl shadow-brand-600/40">
            <Sparkles className="size-8" />
          </div>
          <h1 className="bg-gradient-to-l from-brand-500 to-violet-500 bg-clip-text text-3xl font-extrabold text-transparent">
            هوشینو
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            پلتفرم هوش مصنوعی فارسی — ورود با شماره موبایل
          </p>
        </div>

        <div className="glass rounded-3xl p-6 shadow-2xl shadow-black/10">
          {step === "phone" ? (
            <form onSubmit={submitPhone} className="space-y-4">
              <Field label="شماره موبایل">
                <Input
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11))
                  }
                  className="text-center tracking-widest"
                  autoFocus
                />
              </Field>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={requestOtp.isPending}
              >
                دریافت کد تأیید
              </Button>
            </form>
          ) : (
            <form onSubmit={submitCode} className="space-y-4">
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <ArrowLeft className="size-4" />
                ویرایش شماره
              </button>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                کد ارسال‌شده به{" "}
                <span dir="ltr" className="font-medium">
                  {phone}
                </span>{" "}
                را وارد کنید.
              </p>
              <Field label="کد تأیید">
                <Input
                  ref={codeRef}
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="----"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))
                  }
                  className="text-center text-lg tracking-[0.5em]"
                />
              </Field>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={verifyOtp.isPending}
              >
                ورود
              </Button>
              <button
                type="button"
                onClick={resend}
                disabled={cooldown > 0 || requestOtp.isPending}
                className="w-full text-center text-sm text-brand-500 hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                {cooldown > 0
                  ? `ارسال مجدد کد تا ${cooldown} ثانیه دیگر`
                  : "ارسال مجدد کد"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          با ورود، شرایط استفاده و حریم خصوصی هوشینو را می‌پذیرید.
        </p>
      </div>
    </main>
  );
}
