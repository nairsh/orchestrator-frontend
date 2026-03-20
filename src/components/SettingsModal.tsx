import { useState, useEffect, useRef } from 'react';
import { X, Check, Loader2, AlertCircle } from 'lucide-react';
import { checkHealth, getBillingBalance } from '../api/client';

interface SettingsModalProps {
  initialBaseUrl: string;
  initialApiKey: string;
  onSave: (baseUrl: string, apiKey: string) => void;
  onClose: () => void;
}

export function SettingsModal({ initialBaseUrl, initialApiKey, onSave, onClose }: SettingsModalProps) {
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const baseUrlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Trigger fade-in after mount
    const t = requestAnimationFrame(() => setVisible(true));
    // Autofocus base URL
    baseUrlRef.current?.focus();
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 150);
  };

  const handleTest = async () => {
    setStatus('checking');
    setErrorMsg('');
    try {
      const base = baseUrl.trim();
      const key = apiKey.trim();

      await checkHealth({ baseUrl: base, apiKey: '' });
      if (key) {
        await getBillingBalance({ baseUrl: base, apiKey: key });
      }
      setStatus('ok');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSave = () => {
    onSave(baseUrl.trim(), apiKey.trim());
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) handleClose();
  };

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-all duration-150 ${
        visible ? 'bg-black/40' : 'bg-black/0'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transition-all duration-150 ${
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-[0.98]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-primary">API Settings</h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-primary mb-1.5">Base URL</label>
            <input
              ref={baseUrlRef}
              type="text"
              value={baseUrl}
              onChange={(e) => { setBaseUrl(e.target.value); setStatus('idle'); }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-primary outline-none focus:border-gray-400 transition-colors duration-150 bg-white placeholder:text-gray-300"
              placeholder="http://localhost:8080"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-primary mb-1.5">API Key</label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setStatus('idle'); }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-primary outline-none focus:border-gray-400 transition-colors duration-150 bg-white placeholder:text-gray-300"
                placeholder="sk-…"
              />
            </div>
          </div>

          {/* Inline connection status */}
          {status === 'ok' && (
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              <Check size={13} className="flex-shrink-0" />
              <span>Connected successfully</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-start gap-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg || 'Connection failed'}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={status === 'checking' || !baseUrl.trim()}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors duration-150 disabled:opacity-40 cursor-pointer disabled:cursor-default"
          >
            {status === 'checking' ? (
              <Loader2 size={13} className="animate-spin flex-shrink-0" />
            ) : null}
            Test connection
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 rounded-lg text-sm text-muted hover:text-primary hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!baseUrl.trim() || !apiKey.trim()}
              className="px-3.5 py-1.5 rounded-lg text-sm bg-primary text-white hover:bg-gray-800 disabled:opacity-30 transition-colors duration-150 cursor-pointer disabled:cursor-default"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
