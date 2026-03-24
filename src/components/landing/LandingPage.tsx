import { useMemo, useState, useRef, useCallback } from 'react';
import { ArrowUp, FileText, X, Sparkles } from 'lucide-react';
import type { AppConfig } from '../../hooks/useConfig';
import type { ApiConfig, ContextFileUpload } from '../../api/client';
import { ModelDropdown } from '../dropdowns/ModelDropdown';
import { PlusDropdown } from '../dropdowns/PlusDropdown';
import { Sidebar } from '../layout/Sidebar';
import { IconButton } from '../ui/IconButton';
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
    'Research the latest trends in AI agents',
    'Create a detailed project plan from my requirements',
  ], []);

  const handleSampleClick = useCallback((prompt: string) => {
    setValue(prompt);
    textareaRef.current?.focus();
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
        toastWarning('Attachment limit reached', 'Total attachments exceed the request limit.');
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
    if (!selectedModel.trim()) {
      toastWarning('Model not ready', 'Please wait for models to load before sending.');
      return;
    }
    onSubmit(text, selectedModel, contextFiles);
    setValue('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-full app-ui bg-surface-warm">
      <Sidebar
        config={config}
        onOpenSettings={onOpenSettings}
        onSignOut={onSignOut}
        isSignedIn={isSignedIn}
        userLabel={userLabel}
        userAvatarUrl={userAvatarUrl}
        onNavChange={(id) => {
          if (id === 'tasks') onOpenTasks('tasks');
          if (id === 'connectors') onOpenTasks('connectors');
          if (id === 'files') onOpenTasks('files');
          if (id === 'skills') onOpenTasks('skills');
        }}
        collapsed={sidebarCollapsed}
        onCollapsedChange={onSidebarCollapsedChange}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center pt-[280px] pl-10">
        {/* Logo */}
        <div className="flex items-baseline gap-0.5 mb-10">
          <span className="font-sans text-[36px] font-medium text-primary tracking-tight">relay</span>
          <span className="font-sans text-[36px] font-light text-secondary tracking-tight">pro</span>
        </div>

        {/* Search box */}
        <div className="w-[640px] max-w-[calc(100vw-120px)]">
          <div className="flex flex-col bg-surface rounded-[20px] border border-border shadow p-5 pb-3.5 gap-3.5">
            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2.5">
                {attachments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 bg-surface-tertiary border border-border-light font-sans max-w-[320px]"
                  >
                    <div className="flex items-center justify-center overflow-hidden flex-shrink-0 w-9 h-9 rounded-sm bg-surface border border-border-light">
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
                    <IconButton
                      size="sm"
                      label={`Remove ${a.filename}`}
                      onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                    >
                      <X size={16} />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}

            {/* Input area */}
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              maxHeight={200}
              autoFocus
            />

            {/* Tools row */}
            <div className="flex items-center pt-1">
              {/* Left: Plus button */}
              <PlusDropdown
                openUpward
                onUploadFiles={(files) => void handleUploadFiles(files)}
                onOpenConnectors={() => onOpenTasks('connectors')}
              />

              {/* Spacer */}
              <div className="flex-1" />

              {/* Right section: Model + Send */}
              <div className="flex items-center gap-4">
                <ModelDropdown
                  config={apiConfig}
                  selected={selectedModel}
                  onSelect={setSelectedModel}
                  modelIconOverrides={modelIconOverrides}
                />

                {/* Send button */}
                <IconButton size="lg" filled onClick={handleSubmit} label="Send">
                  <ArrowUp size={16} />
                </IconButton>
              </div>
            </div>
          </div>
        </div>

        {/* Sample prompts */}
        {value === '' && attachments.length === 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-4 w-[640px] max-w-[calc(100vw-120px)]">
            {SAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSampleClick(prompt)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-light bg-surface px-3 py-1.5 font-sans text-sm text-secondary hover:bg-surface-tertiary hover:border-border transition-colors cursor-pointer"
              >
                <Sparkles size={13} className="text-placeholder flex-shrink-0" />
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
