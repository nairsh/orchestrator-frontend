import { useEffect, useMemo, useState } from 'react';
import { Info, ArrowRight } from 'lucide-react';
import type { PendingClarification } from '../../hooks/workflow/types';
import { Button } from '../ui';

interface ClarificationPanelProps {
  clarification: PendingClarification;
  maxWidth?: number;
  onSubmit: (text: string) => Promise<void>;
  onDismiss?: () => void;
}

export function ClarificationPanel({ clarification, maxWidth = 760, onSubmit, onDismiss }: ClarificationPanelProps) {
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
  
  // Check if last option is the "custom" option (usually has text about telling Codex what to do)
  const hasCustomOption = clarification.allowCustom || 
    (options.length > 0 && options[options.length - 1]?.label.toLowerCase().includes('tell'));
  
  const customOptionIndex = hasCustomOption ? options.length - 1 : -1;
  const regularOptions = hasCustomOption ? options.slice(0, -1) : options;

  const handleSubmit = async () => {
    if (selectedOption === null && !customValue.trim()) return;
    
    setIsSubmitting(true);
    try {
      let text = '';
      if (selectedOption !== null && selectedOption !== customOptionIndex) {
        text = options[selectedOption]?.label ?? '';
      } else if (customValue.trim()) {
        text = customValue.trim();
      }
      if (text) {
        await onSubmit(text);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOptionClick = (index: number) => {
    if (isSubmitting) return;
    setSelectedOption(index);
    if (index !== customOptionIndex) {
      setCustomValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onDismiss) {
      onDismiss();
    } else if (e.key === 'Enter' && e.metaKey) {
      void handleSubmit();
    }
  };

  return (
    <div 
      className="flex-shrink-0 px-16 pb-6"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        className="mx-auto w-full rounded-2xl border border-border-light bg-surface shadow-sm overflow-hidden"
        style={{
          maxWidth,
          transition: 'transform 200ms ease-out, opacity 200ms ease-out',
          transform: entered ? 'translateY(0)' : 'translateY(16px)',
          opacity: entered ? 1 : 0.95,
        }}
      >
        {/* Question */}
        <div className="px-6 pt-5 pb-4">
          <p className="font-sans text-[15px] leading-relaxed text-primary">
            {clarification.question}
          </p>
        </div>

        {/* Options List */}
        <div className="px-3 pb-2">
          {regularOptions.map((option, index) => {
            const isSelected = selectedOption === index;
            const isRecommended = index === 0; // First option is usually recommended
            
            return (
              <button
                key={`${option.label}:${index}`}
                type="button"
                onClick={() => handleOptionClick(index)}
                disabled={isSubmitting}
                className={[
                  'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-150 mb-2',
                  'border',
                  isSelected 
                    ? 'bg-surface-hover border-border' 
                    : 'bg-surface-secondary/50 border-transparent hover:bg-surface-hover',
                  'disabled:cursor-default disabled:opacity-60',
                ].join(' ')}
              >
                <span className="flex-shrink-0 font-sans text-[15px] text-muted tabular-nums">
                  {index + 1}.
                </span>
                <span className="flex-1 font-sans text-[15px] text-primary">
                  {option.label}
                  {isRecommended && (
                    <span className="ml-2 text-muted">(Recommended)</span>
                  )}
                </span>
                {isRecommended && (
                  <Info size={16} className="flex-shrink-0 text-muted" />
                )}
              </button>
            );
          })}

          {/* Custom/Last option with input - always visible like in the design */}
          {hasCustomOption && customOptionIndex >= 0 && (
            <div className="w-full rounded-xl border border-border-light bg-surface mb-2 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle/50">
                <span className="flex-shrink-0 font-sans text-[15px] text-muted tabular-nums">
                  {customOptionIndex + 1}.
                </span>
                <span className="flex-1 font-sans text-[15px] text-primary">
                  {options[customOptionIndex]?.label || "No, and tell Codex what to do differently"}
                </span>
              </div>
              
              <div className="px-4 py-3 bg-surface-secondary/30">
                <input
                  type="text"
                  value={customValue}
                  onChange={(e) => {
                    setCustomValue(e.target.value);
                    setSelectedOption(customOptionIndex);
                  }}
                  placeholder="Tell Codex what to do differently..."
                  disabled={isSubmitting}
                  className="w-full px-3 py-2.5 rounded-lg border border-border-light bg-surface text-[14px] placeholder:text-muted focus:outline-none focus:border-border focus:ring-1 focus:ring-border/50"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer with actions */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-border-subtle/50">
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-3 py-2 text-[13px] text-muted hover:text-primary transition-colors"
            >
              Dismiss
              <span className="px-2 py-0.5 rounded-md bg-surface-tertiary text-[11px] font-medium text-secondary">
                ESC
              </span>
            </button>
          )}
          
          <Button
            variant="primary"
            size="md"
            disabled={selectedOption === null && !customValue.trim() || isSubmitting}
            onClick={() => void handleSubmit()}
            className="!rounded-xl !px-4 !py-2 !text-[13px] font-medium bg-info hover:bg-info/90 text-white"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                Submit
                <ArrowRight size={14} className="ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
