import type { RefObject } from 'react';
import { ArrowUp, Loader2, X, Paperclip } from 'lucide-react';
import type { ApiConfig, ContextFileUpload } from '../../api/client';
import { PlusDropdown } from '../dropdowns/PlusDropdown';
import { ModelDropdown } from '../dropdowns/ModelDropdown';
import { Textarea } from '../ui';
import type { ModelIconOverrides } from '../../lib/modelIcons';

interface TaskStartInputProps {
  value: string;
  onChange: (value: string) => void;
  onStart: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  starting: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  config: ApiConfig;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onOpenConnectors?: () => void;
  onUploadFiles?: (files: File[]) => void;
  attachments?: Array<ContextFileUpload & { id: string; size: number }>;
  onRemoveAttachment?: (id: string) => void;
  modelIconOverrides?: ModelIconOverrides;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function TaskStartInput({
  value,
  onChange,
  onStart,
  onKeyDown,
  starting,
  inputRef,
  config,
  selectedModel,
  onSelectModel,
  onOpenConnectors,
  onUploadFiles,
  attachments = [],
  onRemoveAttachment,
  modelIconOverrides,
}: TaskStartInputProps) {
  return (
    <div className="flex flex-col flex-shrink-0 rounded-xl bg-surface border border-border-light px-3.5 py-3 min-h-[92px] gap-2.5 shadow-xs focus-within:border-border focus-within:shadow-sm transition-all duration-200">
      <Textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start a task"
        onKeyDown={onKeyDown}
        maxHeight={100}
        className="text-md"
      />
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((a) => (
            <div key={a.id} className="inline-flex items-center gap-1.5 rounded-lg border border-border-light bg-surface-hover px-2 py-1 text-xs text-secondary">
              <Paperclip size={11} className="text-muted flex-shrink-0" />
              <span className="truncate max-w-[120px]">{a.filename}</span>
              <span className="text-muted">{formatFileSize(a.size)}</span>
              <button
                type="button"
                onClick={() => onRemoveAttachment?.(a.id)}
                className="text-muted hover:text-primary transition-colors ml-0.5"
                aria-label={`Remove ${a.filename}`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center mt-auto gap-2 min-w-0">
        <PlusDropdown
          outlined
          onUploadFiles={onUploadFiles}
          onOpenConnectors={() => onOpenConnectors?.()}
        />
        <div className="flex-1 min-w-0" />
        <div className="flex items-center gap-2 min-w-0">
          <ModelDropdown
            config={config}
            selected={selectedModel}
            onSelect={onSelectModel}
            modelIconOverrides={modelIconOverrides}
            size="small"
          />
          <button
            type="button"
            onClick={onStart}
            disabled={!value.trim() || starting}
            aria-label="Start task"
            className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-opacity duration-200 bg-primary text-surface ${value.trim() && !starting ? 'opacity-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'}`}
          >
            {starting ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
