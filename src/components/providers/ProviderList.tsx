import { KeyRound, Loader2, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import type { ApiProvider } from '../../api/types';
import { Button, Skeleton } from '../ui';
import { getProviderIcon } from './providerConstants';

interface ProviderListProps {
  providers: ApiProvider[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (provider: ApiProvider) => void;
  onDelete: (id: string) => void;
}

export function ProviderList({ providers, loading, onAdd, onEdit, onDelete }: ProviderListProps) {
  if (loading) {
    return (
      <div className="divide-y divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton circle width={32} />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton width="40%" height={14} />
              <Skeleton width="60%" height={10} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-[13.5px] text-secondary">No AI services added yet.</p>
        <p className="mt-1 text-[12.5px] text-muted">Connect your own OpenAI, DeepSeek, Google, or other AI accounts.</p>
        <Button variant="secondary" size="sm" onClick={onAdd} className="mt-4 gap-1.5">
          <Plus size={13} /> Add service
        </Button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {providers.map((provider) => (
        <div key={provider.id} className="flex items-center gap-3 py-3 group">
          {/* Icon */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-light bg-surface-secondary text-primary">
            {getProviderIcon(provider.provider_type, 15)}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-medium text-primary">{provider.display_name}</span>
              <span className="text-[11px] text-muted">{provider.provider_type}</span>
              {provider.is_default_embedding && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent">embeddings</span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-[12px] text-muted">
              <span className="truncate max-w-[200px]">{provider.api_url}</span>
              <span className="flex items-center gap-1">
                <KeyRound size={11} /> {provider.api_key_masked}
              </span>
              {provider.embedding_model && (
                <span className="flex items-center gap-1">
                  <Zap size={11} /> {provider.embedding_model}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onEdit(provider)}
              aria-label={`Edit ${provider.display_name}`}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] text-muted hover:text-primary hover:bg-surface-hover focus-visible:text-primary focus-visible:bg-surface-hover bg-transparent border-none cursor-pointer"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(provider.id)}
              aria-label={`Delete ${provider.display_name}`}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] text-muted hover:text-danger hover:bg-danger/10 focus-visible:text-danger focus-visible:bg-danger/10 bg-transparent border-none cursor-pointer"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
