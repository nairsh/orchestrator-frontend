import { useMemo, useState } from 'react';
import { CircleAlert, Loader2 } from 'lucide-react';
import { Button, Input } from '../../ui';
import { asRecord } from './feedHelpers';

export interface ClarificationOption {
  label: string;
  description?: string;
}

export interface ClarificationDetails {
  question: string;
  options: ClarificationOption[];
  allowCustom: boolean;
}

function normalizeClarificationOptions(value: unknown): ClarificationOption[] {
  if (!Array.isArray(value)) return [];
  const options: ClarificationOption[] = [];
  for (const option of value) {
    if (!option || typeof option !== 'object') continue;
    const record = option as Record<string, unknown>;
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    if (!label) continue;
    const description = typeof record.description === 'string' ? record.description.trim() : undefined;
    options.push(description ? { label, description } : { label });
  }
  return options;
}

export function getClarificationDetails(input: unknown, output: unknown): ClarificationDetails | null {
  const inp = asRecord(input);
  const out = asRecord(output);
  const question =
    (typeof out.clarification_question === 'string' && out.clarification_question.trim()) ||
    (typeof out.question === 'string' && out.question.trim()) ||
    (typeof inp.question === 'string' && inp.question.trim()) ||
    '';

  if (!question) return null;

  const options = normalizeClarificationOptions(out.options ?? inp.options);
  const allowCustom = out.allow_custom !== false && inp.allow_custom !== false;
  return { question, options, allowCustom };
}

export function useClarification(toolName: string, input: unknown, output: unknown) {
  const clarification = useMemo(
    () => (toolName === 'request_clarification' ? getClarificationDetails(input, output) : null),
    [input, output, toolName],
  );
  return { clarification, isClarification: toolName === 'request_clarification' && clarification !== null };
}

export function ClarificationPrompt({
  details,
  disabled,
  onSubmit,
}: {
  details: ClarificationDetails;
  disabled: boolean;
  onSubmit?: (text: string) => Promise<void>;
}) {
  const [customValue, setCustomValue] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);

  const handleSubmit = async (value: string) => {
    const text = value.trim();
    if (!text || disabled || !onSubmit) return;
    setSubmitting(text);
    try {
      await onSubmit(text);
      setCustomValue('');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="rounded-xl border border-warning/25 bg-warning/10 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-warning/15">
          <CircleAlert size={18} className="text-warning" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-warning">Needs more info from you</div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-secondary">{details.question}</p>

          {details.options.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {details.options.map((option) => {
                const busy = submitting === option.label;
                return (
                  <Button
                    key={option.label}
                    variant="secondary"
                    size="sm"
                    disabled={disabled || !!submitting}
                    onClick={() => void handleSubmit(option.label)}
                    className="max-w-full"
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : null}
                    <span className="truncate">{option.label}</span>
                  </Button>
                );
              })}
            </div>
          )}

          {details.options.some((option) => option.description) && (
            <div className="mt-2 flex flex-col gap-1">
              {details.options.map((option) =>
                option.description ? (
                  <div key={`${option.label}:description`} className="text-xs text-muted">
                    <span className="font-medium text-secondary">{option.label}</span>
                    <span>{` — ${option.description}`}</span>
                  </div>
                ) : null
              )}
            </div>
          )}

          {details.allowCustom && (
            <div className="mt-3 flex items-center gap-2">
              <Input
                value={customValue}
                onChange={(event) => setCustomValue(event.target.value)}
                placeholder="Type your answer…"
                disabled={disabled || !!submitting}
                className="!rounded-lg !py-2"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSubmit(customValue);
                  }
                }}
              />
              <Button
                variant="primary"
                size="sm"
                disabled={disabled || !!submitting || !customValue.trim()}
                onClick={() => void handleSubmit(customValue)}
              >
                {submitting && customValue.trim() ? <Loader2 size={13} className="animate-spin" /> : null}
                Send
              </Button>
            </div>
          )}

          {!onSubmit && <div className="mt-3 text-xs text-muted">Reply in the input below to continue.</div>}
        </div>
      </div>
    </div>
  );
}
