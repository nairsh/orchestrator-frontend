import { DeepSeek, Gemini, OpenAI, OpenRouter } from '@lobehub/icons';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { Server, Sparkles } from 'lucide-react';
import type { ProviderPreset, ProviderType } from '../../api/types';

export const DEFAULT_PRESETS: Record<string, ProviderPreset> = {
  openai:     { displayName: 'OpenAI',          apiUrl: 'https://api.openai.com/v1',                         urlEditable: false },
  deepseek:   { displayName: 'DeepSeek',         apiUrl: 'https://api.deepseek.com/v1',                      urlEditable: false },
  google:     { displayName: 'Google Gemini',    apiUrl: 'https://generativelanguage.googleapis.com/v1beta', urlEditable: false },
  openrouter: { displayName: 'OpenRouter',       apiUrl: 'https://openrouter.ai/api/v1',                     urlEditable: false },
  litellm:    { displayName: 'LiteLLM',          apiUrl: '',                                                  urlEditable: true  },
  custom:     { displayName: 'Custom Provider',  apiUrl: '',                                                  urlEditable: true  },
};

export const PROVIDER_OPTIONS: Array<{ value: ProviderType; label: string }> = [
  { value: 'openai',     label: 'OpenAI' },
  { value: 'deepseek',   label: 'DeepSeek' },
  { value: 'google',     label: 'Google Gemini' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'litellm',    label: 'LiteLLM' },
  { value: 'custom',     label: 'Custom' },
];

export interface ProviderDialogState {
  editingId: string | null;
  providerType: ProviderType;
  displayName: string;
  apiUrl: string;
  apiKey: string;
  embeddingModel: string;
  isDefaultEmbedding: boolean;
}

export function getProviderIcon(type: ProviderType, size = 16): ReactNode {
  switch (type) {
    case 'openai':     return createElement(OpenAI, { size });
    case 'deepseek':   return createElement(DeepSeek, { size });
    case 'google':     return createElement(Gemini, { size });
    case 'openrouter': return createElement(OpenRouter, { size });
    case 'litellm':    return createElement(Server, { size });
    default:           return createElement(Sparkles, { size });
  }
}

export function createInitialDialogState(
  presets: Record<string, ProviderPreset>,
  provider?: import('../../api/types').ApiProvider
): ProviderDialogState {
  if (provider) {
    return {
      editingId: provider.id,
      providerType: provider.provider_type,
      displayName: provider.display_name,
      apiUrl: provider.api_url,
      apiKey: '',
      embeddingModel: provider.embedding_model ?? '',
      isDefaultEmbedding: provider.is_default_embedding,
    };
  }
  const preset = presets.openai ?? DEFAULT_PRESETS.openai;
  return {
    editingId: null,
    providerType: 'openai',
    displayName: preset.displayName,
    apiUrl: preset.apiUrl,
    apiKey: '',
    embeddingModel: '',
    isDefaultEmbedding: false,
  };
}
