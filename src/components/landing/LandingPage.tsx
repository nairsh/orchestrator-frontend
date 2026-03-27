import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { FileText, X, ArrowUp, ArrowUpRight } from 'lucide-react';
import type { AppConfig } from '../../hooks/useConfig';
import type { ApiConfig, ContextFileUpload } from '../../api/client';
import { ModelDropdown } from '../dropdowns/ModelDropdown';
import { PlusDropdown } from '../dropdowns/PlusDropdown';
import { Sidebar } from '../layout/Sidebar';
import { BrandMark } from '../branding/Brand';
import { Textarea } from '../ui/Input';
import { fileToContextUpload, MAX_CONTEXT_FILE_BYTES, MAX_TOTAL_CONTEXT_BYTES } from '../../lib/files';
import { toastError, toastWarning } from '../../lib/toast';
import type { ModelIconOverrides } from '../../lib/modelIcons';

interface LandingPageProps {
  config: AppConfig;
  onSubmit: (objective: string, model: string, contextFiles: ContextFileUpload[]) => void;
  onOpenSettings: () => void;
  onSignOut?: () => Promise<void>;
  onOpenTasks: (nav?: 'tasks' | 'files' | 'connectors' | 'skills') => void;
  onOpenSearch?: () => void;
  isSignedIn?: boolean;
  userLabel?: string | null;
  userAvatarUrl?: string | null;
  sidebarCollapsed?: boolean;
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
  modelIconOverrides?: ModelIconOverrides;
}

