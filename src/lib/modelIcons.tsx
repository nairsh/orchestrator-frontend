import { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';

export const MODEL_ICON_LOCAL_STORAGE_KEY = 'relay_model_icon_overrides';
export const MODEL_ICON_METADATA_NAMESPACE = 'relayPro';
export const MODEL_ICON_METADATA_FIELD = 'modelIconOverrides';

export interface ModelIconDefinition {
  key: string;
  label: string;
  src: string;
}

export type ModelIconOverrides = Record<string, string>;

export const MODEL_ICON_DEFINITIONS: ModelIconDefinition[] = [
  { key: 'generic',     label: 'Generic model',       src: '/model-icons/generic.svg' },
  { key: 'openai',      label: 'OpenAI / GPT',        src: '/model-icons/openai.svg' },
  { key: 'anthropic',   label: 'Claude',               src: '/model-icons/claude.svg' },
  { key: 'google',      label: 'Gemini',               src: '/model-icons/gemini.svg' },
  { key: 'perplexity',  label: 'Perplexity / Sonar',  src: '/model-icons/perplexity.svg' },
  { key: 'groq',        label: 'Groq',                 src: '/model-icons/groq.svg' },
  { key: 'mistral',     label: 'Mistral',              src: '/model-icons/mistral.svg' },
  { key: 'zai',         label: 'Z.AI / GLM',           src: '/model-icons/zai.svg' },
  { key: 'nvidia',      label: 'NVIDIA / Nemotron',    src: '/model-icons/nvidia.svg' },
  { key: 'deepseek',    label: 'DeepSeek',             src: '/model-icons/deepseek.svg' },
  { key: 'qwen',        label: 'Qwen',                 src: '/model-icons/qwen.svg' },
  { key: 'minimax',     label: 'MiniMax',              src: '/model-icons/minimax.svg' },
  { key: 'kimi',        label: 'Kimi',                 src: '/model-icons/kimi.svg' },
  { key: 'meta',        label: 'Meta / Llama',         src: '/model-icons/meta.svg' },
];

const ICONS_BY_KEY = new Map<string, ModelIconDefinition>(
  MODEL_ICON_DEFINITIONS.map((entry) => [entry.key, entry])
);

function toLower(value: string | undefined | null): string {
  return (value ?? '').toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getModelIconDefinition(iconKey: string): ModelIconDefinition {
  return ICONS_BY_KEY.get(iconKey) ?? ICONS_BY_KEY.get('generic')!;
}

export function isValidModelIconKey(iconKey: string): boolean {
  return ICONS_BY_KEY.has(iconKey);
}

export function sanitizeModelIconOverrides(value: unknown): ModelIconOverrides {
  if (!isRecord(value)) return {};
  const result: ModelIconOverrides = {};
  for (const [modelId, iconKeyRaw] of Object.entries(value)) {
    if (typeof modelId !== 'string' || !modelId.trim()) continue;
    if (typeof iconKeyRaw !== 'string') continue;
    const iconKey = iconKeyRaw.trim();
    if (!iconKey || !isValidModelIconKey(iconKey)) continue;
    result[modelId] = iconKey;
  }
  return result;
}

export function inferModelIconKey(modelId: string, provider?: string): string {
  const lowerModelId = toLower(modelId);
  const lowerProvider = toLower(provider);
  const combined = `${lowerProvider}/${lowerModelId}`;

  if (
    lowerProvider.includes('perplexity') ||
    combined.includes('sonar') ||
    combined.includes('perplexity')
  ) {
    return 'perplexity';
  }
  if (
    lowerProvider.includes('openai') ||
    combined.includes('openai') ||
    combined.includes('gpt-') ||
    combined.includes('/gpt')
  ) {
    return 'openai';
  }
  if (
    lowerProvider.includes('anthropic') ||
    combined.includes('anthropic') ||
    combined.includes('claude')
  ) {
    return 'anthropic';
  }
  if (
    lowerProvider.includes('google') ||
    combined.includes('google') ||
    combined.includes('gemini')
  ) {
    return 'google';
  }
  if (lowerProvider.includes('groq') || combined.includes('groq')) {
    return 'groq';
  }
  if (lowerProvider.includes('mistral') || combined.includes('mistral')) {
    return 'mistral';
  }
  if (
    lowerProvider.includes('zai') ||
    lowerProvider.includes('zhipu') ||
    combined.includes('zai') ||
    combined.includes('glm')
  ) {
    return 'zai';
  }
  if (lowerProvider.includes('xiaomi') || combined.includes('xiaomi')) {
    return 'minimax';
  }
  if (combined.includes('nemotron') || combined.includes('nvidia')) {
    return 'nvidia';
  }
  if (combined.includes('deepseek')) {
    return 'deepseek';
  }
  if (combined.includes('qwen')) {
    return 'qwen';
  }
  if (combined.includes('minimax')) {
    return 'minimax';
  }
  if (combined.includes('kimi') || combined.includes('moonshot')) {
    return 'kimi';
  }
  if (
    lowerProvider.includes('meta') ||
    combined.includes('meta') ||
    combined.includes('llama')
  ) {
    return 'meta';
  }
  return 'generic';
}

export function resolveModelIconKey(modelId: string, provider: string | undefined, overrides?: ModelIconOverrides): string {
  const configured = overrides?.[modelId];
  if (configured && isValidModelIconKey(configured)) {
    return configured;
  }
  return inferModelIconKey(modelId, provider);
}

export function extractModelIconOverridesFromUnsafeMetadata(unsafeMetadata: unknown): ModelIconOverrides {
  if (!isRecord(unsafeMetadata)) return {};
  const namespaced = unsafeMetadata[MODEL_ICON_METADATA_NAMESPACE];
  if (!isRecord(namespaced)) return {};
  return sanitizeModelIconOverrides(namespaced[MODEL_ICON_METADATA_FIELD]);
}

export function withModelIconOverridesInUnsafeMetadata(
  unsafeMetadata: unknown,
  overrides: ModelIconOverrides
): Record<string, unknown> {
  const currentUnsafe = isRecord(unsafeMetadata) ? unsafeMetadata : {};
  const currentNamespace = isRecord(currentUnsafe[MODEL_ICON_METADATA_NAMESPACE])
    ? (currentUnsafe[MODEL_ICON_METADATA_NAMESPACE] as Record<string, unknown>)
    : {};

  return {
    ...currentUnsafe,
    [MODEL_ICON_METADATA_NAMESPACE]: {
      ...currentNamespace,
      [MODEL_ICON_METADATA_FIELD]: sanitizeModelIconOverrides(overrides),
    },
  };
}

export function ModelIcon({ iconKey, size = 16 }: { iconKey: string; size?: number }) {
  const definition = ICONS_BY_KEY.get(iconKey) ?? ICONS_BY_KEY.get('generic')!;
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => { setLoadFailed(false); }, [iconKey]);

  if (loadFailed || !definition.src) {
    return <Cpu size={size} className="text-muted" />;
  }

  return (
    <img
      src={definition.src}
      alt={definition.label}
      width={size}
      height={size}
      className="object-contain grayscale brightness-0"
      onError={() => setLoadFailed(true)}
    />
  );
}
