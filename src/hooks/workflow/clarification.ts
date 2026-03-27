import type { ClarificationOption, ClarificationRequestedData } from '../../api/types';
import type { PendingClarification } from './types';

const OPTION_MARKERS = [
  'Please select one of these options:',
  'Select one of these options:',
  'Choose one of these options:',
  'Provide these exact options:',
  'Use exactly these option labels:',
  'Options:',
];

const normalizeClarificationOptions = (value: unknown): ClarificationOption[] => {
  if (!Array.isArray(value)) return [];

  return value.reduce<ClarificationOption[]>((acc, option) => {
    if (!option || typeof option !== 'object') return acc;
    const record = option as Record<string, unknown>;
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    if (!label) return acc;
    const description = typeof record.description === 'string' ? record.description.trim() : undefined;
    acc.push(description ? { label, description } : { label });
    return acc;
  }, []);
};

const splitQuestionAndOptions = (rawQuestion: string): { question: string; options: ClarificationOption[] } => {
  const question = rawQuestion.trim();
  if (!question) return { question: '', options: [] };

  const marker = OPTION_MARKERS.find((candidate) => question.toLowerCase().includes(candidate.toLowerCase()));
  if (!marker) return { question, options: [] };

  const markerIndex = question.toLowerCase().indexOf(marker.toLowerCase());
  const cleanQuestion = question.slice(0, markerIndex).trim().replace(/[\s:;,.]+$/, '');

  let optionsText = question.slice(markerIndex + marker.length).trim();
  optionsText = optionsText
    .replace(/\s+or you can provide .*$/i, '')
    .replace(/\s+you can also provide .*$/i, '')
    .replace(/\s+or provide .*$/i, '')
    .replace(/\s+also allow .*$/i, '')
    .replace(/[.\s]+$/, '');

  const rawOptions = optionsText
    .split(/\s*;\s*/)
    .map((option) => option.trim())
    .filter(Boolean);

  if (rawOptions.length < 2) {
    return { question, options: [] };
  }

  return {
    question: cleanQuestion || question,
    options: rawOptions.map((label) => ({ label })),
  };
};

export const buildPendingClarification = (
  questionValue: unknown,
  optionsValue: unknown,
  allowCustomValue: unknown,
): PendingClarification | undefined => {
  const rawQuestion = typeof questionValue === 'string' ? questionValue.trim() : '';
  if (!rawQuestion) return undefined;

  const explicitOptions = normalizeClarificationOptions(optionsValue);
  const fallback = splitQuestionAndOptions(rawQuestion);
  const question = explicitOptions.length > 0 ? rawQuestion : fallback.question;
  const options = explicitOptions.length > 0 ? explicitOptions : fallback.options;

  return {
    question,
    options: options.length > 0 ? options : undefined,
    allowCustom: allowCustomValue !== false,
  };
};

export const buildPendingClarificationFromEvent = (data: ClarificationRequestedData): PendingClarification | undefined =>
  buildPendingClarification(data.question, data.options, data.allow_custom);

export const buildPendingClarificationFromToolPayload = (
  input: unknown,
  output: unknown,
): PendingClarification | undefined => {
  const inputRecord = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const outputRecord = output && typeof output === 'object' ? (output as Record<string, unknown>) : {};

  return buildPendingClarification(
    outputRecord.clarification_question ?? outputRecord.question ?? inputRecord.question,
    outputRecord.options ?? inputRecord.options,
    outputRecord.allow_custom ?? inputRecord.allow_custom,
  );
};
