import { Loader2 } from 'lucide-react';
import type { ModelInfo } from '../../api/types';
import { Button, Input } from '../ui';
import { IconCheck } from '../icons/CustomIcons';

export interface SettingsGeneralPanelProps {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  status: 'idle' | 'checking' | 'ok' | 'error';
  setStatus: (s: 'idle' | 'checking' | 'ok' | 'error') => void;
  errorMsg: string;
  saving: boolean;
  isSignedIn: boolean;
  userLabel?: string | null;
  clerkEnabled: boolean;
  models: ModelInfo[];
  modelsStatus: 'idle' | 'loading' | 'error';
  onSignIn?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
  onBack: () => void;
  handleTest: () => void;
  handleSave: () => void;
}

export function SettingsGeneralPanel({
  baseUrl,
  setBaseUrl,
  status,
  setStatus,
  errorMsg,
  saving,
  isSignedIn,
  userLabel,
  clerkEnabled,
  models,
  modelsStatus,
  onSignIn,
  onSignOut,
  onBack,
  handleTest,
  handleSave,
}: SettingsGeneralPanelProps) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-[15px] font-medium text-primary mb-1">Connection</h2>
        <p className="text-[13px] text-secondary mb-5">Where your AI is running.</p>
        <div className="space-y-4">
          <div>
            <label htmlFor="settings-server-address" className="block text-[12.5px] font-medium text-secondary mb-1.5">Server address</label>
            <div className="flex gap-2">
              <Input
                id="settings-server-address"
                value={baseUrl}
                onChange={(e) => { setBaseUrl(e.target.value); setStatus('idle'); }}
                placeholder="http://localhost:8080"
                className="flex-1"
              />
              <Button variant="secondary" size="sm" onClick={handleTest} disabled={status === 'checking' || !baseUrl.trim()}>
                {status === 'checking' ? <Loader2 size={13} className="animate-spin" /> : 'Test'}
              </Button>
            </div>
            {status === 'ok' && (
              <div className="flex items-center gap-1.5 mt-2 text-[12.5px] text-accent">
                <IconCheck size={14} /> Connected successfully
              </div>
            )}
            {status === 'error' && (
              <div className="mt-2 text-[12.5px] text-danger">{errorMsg || 'Connection failed'}</div>
            )}
          </div>
        </div>
      </section>

      <div className="h-px bg-border" />

      <section>
        <h2 className="text-[15px] font-medium text-primary mb-1">Account</h2>
        <p className="text-[13px] text-secondary mb-5">Your sign-in status.</p>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-[13.5px] text-primary font-medium">
              {isSignedIn ? `Signed in${userLabel ? ` as ${userLabel}` : ''}` : 'Not signed in'}
            </div>
            <div className="text-[12px] text-muted mt-0.5">
              {clerkEnabled ? 'Online account' : 'Using without an account'}
            </div>
          </div>
          {clerkEnabled && (
            <Button variant="secondary" size="sm" onClick={() => void (isSignedIn ? onSignOut?.() : onSignIn?.())}>
              {isSignedIn ? 'Sign out' : 'Sign in'}
            </Button>
          )}
        </div>
      </section>

      <div className="h-px bg-border" />

      <section>
        <h2 className="text-[15px] font-medium text-primary mb-1">AI Options</h2>
        <p className="text-[13px] text-secondary mb-5">AI assistants you can choose from.</p>
        <div className="flex items-center justify-between py-2">
          <div className="text-[13.5px] text-primary">
            <span className="font-medium text-[20px] mr-1.5">{models.length}</span>
            <span className="text-secondary">options available</span>
          </div>
          {modelsStatus === 'loading' && <Loader2 size={14} className="animate-spin text-muted" />}
          {modelsStatus === 'error' && <span className="text-[12px] text-danger">Failed to load</span>}
        </div>
      </section>

      <div className="h-px bg-border" />

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onBack}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !baseUrl.trim()}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}
