import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Cpu, Zap, Bot, Star, Sparkles, Eye } from 'lucide-react';
import { getModels } from '../../api/client';
import type { ApiConfig } from '../../api/client';
import type { ModelsResponse, ModelInfo } from '../../api/types';

function getModelIcon(id: string): React.ReactNode {
  const lower = id.toLowerCase();
  if (lower === 'auto') return <Cpu size={16} color="#666666" />;
  if (lower.includes('sonar') || lower.includes('perplexity')) return <Bot size={16} color="#666666" />;
  if (lower.includes('gpt') || lower.includes('openai')) return <Zap size={16} color="#666666" />;
  if (lower.includes('gemini') || lower.includes('google')) return <Star size={16} color="#666666" />;
  if (lower.includes('claude') || lower.includes('anthropic')) return <Sparkles size={16} color="#666666" />;
  if (lower.includes('nemotron') || lower.includes('eye')) return <Eye size={16} color="#666666" />;
  return <Cpu size={16} color="#666666" />;
}

interface ModelDropdownProps {
  config: ApiConfig;
  selected: string;
  onSelect: (modelId: string) => void;
  variant?: 'orchestrator' | 'all';
}

export function ModelDropdown({ config, selected, onSelect, variant = 'orchestrator' }: ModelDropdownProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ModelsResponse | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getModels(config)
      .then((res) => setData(res))
      .catch(() => setData(null));
  }, [config]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const modelById = useMemo(() => {
    const m = new Map<string, ModelInfo>();
    for (const model of data?.models ?? []) m.set(model.id, model);
    return m;
  }, [data]);

  const defaultModelId = data?.default_orchestrator_model;
  const defaultModel = defaultModelId ? modelById.get(defaultModelId) : undefined;

  const options: Array<{ id: string; label: string; description?: string }> = (() => {
    if (variant === 'all') {
      const all = [...(data?.models ?? [])].sort((a, b) => a.display_name.localeCompare(b.display_name));
      return all.map((m) => ({ id: m.id, label: m.display_name }));
    }

    const allowedIds = data?.orchestrator_models ?? [];
    return [
      {
        id: 'auto',
        label: 'Auto',
        description: defaultModel
          ? `Default: ${defaultModel.display_name}`
          : 'Default orchestrator model',
      },
      ...allowedIds.map((id) => {
        const info = modelById.get(id);
        return {
          id,
          label: info?.display_name ?? id,
        };
      }),
    ];
  })();

  const selectedOption = options.find((o) => o.id === selected) ?? options[0];
  const triggerLabel = selectedOption?.label ?? selected;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center"
        style={{ 
          gap: 6, 
          fontFamily: 'Inter', 
          fontSize: 15, 
          fontWeight: 500, 
          color: '#777777', 
          cursor: 'pointer', 
          background: open ? '#F5F5F5' : 'transparent',
          border: 'none', 
          padding: '6px 10px',
          borderRadius: 8,
          transition: 'background 0.1s ease',
        }}
      >
        <span style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 500, color: '#777777' }}>
          {triggerLabel}
        </span>
        <ChevronDown size={16} color="#777777" style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {/* Menu — always mounted, CSS animated */}
      <div
        className="absolute top-full mt-2 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1"
        style={{
          width: 224,
          maxHeight: 360,
          overflowY: 'auto',
          transition: 'opacity 0.1s ease, transform 0.1s ease',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0)' : 'translateY(-4px)',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => { onSelect(opt.id); setOpen(false); }}
            className="w-full flex items-center text-left hover:bg-gray-50 transition-colors duration-100"
            style={{
              gap: 12,
              padding: '10px 14px',
              background: opt.id === selected ? '#F5F5F5' : 'transparent',
            }}
          >
            <span className="flex-shrink-0">
              {getModelIcon(opt.id === 'auto' ? (defaultModelId ?? 'auto') : opt.id)}
            </span>
            <div className="flex-1 min-w-0 flex flex-col">
              <span className="text-sm text-gray-900 font-medium" style={{ fontFamily: 'Inter' }}>
                {opt.label}
              </span>
              {opt.description && (
                <span className="text-xs text-gray-500" style={{ fontFamily: 'Inter' }}>{opt.description}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
