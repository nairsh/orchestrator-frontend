/**
 * Converts raw model IDs/display names into user-friendly labels.
 * Non-technical users should never see paths like "ali/MiniMax-M2.5".
 */

const FRIENDLY_NAMES: Record<string, string> = {
  'ali/MiniMax-M2.5': 'MiniMax M2.5',
  'ali/glm-5': 'Z.AI GLM-5',
  'ali/kimi-k2.5': 'Kimi K2.5',
  'ali/qwen3-max': 'Qwen 3 Max',
  'ali/qwen3.5-plus': 'Qwen 3.5 Plus',
  'gemini-3-flash-preview': 'Gemini 3 Flash',
  'gemini-3.1-flash-lite-preview': 'Gemini 3.1 Flash Lite',
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro',
};

export function humanizeModelName(raw: string): string {
  if (FRIENDLY_NAMES[raw]) return FRIENDLY_NAMES[raw];

  // Strip common prefixes (litellm/, openai/, etc.)
  let name = raw.replace(/^(litellm|openai|anthropic|google|deepseek|meta)\//i, '');
  name = name.replace(/^ali\//i, '');

  // Convert hyphens/underscores to spaces and title-case
  name = name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Preserve common model name patterns
  name = name
    .replace(/\bGpt\b/g, 'GPT')
    .replace(/\bGlm\b/g, 'GLM')
    .replace(/\bLlm\b/g, 'LLM')
    .replace(/\bAi\b/g, 'AI');

  return name;
}

export function humanizeProviderName(provider: string): string {
  const map: Record<string, string> = {
    litellm: 'Cloud AI',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    deepseek: 'DeepSeek',
    meta: 'Meta',
    'openai-compatible': 'Custom',
  };
  return map[provider.toLowerCase()] ?? provider;
}
