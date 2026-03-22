import { useEffect, useMemo, useState } from 'react';
import { Bot, Cpu, Eye, Sparkles, Star, Zap } from 'lucide-react';

export const MODEL_ICON_LOCAL_STORAGE_KEY = 'relay_model_icon_overrides';
export const MODEL_ICON_METADATA_NAMESPACE = 'relayPro';
export const MODEL_ICON_METADATA_FIELD = 'modelIconOverrides';

type FallbackGlyph = 'cpu' | 'bot' | 'zap' | 'star' | 'sparkles' | 'eye';

export interface ModelIconDefinition {
  key: string;
  label: string;
  src: string;
  fallback: FallbackGlyph;
}

export type ModelIconOverrides = Record<string, string>;

export const MODEL_ICON_DEFINITIONS: ModelIconDefinition[] = [
  { key: 'generic', label: 'Generic model', src: '/model-icons/generic.svg', fallback: 'cpu' },
  { key: 'openai', label: 'OpenAI / GPT', src: '/model-icons/gpt-logo.webp', fallback: 'zap' },
  { key: 'anthropic', label: 'Claude', src: '/model-icons/claude-logo.png', fallback: 'sparkles' },
  { key: 'google', label: 'Gemini', src: '/model-icons/gemini-logo.png', fallback: 'star' },
  { key: 'perplexity', label: 'Perplexity / Sonar', src: '/model-icons/perplexity.svg', fallback: 'bot' },
  { key: 'groq', label: 'Groq', src: '/model-icons/groq.png', fallback: 'cpu' },
  { key: 'mistral', label: 'Mistral', src: '/model-icons/mistral.png', fallback: 'cpu' },
  { key: 'zai', label: 'Z.AI / GLM', src: '/model-icons/zai.png', fallback: 'cpu' },
  { key: 'nvidia', label: 'NVIDIA / Nemotron', src: '/model-icons/nvidia.svg', fallback: 'eye' },
  { key: 'deepseek', label: 'DeepSeek', src: '/model-icons/deepseek.svg', fallback: 'cpu' },
  { key: 'qwen', label: 'Qwen', src: '/model-icons/qwen.jpeg', fallback: 'cpu' },
  { key: 'minimax', label: 'MiniMax', src: '/model-icons/xiaomi.png', fallback: 'cpu' },
  { key: 'kimi', label: 'Kimi', src: '/model-icons/kimi.png', fallback: 'cpu' },
];

const ICONS_BY_KEY = new Map<string, ModelIconDefinition>(MODEL_ICON_DEFINITIONS.map((entry) => [entry.key, entry]));

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
  if (combined.includes('kimi')) {
    return 'kimi';
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

function FallbackIcon({ glyph, size }: { glyph: FallbackGlyph; size: number }) {
  const className = 'text-muted';
  if (glyph === 'bot') return <Bot size={size} className={className} />;
  if (glyph === 'zap') return <Zap size={size} className={className} />;
  if (glyph === 'star') return <Star size={size} className={className} />;
  if (glyph === 'sparkles') return <Sparkles size={size} className={className} />;
  if (glyph === 'eye') return <Eye size={size} className={className} />;
  return <Cpu size={size} className={className} />;
}

export function ModelIcon({ iconKey, size = 16 }: { iconKey: string; size?: number }) {
  const definition = useMemo(() => getModelIconDefinition(iconKey), [iconKey]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [iconKey]);

  if (loadFailed || !definition.src) {
    return <FallbackIcon glyph={definition.fallback} size={size} />;
  }

  return (
    <img
      src={definition.src}
      alt={definition.label}
      width={size}
      height={size}
      className="rounded-sm object-contain"
      onError={() => setLoadFailed(true)}
    />
  );
}
