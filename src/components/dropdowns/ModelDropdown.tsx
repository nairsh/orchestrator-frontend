import { useState, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { getModels } from '../../api/client';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';
import type { ApiConfig } from '../../api/client';
import type { ModelsResponse, ModelInfo } from '../../api/types';
import { ModelIcon, type ModelIconOverrides, resolveModelIconKey } from '../../lib/modelIcons';

interface ModelDropdownProps {
  config: ApiConfig;
  selected: string;
  onSelect: (modelId: string) => void;
  variant?: 'orchestrator' | 'all';
  modelIconOverrides?: ModelIconOverrides;
}

export function ModelDropdown({
  config,
  selected,
  onSelect,
  variant = 'orchestrator',
  modelIconOverrides = {},
}: ModelDropdownProps) {
  const [data, setData] = useState<ModelsResponse | null>(null);

  useEffect(() => {
    getModels(config)
      .then((res) => setData(res))
      .catch(() => setData(null));
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
      return all.map((m) => ({ id: m.id, label: m.display_name }));
    }

    const allowedIds = data?.orchestrator_models ?? [];
    return allowedIds.map((id) => {
      const info = modelById.get(id);
      return { id, label: info?.display_name ?? id };
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

  const selectedOption = options.find((o) => o.id === selected) ?? options[0];
  const triggerLabel = selectedOption?.label ?? selected;

  return (
    <DropdownMenu
      width={224}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className={`flex items-center gap-1.5 font-sans text-md font-medium text-subtle rounded-md px-2.5 py-1.5 transition-colors duration-fast cursor-pointer ${
            open ? 'bg-surface-tertiary' : 'bg-transparent'
          }`}
        >
          <span className="font-sans text-md font-medium text-subtle">{triggerLabel}</span>
          <ChevronDown
            size={16}
            className="text-subtle transition-transform duration-150"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>
      )}
    >
      {options.map((opt) => (
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
          <div className="flex-1 min-w-0 flex flex-col">
            <span className="text-sm text-primary font-medium">{opt.label}</span>
            {opt.description && (
              <span className="text-xs text-muted">{opt.description}</span>
            )}
          </div>
        </DropdownMenuItem>
      ))}
    </DropdownMenu>
  );
}
