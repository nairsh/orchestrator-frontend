import { useEffect, useState } from 'react';
import { BotMessageSquare, ArrowRight, Zap, Palette, X } from 'lucide-react';
import { Button } from './ui/Button';

interface OnboardingModalProps {
  onClose: () => void;
  onStartWorkflow?: () => void;
  onOpenSettings?: () => void;
}

const ONBOARDING_KEY = 'relay:onboarding-completed';

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

const steps = [
  {
    icon: <BotMessageSquare size={32} className="text-info" />,
    title: 'Welcome to Relay Pro',
    description: 'Your AI that gets things done. Relay Pro breaks down complex goals, coordinates the right tools, and delivers results — from research reports to code to data analysis.',
    cta: 'Next',
  },
  {
    icon: <Zap size={32} className="text-warning" />,
    title: 'Start Your First Task',
    description: 'Type any goal in the input field and Relay Pro will figure out the rest. Try "Research the latest trends in AI" or "Create a project plan for a mobile app".',
    cta: 'Next',
  },
  {
    icon: <Palette size={32} className="text-accent" />,
    title: 'Customize Your Setup',
    description: 'Choose your preferred AI in the dropdown, connect services like GitHub, Linear, and Notion, upload knowledge documents, and create custom skills to make Relay Pro work the way you want.',
    cta: 'Get Started',
  },
];

export function OnboardingModal({ onClose, onStartWorkflow: _onStartWorkflow, onOpenSettings: _onOpenSettings }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      markOnboardingComplete();
      onClose();
    }
  };

  const handleSkip = () => {
    markOnboardingComplete();
    onClose();
  };

  const current = steps[step];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleSkip(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) handleSkip(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to Relay Pro"
        className="w-full max-w-md bg-surface rounded-2xl shadow-modal border border-border-light overflow-hidden animate-scale-in"
      >
        {/* Close button */}
        <div className="flex justify-end px-4 pt-4">
          <button type="button" onClick={handleSkip} className="text-muted hover:text-primary transition-colors duration-200 cursor-pointer" aria-label="Close onboarding">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center px-8 pb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-tertiary flex items-center justify-center mb-5">
            {current.icon}
          </div>
          <h2 className="text-xl font-semibold text-primary mb-3">{current.title}</h2>
          <p className="text-sm text-secondary leading-relaxed mb-8">{current.description}</p>

          {/* Progress dots */}
          <div className="flex items-center gap-2 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                  i === step ? 'bg-info' : i < step ? 'bg-info/40' : 'bg-surface-hover'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 w-full">
            <Button variant="ghost" onClick={handleSkip} className="flex-1">
              Skip
            </Button>
            <Button variant="primary" onClick={handleNext} className="flex-1 gap-2">
              {current.cta}
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
