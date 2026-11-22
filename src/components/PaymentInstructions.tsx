import { useState } from 'react';
import { Check, Copy, Smartphone } from 'lucide-react';
import { Language } from '../data/content';

interface PaymentInstructionsProps {
  lang: Language;
  amount: number;
  upiIntentUrl?: string;
  orderId?: string;
}

function extractUpiIdFromIntent(upiIntentUrl?: string): string | null {
  if (!upiIntentUrl) return null;
  try {
    const queryIdx = upiIntentUrl.indexOf('?');
    if (queryIdx === -1) return null;
    const params = new URLSearchParams(upiIntentUrl.slice(queryIdx + 1));
    const pa = params.get('pa')?.trim();
    if (pa && pa.includes('@')) return pa;
  } catch {
    // Ignore malformed intent URI
  }
  return null;
}

export function PaymentInstructions({
  lang,
  amount,
  upiIntentUrl,
  orderId,
}: PaymentInstructionsProps) {
  const [copiedField, setCopiedField] = useState<'upi' | 'order' | null>(null);
  const dynamicUpiId = extractUpiIdFromIntent(upiIntentUrl);

  const stepsByLang: Record<Language, string[]> = {
    en: [
      'Open Google Pay, PhonePe or any supported UPI application.',
      'Scan the displayed QR code.',
      `Pay ₹${amount}.`,
      'Return to STAR EVENT LIVE.',
      'Enter your Transaction ID.',
    ],
    mr: [
      'Google Pay, PhonePe किंवा कोणतेही UPI अ‍ॅप उघडा.',
      'स्क्रीनवर दिसणारा डायनॅमिक QR कोड स्कॅन करा.',
      `₹${amount} पेमेंट पूर्ण करा.`,
      'पुन्हा STAR EVENT LIVE वर या.',
      'तुमचा Transaction ID (UTR) खाली टाकून सबमिट करा.',
    ],
    hi: [
      'Google Pay, PhonePe या कोई भी UPI ऐप खोलें।',
      'स्क्रीन पर दिख रहा डायनामिक QR कोड स्कैन करें।',
      `₹${amount} का भुगतान करें।`,
      'STAR EVENT LIVE पर वापस आएं।',
      'अपना Transaction ID (UTR) नीचे दर्ज करके सबमिट करें।',
    ],
    gu: [
      'Google Pay, PhonePe અથવા કોઈપણ UPI એપ ખોલો.',
      'સ્ક્રીન પર દેખાતો ડાયનેમિક QR કોડ સ્કેન કરો.',
      `₹${amount} નું પેમેન્ટ પૂર્ણ કરો.`,
      'STAR EVENT LIVE પર પાછા આવો.',
      'તમારો Transaction ID (UTR) નીચે દાખલ કરીને સબમિટ કરો.',
    ],
  };

  const steps = stepsByLang[lang];

  const handleCopy = async (value: string, field: 'upi' | 'order') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for restricted clipboard contexts
      const input = document.createElement('textarea');
      input.value = value;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      try {
        document.execCommand('copy');
        setCopiedField(field);
        window.setTimeout(() => setCopiedField(null), 2000);
      } finally {
        document.body.removeChild(input);
      }
    }
  };

  return (
    <div className="bg-[#0D0D11] border border-white/12 rounded-xl p-4 space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FACC15] flex items-center gap-2">
          <Smartphone className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{lang === 'mr' ? 'पेमेंट सूचना (Payment Instructions)' : 'Payment Instructions'}</span>
        </h4>
        <span className="font-mono text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
          UPI · ₹{amount}
        </span>
      </div>

      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={index} className="flex items-start gap-2.5 text-xs text-zinc-200 leading-relaxed">
            <span className="w-5 h-5 rounded-md bg-[#FACC15]/15 border border-[#FACC15]/40 text-[#FACC15] font-mono text-[11px] font-bold inline-flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {(dynamicUpiId || orderId) && (
        <div className="pt-2.5 border-t border-white/10 space-y-2">
          {dynamicUpiId && (
            <div className="flex items-center justify-between gap-2 bg-[#14141A] border border-white/10 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                  {lang === 'mr' ? 'डायनॅमिक UPI ID' : 'Dynamic UPI ID'}
                </p>
                <p className="font-mono text-xs font-semibold text-white truncate">{dynamicUpiId}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(dynamicUpiId, 'upi')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-md transition-colors shrink-0"
              >
                {copiedField === 'upi' ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{lang === 'mr' ? 'कॉपी झाले' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{lang === 'mr' ? 'कॉपी UPI' : 'Copy UPI'}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {orderId && (
            <div className="flex items-center justify-between gap-2 bg-[#14141A] border border-white/10 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                  {lang === 'mr' ? 'Cashfree ऑर्डर ID' : 'Cashfree Order ID'}
                </p>
                <p className="font-mono text-xs font-semibold text-zinc-200 truncate">{orderId}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(orderId, 'order')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono font-bold text-zinc-200 hover:text-white border border-white/15 hover:border-white/30 rounded-md transition-colors shrink-0"
              >
                {copiedField === 'order' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#4ADE80]" aria-hidden="true" />
                    <span className="text-[#4ADE80]">{lang === 'mr' ? 'कॉपी झाले' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                    <span>{lang === 'mr' ? 'कॉपी' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
