import { useMemo, useState, useRef } from 'react';
import {
  ArrowUp,
} from 'lucide-react';
import type { AppConfig } from '../../hooks/useConfig';
import type { ApiConfig, ContextFileUpload } from '../../api/client';
import { ModelDropdown } from '../dropdowns/ModelDropdown';
import { PlusDropdown } from '../dropdowns/PlusDropdown';
import { Sidebar } from '../layout/Sidebar';
import { fileToContextUpload, MAX_CONTEXT_FILE_BYTES, MAX_TOTAL_CONTEXT_BYTES } from '../../lib/files';
import { toastError, toastWarning } from '../../lib/toast';

interface LandingPageProps {
  config: AppConfig;
  onSubmit: (objective: string, model: string, contextFiles: ContextFileUpload[]) => void;
  onOpenSettings: () => void;
  onOpenTasks: (nav?: 'tasks' | 'files' | 'connectors' | 'skills') => void;
  sidebarCollapsed?: boolean;
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
}

export function LandingPage({ config, onSubmit, onOpenSettings, onOpenTasks, sidebarCollapsed, onSidebarCollapsedChange }: LandingPageProps) {
  const [value, setValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('auto');
  const [attachments, setAttachments] = useState<Array<ContextFileUpload & { id: string; size: number }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const apiConfig: ApiConfig = config;

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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  // Initial landing view: centered input
  return (
    <div className="flex h-full app-ui" style={{ background: '#faf8f4' }}>
      <Sidebar
        config={config}
        onOpenSettings={onOpenSettings}
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
      <div className="flex-1 flex flex-col items-center" style={{ paddingTop: 280, paddingLeft: 40 }}>
        {/* Logo */}
        <div className="flex items-baseline gap-0.5 mb-10">
          <span style={{ fontFamily: 'Inter', fontSize: 36, fontWeight: 500, color: '#222222', letterSpacing: -1 }}>relay</span>
          <span style={{ fontFamily: 'Inter', fontSize: 36, fontWeight: 300, color: '#555555', letterSpacing: -1 }}>pro</span>
        </div>

        {/* Search box */}
        <div style={{ width: 640, maxWidth: 'calc(100vw - 120px)' }}>
          <div
            className="flex flex-col"
            style={{
              background: '#FDFBFA',
              borderRadius: 20,
              border: '1px solid #D0D0D0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              padding: '20px 18px 14px 18px',
              gap: 14,
            }}
          >
            {/* Input area */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              autoFocus
              style={{
                fontFamily: 'Inter',
                fontSize: 15,
                color: '#111111',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                minHeight: 36,
                maxHeight: 200,
                lineHeight: '1.5',
              }}
              className="placeholder-[#A0A0A0] w-full"
            />

            {attachments.length > 0 && (
              <div className="flex flex-wrap" style={{ gap: 8 }}>
                {attachments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center"
                    style={{
                      gap: 8,
                      borderRadius: 999,
                      padding: '6px 10px',
                      background: '#F5F5F5',
                      border: '1px solid #E6E6E6',
                      fontFamily: 'Inter',
                      fontSize: 13,
                      color: '#444444',
                    }}
                  >
                    <span style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.filename}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        padding: 0,
                        color: '#666666',
                      }}
                      aria-label={`Remove ${a.filename}`}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tools row */}
            <div className="flex items-center" style={{ paddingTop: 4 }}>
              {/* Left: Plus button */}
              <PlusDropdown
                openUpward
                onUploadFiles={(files) => void handleUploadFiles(files)}
                onOpenConnectors={() => onOpenTasks('connectors')}
              />

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Right section: Model + Computer + Mic + Send */}
              <div className="flex items-center" style={{ gap: 16 }}>
                <ModelDropdown config={apiConfig} selected={selectedModel} onSelect={setSelectedModel} />

                {/* Send button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    background: '#222222',
                    cursor: 'pointer',
                    border: 'none',
                  }}
                >
                  <ArrowUp size={16} color="#FFFFFF" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
