import { useEffect, useMemo, useState } from 'react';
import { CircleAlert, Loader2, PencilLine } from 'lucide-react';
import type { PendingClarification } from '../../hooks/workflow/types';
import { Button, Input } from '../ui';

interface ClarificationPanelProps {
  clarification: PendingClarification;
  maxWidth?: number;
  onSubmit: (text: string) => Promise<void>;
}

export function ClarificationPanel({ clarification, maxWidth = 760, onSubmit }: ClarificationPanelProps) {
  const [entered, setEntered] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [submittingValue, setSubmittingValue] = useState<string | null>(null);

  useEffect(() => {
    setEntered(false);
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [clarification.question]);

  const options = useMemo(() => clarification.options ?? [], [clarification.options]);

  const handleSubmit = async (value: string) => {
    const text = value.trim();
    if (!text || submittingValue) return;
    setSubmittingValue(text);
    try {
      await onSubmit(text);
      setCustomValue('');
    } finally {
      setSubmittingValue(null);
    }
  };

  return (
    <div className="flex-shrink-0 px-16 pb-6">
      <div
        className="mx-auto w-full rounded-[2rem] border border-border-light bg-surface shadow-sm"
        style={{
          maxWidth,
          transition: 'transform 220ms ease-out, opacity 220ms ease-out',
          transform: entered ? 'translateY(0)' : 'translateY(18px)',
          opacity: entered ? 1 : 0.92,
        }}
      >
        <div className="flex items-start gap-4 px-7 py-6">
          <div className="mt-0.5 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-warning">
            <CircleAlert size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-sans text-[15px] font-semibold text-warning">Needs more info from you</div>
            <p className="mt-2 whitespace-pre-wrap font-sans text-[17px] leading-8 text-primary">
              {clarification.question}
            </p>
          </div>
        </div>

        {options.length > 0 ? (
          <div className="px-6 pb-2">
            {options.map((option, index) => {
              const isSubmitting = submittingValue === option.label;
              return (
                <button
                  key={`${option.label}:${index}`}
                  type="button"
                  onClick={() => void handleSubmit(option.label)}
                  disabled={!!submittingValue}
                  className={[
                    'flex w-full items-center gap-4 border-none bg-transparent px-2 py-6 text-left transition-colors duration-200',
                    'disabled:cursor-default disabled:opacity-70',
                    index === 0 && !submittingValue ? 'rounded-[1.8rem] bg-surface-hover' : '',
                    index < options.length - 1 ? 'border-b border-border-subtle' : '',
                  ].join(' ')}
                >
                  <div className="flex h-[3.3rem] w-[3.3rem] flex-shrink-0 items-center justify-center rounded-[1.25rem] bg-surface-tertiary font-sans text-[18px] text-secondary">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-sans text-[16px] font-medium text-primary">{option.label}</div>
                    {option.description ? (
                      <div className="mt-1 font-sans text-sm text-muted">{option.description}</div>
                    ) : null}
                  </div>
                  {isSubmitting ? <Loader2 size={18} className="animate-spin text-muted" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}

        {clarification.allowCustom ? (
          <div className="border-t border-border-subtle px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-[3.3rem] w-[3.3rem] flex-shrink-0 items-center justify-center rounded-[1.25rem] bg-surface-tertiary text-secondary">
                <PencilLine size={20} />
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Input
                  value={customValue}
                  onChange={(event) => setCustomValue(event.target.value)}
                  placeholder="Something else"
                  disabled={!!submittingValue}
                  className="!rounded-2xl !border-border-light !bg-surface-secondary !px-4 !py-3 text-[16px]"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleSubmit(customValue);
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  size="md"
                  disabled={!customValue.trim() || !!submittingValue}
                  onClick={() => void handleSubmit(customValue)}
                  className="min-w-[7rem] !rounded-2xl"
                >
                  {submittingValue && customValue.trim() ? <Loader2 size={16} className="animate-spin" /> : null}
                  Send
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
