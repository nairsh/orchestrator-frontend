import { useEffect, useMemo, useState } from 'react';
import { Info, ArrowRight } from 'lucide-react';
import type { PendingClarification } from '../../hooks/workflow/types';
import { Button } from '../ui';
import { toastApiError } from '../../lib/toast';

interface ClarificationPanelProps {
  clarification: PendingClarification;
  maxWidth?: number;
  onSubmit: (text: string) => Promise<void>;
  onDismiss?: () => void;
}

export function ClarificationPanel({ clarification, maxWidth = 600, onSubmit, onDismiss }: ClarificationPanelProps) {
  const [entered, setEntered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [customValue, setCustomValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setEntered(false);
    setSelectedOption(null);
    setCustomValue('');
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [clarification.question]);

  const options = useMemo(() => clarification.options ?? [], [clarification.options]);

  const handleSubmit = async () => {
    if (selectedOption === null && !customValue.trim()) return;
    
    setIsSubmitting(true);
    try {
      let text = '';
      if (selectedOption !== null && selectedOption < options.length) {
        text = options[selectedOption]?.label ?? '';
      } else if (customValue.trim()) {
        text = customValue.trim();
      }
      if (text) {
        await onSubmit(text);
      }
    } catch (err) {
      toastApiError(err instanceof Error ? err : new Error('Submission failed'), 'Clarification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOptionClick = (index: number) => {
    if (isSubmitting) return;
    setSelectedOption(index);
    setCustomValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onDismiss) {
      e.preventDefault();
      onDismiss();
    } else if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  // Build display options: all provided options + always add custom option
  const displayOptions = useMemo(() => {
    const baseOptions = [...options];
    // Always add a custom option at the end
    baseOptions.push({
      label: "No, and tell Relay what to do differently",
    });
    return baseOptions;
  }, [options]);

  const customOptionIndex = displayOptions.length - 1;
  const regularOptions = displayOptions.slice(0, -1);

  return (
    <div 
      className="flex-shrink-0 px-16 pb-2 outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="mx-auto w-full rounded-xl border border-border-light bg-surface shadow-sm overflow-hidden"
        style={{
          maxWidth,
          transition: 'transform 200ms ease-out, opacity 200ms ease-out',
          transform: entered ? 'translateY(0)' : 'translateY(16px)',
          opacity: entered ? 1 : 0.95,
        }}
      >
        {/* Question */}
        <div className="px-5 pt-4 pb-5">
          <p className="font-sans text-[14px] leading-relaxed text-primary">
            {clarification.question}
          </p>
        </div>

        {/* Options List */}
        <div className="px-3 pb-2">
          {regularOptions.map((option, index) => {
            const isSelected = selectedOption === index;
            const isRecommended = index === 0;
            
            return (
              <button
                key={`${option.label}:${index}`}
                type="button"
                onClick={() => handleOptionClick(index)}
                disabled={isSubmitting}
                className={[
                  'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-150 mb-2',
                  'border',
                  isSelected 
                    ? 'bg-surface-hover border-border' 
                    : 'bg-surface-secondary/50 border-transparent hover:bg-surface-hover',
                  'disabled:cursor-default disabled:opacity-60',
                ].join(' ')}
              >
                <span className="flex-shrink-0 font-sans text-[14px] text-muted tabular-nums">
                  {index + 1}.
                </span>
                <span className="flex-1 font-sans text-[14px] text-primary">
                  {option.label}
                  {isRecommended && (
                    <span className="ml-1.5 text-muted">(Recommended)</span>
                  )}
                </span>
                {isRecommended && (
                  <Info size={14} className="flex-shrink-0 text-muted" />
                )}
              </button>
            );
          })}

          {/* Custom option with input - always visible */}
          <div className="w-full rounded-lg border border-border-light bg-surface mb-2 overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border-subtle/50">
              <span className="flex-shrink-0 font-sans text-[14px] text-muted tabular-nums">
                {customOptionIndex + 1}.
              </span>
              <span className="flex-1 font-sans text-[14px] text-primary">
                {displayOptions[customOptionIndex]?.label}
              </span>
            </div>
            
            <div className="px-3 py-2.5 bg-surface-secondary/30">
              <input
                type="text"
                value={customValue}
                onChange={(e) => {
                  setCustomValue(e.target.value);
                  setSelectedOption(customOptionIndex);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Tell Relay what to do differently"
                aria-label="Custom response"
                disabled={isSubmitting}
                className="w-full px-3 py-2 rounded-md border border-border-light bg-surface text-[13px] placeholder:text-muted focus:outline-none focus:border-border focus:ring-1 focus:ring-border/50"
              />
            </div>
          </div>
        </div>

        {/* Footer with actions */}
        <div className="flex items-center justify-end gap-3 px-3 py-2.5 border-t border-border-subtle/50">
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-2 py-1.5 text-[12px] text-muted hover:text-primary transition-colors"
            >
              Dismiss
              <span className="px-1.5 py-0.5 rounded bg-surface-tertiary text-[10px] font-medium text-secondary">
                ESC
              </span>
            </button>
          )}
          
          <Button
            variant="primary"
            size="sm"
            disabled={(selectedOption === null && !customValue.trim()) || isSubmitting}
            onClick={() => void handleSubmit()}
            className="!rounded-lg !px-3 !py-1.5 !text-[12px] font-medium bg-info hover:bg-info/90 text-white"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                Submitting...
              </>
            ) : (
              <>
                Submit
                <ArrowRight size={12} className="ml-1.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