function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LandingPage({
  config,
  onSubmit,
  onOpenSettings,
  onSignOut,
  onOpenTasks,
  onOpenSearch,
  isSignedIn,
  userLabel,
  userAvatarUrl,
  sidebarCollapsed,
  onSidebarCollapsedChange,
  modelIconOverrides,
}: LandingPageProps) {
  const [value, setValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [attachments, setAttachments] = useState<Array<ContextFileUpload & { id: string; size: number }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const apiConfig: ApiConfig = config;

  const SAMPLE_PROMPTS = useMemo(() => [
    'Analyze my codebase and summarize the architecture',
    'Write unit tests for the files I upload',
    'Research the latest breakthroughs in AI',
    'Create a detailed project plan from my requirements',
    'Generate a comprehensive code review report',
  ], []);

  const handleSampleClick = useCallback((prompt: string) => {
    setValue(prompt);
    textareaRef.current?.focus();
  }, []);

  // Listen for Cmd+K focus event
  useEffect(() => {
    const handler = () => textareaRef.current?.focus();
    window.addEventListener('relay:focus-input', handler);
    return () => window.removeEventListener('relay:focus-input', handler);
  }, []);

  const contextFiles = useMemo(() => attachments.map(({ id: _id, size: _size, ...rest }) => rest), [attachments]);

  const totalBytes = useMemo(() => attachments.reduce((sum, a) => sum + a.size, 0), [attachments]);

  const handleUploadFiles = async (files: File[]) => {
    let runningTotal = attachments.reduce((sum, a) => sum + a.size, 0);
    for (const file of files) {
      if (file.size > MAX_CONTEXT_FILE_BYTES) {
        toastError('File too large', `${file.name} exceeds ${Math.round(MAX_CONTEXT_FILE_BYTES / (1024 * 1024))}MB.`);
        continue;
      }
      if (runningTotal + file.size > MAX_TOTAL_CONTEXT_BYTES) {
        toastWarning('Total file size too large', 'Remove some files before adding more.');
        break;
      }

      try {
        const upload = await fileToContextUpload(file);
        runningTotal += file.size;
        setAttachments((prev) => [
          ...prev,
          {
            ...upload,
            id: crypto.randomUUID(),
          },
        ]);
      } catch (err) {
        toastError('Upload failed', err instanceof Error ? err.message : String(err));
      }
    }
  };

  const handleSubmit = () => {
    const text = value.trim();
    if (!text) return;
    if (!selectedModel.trim()) return;
    onSubmit(text, selectedModel, contextFiles);
    setValue('');
    setAttachments([]);
  };

  const hasText = value.trim().length > 0;
  const canSend = hasText && !!selectedModel.trim();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-full app-ui bg-surface-warm">
      <Sidebar
        activeNav="computer"
        config={config}
        onOpenSettings={onOpenSettings}
        onSignOut={onSignOut}
        isSignedIn={isSignedIn}
        userLabel={userLabel}
        userAvatarUrl={userAvatarUrl}
        onNavChange={(id) => {
          if (id === 'search') {
            onOpenSearch?.();
          } else if (id === 'computer' || id === 'new') {
            // Computer and New task stay on landing
          } else if (id === 'tasks') onOpenTasks('tasks');
          else if (id === 'connectors') onOpenTasks('connectors');
          else if (id === 'files') onOpenTasks('files');
          else if (id === 'skills') onOpenTasks('skills');
        }}
        collapsed={sidebarCollapsed}
        onCollapsedChange={onSidebarCollapsedChange}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <BrandMark size={22} className="text-primary mb-4" />

        {/* Heading */}
        <h1 className="font-display text-[40px] font-medium text-primary tracking-tight mb-10 text-center" style={{ lineHeight: 1.15 }}>
          Computer works for you.
        </h1>

        {/* Search box */}
        <div className="w-full max-w-2xl px-4">
          <div className="rounded-2xl border border-border-light shadow-sm font-sans bg-surface">
            <div className="grid grid-cols-[1fr_auto] px-3.5 pt-3.5 pb-3">
              {/* Attachments - span both columns */}
              {attachments.length > 0 && (
                <div className="col-start-1 col-end-3 flex flex-wrap gap-2.5 pb-2.5">
                  {attachments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 bg-surface-tertiary border border-border-light font-sans max-w-[320px]"
                    >
                      <div className="flex items-center justify-center overflow-hidden flex-shrink-0 w-9 h-9 rounded-lg bg-surface border border-border-light">
                        {a.media_type.startsWith('image/') ? (
                          <img
                            src={`data:${a.media_type};base64,${a.content_base64}`}
                            alt={a.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText size={18} className="text-muted" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-md leading-5 text-secondary truncate">{a.filename}</div>
                        <div className="text-sm leading-[18px] text-muted">{formatAttachmentSize(a.size)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                        className="h-6 w-6 rounded-full flex items-center justify-center text-muted hover:text-primary transition-colors duration-200 cursor-pointer"
                        aria-label={`Remove ${a.filename}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Textarea - spans both columns */}
              <div className="col-start-1 col-end-3 pb-2 ml-1 mt-0.5 overflow-hidden">
                <Textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What should we work on next?"
                  minHeight={48}
                  maxHeight={200}
                  autoFocus
                  className="text-base"
                />
              </div>

              {/* Left: Plus + Model selector */}
              <div className="col-start-1 row-start-3 flex items-center gap-1.5 min-w-0">
                <PlusDropdown
                  ghost
                  openUpward
                  onUploadFiles={(files) => void handleUploadFiles(files)}
                  onOpenConnectors={() => onOpenTasks('connectors')}
                />

                <ModelDropdown
                  config={apiConfig}
                  selected={selectedModel}
                  onSelect={setSelectedModel}
                  modelIconOverrides={modelIconOverrides}
                  align="left"
                  direction="up"
                  size="small"
                />
              </div>

              {/* Right: Send */}
              <div className="col-start-2 row-start-3 flex items-center justify-self-end gap-1.5">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSend}
                  className={`h-8 rounded-full flex items-center justify-center transition-all duration-200 aspect-[9/8] ${
                    canSend ? 'opacity-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
                  }`}
                  style={{ backgroundColor: 'var(--relay-primary, #1a1a1a)', color: 'var(--relay-surface, white)' }}
                  aria-label="Send"
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sample prompts */}
        {value === '' && attachments.length === 0 && (
          <div className="w-full max-w-2xl px-4 mt-5 mx-auto">
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSampleClick(prompt)}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-border-light bg-surface px-3.5 py-2 text-sm text-muted hover:text-primary hover:border-border hover:shadow-xs transition-all duration-200 cursor-pointer font-sans"
                >
                  <span>{prompt}</span>
                  <ArrowUpRight size={13} className="text-placeholder group-hover:text-muted transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
