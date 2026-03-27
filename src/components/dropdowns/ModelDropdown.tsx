import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Zap, Brain, CircleDollarSign, Loader2 } from 'lucide-react';
import { getModels } from '../../api/client';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';
import type { ApiConfig } from '../../api/client';
import type { ModelsResponse, ModelInfo } from '../../api/types';
import { ModelIcon, type ModelIconOverrides, resolveModelIconKey } from '../../lib/modelIcons';
import { humanizeModelName, humanizeProviderName } from '../../lib/modelNames';

const inferProvider = (modelId: string): string => {
  const id = modelId.toLowerCase();
  if (id.includes('gpt') || id.includes('openai') || id.includes('o1') || id.includes('o3') || id.includes('o4')) return 'OpenAI';
  if (id.includes('claude') || id.includes('anthropic')) return 'Anthropic';
  if (id.includes('gemini') || id.includes('google')) return 'Google';
  if (id.includes('llama') || id.includes('meta')) return 'Meta';
  if (id.includes('mistral')) return 'Mistral';
  if (id.includes('deepseek')) return 'DeepSeek';
  if (id.includes('qwen')) return 'Alibaba';
  return 'Other';
};

const inferCapabilities = (modelId: string): string[] => {
  const id = modelId.toLowerCase();
  const caps: string[] = [];
  if (id.includes('mini') || id.includes('flash') || id.includes('haiku')) caps.push('Fast');
  if (id.includes('pro') || id.includes('opus') || id.includes('4o') || id.includes('sonnet')) caps.push('Smart');
  if (id.includes('mini') || id.includes('flash') || id.includes('haiku') || id.includes('nano')) caps.push('Cheap');
  if (caps.length === 0) caps.push('Smart');
  return caps;
};

interface ModelDropdownProps {
  config: ApiConfig;
  selected: string;
  onSelect: (modelId: string) => void;
  variant?: 'orchestrator' | 'all';
  modelIconOverrides?: ModelIconOverrides;
  size?: 'default' | 'large' | 'small';
  align?: 'left' | 'right';
  direction?: 'up' | 'down';
}

export function ModelDropdown({
  config,
  selected,
  onSelect,
  variant = 'orchestrator',
  modelIconOverrides = {},
  size = 'default',
  align = 'right',
  direction = 'down',
}: ModelDropdownProps) {
  const [data, setData] = useState<ModelsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getModels(config)
      .then((res) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [config]);

  const modelById = useMemo(() => {
    const m = new Map<string, ModelInfo>();
    for (const model of data?.models ?? []) m.set(model.id, model);
    return m;
  }, [data]);

  const defaultModelId = data?.default_orchestrator_model;

  const options: Array<{ id: string; label: string; description?: string }> = (() => {
    if (variant === 'all') {
      const all = [...(data?.models ?? [])].sort((a, b) => a.display_name.localeCompare(b.display_name));
      return all.map((m) => ({ id: m.id, label: humanizeModelName(m.display_name) }));
    }

    const allowedIds = data?.orchestrator_models ?? [];
    return allowedIds.map((id) => {
      const info = modelById.get(id);
      return { id, label: humanizeModelName(info?.display_name ?? id) };
    });
  })();

  useEffect(() => {
    if (!options.length) return;
    if (options.some((option) => option.id === selected)) return;

    const preferred =
      (defaultModelId && options.some((option) => option.id === defaultModelId)
        ? defaultModelId
        : options[0]?.id) ??
      '';

    if (preferred) {
      onSelect(preferred);
    }
  }, [defaultModelId, onSelect, options, selected]);

  const groupedOptions = useMemo(() => {
    const groups = new Map<string, typeof options>();
    for (const opt of options) {
      const rawProvider = modelById.get(opt.id)?.provider ?? inferProvider(opt.id);
      const provider = humanizeProviderName(rawProvider);
      if (!groups.has(provider)) groups.set(provider, []);
      groups.get(provider)!.push(opt);
    }
    return groups;
  }, [options, modelById]);

  const selectedOption = options.find((o) => o.id === selected) ?? options[0];
  const triggerLabel = selectedOption?.label ?? selected;
  const selectedIconKey = resolveModelIconKey(
    selectedOption?.id ?? selected,
    modelById.get(selectedOption?.id ?? selected)?.provider,
    modelIconOverrides
  );
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  return (
    <DropdownMenu
      width={320}
      align={align}
      direction={direction}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label="Select model"
          className={`flex items-center font-sans font-medium text-primary rounded-full transition-colors duration-200 cursor-pointer ${
            isLarge ? 'gap-2.5 text-lg px-4 py-2.5' : isSmall ? 'h-8 gap-1.5 text-sm px-3' : 'h-8 gap-2 text-sm px-3'
          } ${open ? 'bg-surface-secondary' : 'bg-surface-tertiary hover:bg-surface-secondary'}`}
        >
          {loading ? <Loader2 size={isLarge ? 18 : 14} className="text-subtle animate-spin" /> : <ModelIcon iconKey={selectedIconKey} size={isLarge ? 18 : 14} />}
          <span className={`font-sans font-medium text-primary truncate ${isLarge ? 'text-lg max-w-[300px]' : isSmall ? 'text-sm max-w-[140px]' : 'text-sm max-w-[200px]'}`}>{loading ? 'Loading…' : triggerLabel}</span>
          <ChevronDown
            size={isLarge ? 18 : 14}
            className="text-subtle transition-transform duration-200"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>
      )}
    >
      {Array.from(groupedOptions.entries()).map(([provider, providerOpts]) => (
        <div key={provider}>
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted font-semibold">
            {provider}
          </div>
          {providerOpts.map((opt) => {
            return (
              <DropdownMenuItem
                key={opt.id}
                active={opt.id === selected}
                onClick={() => onSelect(opt.id)}
              >
                <span className="flex-shrink-0">
                  <ModelIcon
                    iconKey={resolveModelIconKey(
                      opt.id,
                      modelById.get(opt.id)?.provider,
                      modelIconOverrides
                    )}
                    size={16}
                  />
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm text-primary font-medium truncate">{opt.label}</span>
                  <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                    {inferCapabilities(opt.id).map((cap) => (
                      <span key={cap} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-warm text-muted border border-border-light">
                        {cap === 'Fast' && <Zap size={9} />}
                        {cap === 'Smart' && <Brain size={9} />}
                        {cap === 'Cheap' && <CircleDollarSign size={9} />}
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>
      ))}
    </DropdownMenu>
  );
}
