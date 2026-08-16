import { useState } from 'react';

const SLIDES = [
  {
    emoji: '⚡',
    title: 'Welcome to Patana',
    body: 'Uganda\'s verified marketplace. Every seller here has been checked — no fakes, no scams.',
  },
  {
    emoji: '🔎',
    title: 'Browse & discover',
    body: 'Find products and services by category, or search for exactly what you need.',
  },
  {
    emoji: '💬',
    title: 'Chat directly on WhatsApp',
    body: 'No middleman, no commission. Tap a listing and message the seller straight away.',
  },
  {
    emoji: '🛍️',
    title: 'Have something to sell?',
    body: 'Join as a verified seller and reach real buyers — free to apply.',
  },
];

const STORAGE_KEY = 'patana_onboarded_v1';

export function shouldShowOnboarding() {
  try {
    return !localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

export default function OnboardingTour({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === SLIDES.length - 1;

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore — worst case the tour shows again next visit
    }
    onDone();
  }

  const slide = SLIDES[step];

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <button
        onClick={finish}
        className="absolute top-4 right-4 text-sm text-gray-400 px-3 py-1.5"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        Skip
      </button>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="text-6xl mb-6">{slide.emoji}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{slide.title}</h1>
        <p className="text-gray-500 max-w-xs leading-relaxed">{slide.body}</p>
      </div>

      <div
        className="px-6 pb-8 flex flex-col items-center gap-6"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-patana-600' : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          className="btn-primary w-full max-w-xs py-3.5"
        >
          {isLast ? 'Get Started' : 'Next'}
        </button>
      </div>
    </div>
  );
}
