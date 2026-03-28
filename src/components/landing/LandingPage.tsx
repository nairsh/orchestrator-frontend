import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { FileText, X, ArrowUp, ArrowUpRight, Loader2 } from 'lucide-react';
import type { AppConfig } from '../../hooks/useConfig';
import type { ApiConfig, ContextFileUpload } from '../../api/client';
import { useFileAttachments } from '../../hooks/useFileAttachments';
import { ModelDropdown } from '../dropdowns/ModelDropdown';
import { PlusDropdown } from '../dropdowns/PlusDropdown';
import { Sidebar } from '../layout/Sidebar';
import { BrandMark } from '../branding/Brand';
import { Textarea } from '../ui/Input';
import type { ModelIconOverrides } from '../../lib/modelIcons';

interface LandingPageProps {
  config: AppConfig;
  onSubmit: (objective: string, model: string, contextFiles: ContextFileUpload[]) => void | Promise<void>;
  onOpenSettings: () => void;
  onSignOut?: () => Promise<void>;
  onOpenTasks: (nav?: 'tasks' | 'files' | 'connectors' | 'skills') => void;
  onOpenSearch?: () => void;
  isSignedIn?: boolean;
  userLabel?: string | null;
  userAvatarUrl?: string | null;
  sidebarCollapsed?: boolean;
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
  isMobile?: boolean;
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
  isMobile,
  modelIconOverrides,
}: LandingPageProps) {
  const [value, setValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const { attachments, contextFiles, handleUploadFiles, removeAttachment, clearAttachments } = useFileAttachments();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const submittingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const apiConfig: ApiConfig = config;

  const SAMPLE_PROMPTS = useMemo(() => {
    const pool = [
      // Research
      '🔍 Research the latest news about electric vehicles',
      '🔍 What are the top AI startups to watch this year?',
      '🔍 Compare pricing plans for the top 3 project management tools',
      // Analysis
      '📊 Summarize this document and pull out key takeaways',
      '📊 Analyze the pros and cons of remote work policies',
      '📊 Compare the top 5 laptops under $1,000',
      // Planning
      '📝 Help me plan a weekend trip to the mountains',
      '📝 Create a project plan from my requirements',
      '📝 Draft a meal plan for a week of healthy eating',
      // Code
      '💻 Write a Python script to analyze CSV data',
      '💻 Build a REST API with CRUD endpoints',
      '💻 Create a landing page with HTML and Tailwind CSS',
      // Creative
      '✨ Write a professional email to reschedule a meeting',
      '✨ Generate 10 creative names for a tech startup',
      '✨ Draft a blog post outline about sustainable energy',
    ];
    // Pick 5 random prompts, one from each category when possible
    const categories = ['🔍', '📊', '📝', '💻', '✨'];
    const picked: string[] = [];
    for (const cat of categories) {
      const options = pool.filter(p => p.startsWith(cat) && !picked.includes(p));
      if (options.length > 0) {
        picked.push(options[Math.floor(Math.random() * options.length)]);
      }
    }
    return picked;
  }, []);

  const handleSampleClick = useCallback((prompt: string) => {
    // Strip the emoji prefix (e.g. "🔍 ") before filling the input
    const clean = prompt.replace(/^[^\w]+\s/, '');
    setValue(clean);
    textareaRef.current?.focus();
  }, []);

  // Listen for Cmd+K focus event
  useEffect(() => {
    const handler = () => textareaRef.current?.focus();
    window.addEventListener('relay:focus-input', handler);
    return () => window.removeEventListener('relay:focus-input', handler);
  }, []);

  const handleSubmit = async () => {
    const text = value.trim();
    if (!text) return;
    if (!selectedModel.trim()) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit(text, selectedModel, contextFiles);
      setValue('');
      clearAttachments();
    } catch {
      // onSubmit handles its own error reporting; reset state silently
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const hasText = value.trim().length > 0;
  const canSend = hasText && !!selectedModel.trim() && !isSubmitting;

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
        isMobile={isMobile}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <BrandMark size={22} className="text-primary mb-4 fade-in-up-soft" />

        {/* Heading */}
        <h1 className="font-display text-[40px] font-medium text-primary tracking-tight mb-10 text-center fade-in-up-soft" style={{ lineHeight: 1.15, animationDelay: '40ms' }}>
          What can I help you with?
        </h1>

        {/* Search box */}
        <div className="w-full max-w-2xl px-4 fade-in-up-soft" style={{ animationDelay: '80ms' }}>
          <div className="relative z-10 rounded-2xl border border-border-light shadow-sm font-sans bg-surface focus-within:border-border focus-within:shadow-md transition-all duration-200">
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
                        {a.media_type.startsWith('image/') && !imgErrors.has(a.id) ? (
                          <img
                            src={`data:${a.media_type};base64,${a.content_base64}`}
                            alt={a.filename}
                            className="w-full h-full object-cover"
                            onError={() => setImgErrors((prev) => new Set(prev).add(a.id))}
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
                        onClick={() => removeAttachment(a.id)}
                        className="h-6 w-6 rounded-full flex items-center justify-center text-muted hover:text-primary transition-colors duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
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
                  aria-label="Task description"
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
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sample prompts */}
        {value === '' && attachments.length === 0 && (
          <div className="w-full max-w-2xl px-4 mt-5 mx-auto relative z-0">
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSampleClick(prompt)}
                  aria-label={`Use prompt: ${prompt}`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-border-light bg-surface px-3.5 py-2 text-sm text-muted hover:text-primary hover:border-border hover:shadow-xs hover:-translate-y-px transition-all duration-200 cursor-pointer font-sans opacity-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  style={{ animation: `fadeInUpSoft 250ms ease-out ${80 + i * 50}ms both` }}
                >
                  <span>{prompt}</span>
                  <ArrowUpRight size={13} className="text-placeholder group-hover:text-muted transition-colors duration-200 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
