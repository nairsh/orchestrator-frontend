import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { checkHealth, getModels } from '../api/client';
import type { ModelInfo } from '../api/types';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import {
  MODEL_ICON_DEFINITIONS,
  ModelIcon,
  type ModelIconOverrides,
  inferModelIconKey,
  resolveModelIconKey,
} from '../lib/modelIcons';

const INFERRED_ICON_VALUE = '__inferred__';

interface SettingsModalProps {
  initialBaseUrl: string;
  clerkEnabled?: boolean;
  requiresAuth?: boolean;
  isSignedIn?: boolean;
  getAuthToken?: () => Promise<string | null>;
  onSignIn?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
  userLabel?: string | null;
  initialModelIconOverrides?: ModelIconOverrides;
  onSaveModelIconOverrides?: (overrides: ModelIconOverrides) => Promise<void>;
  onSave: (baseUrl: string) => void | Promise<void>;
  onClose: () => void;
}

export function SettingsModal({
  initialBaseUrl,
  clerkEnabled = false,
  requiresAuth = false,
  isSignedIn = false,
  getAuthToken,
  onSignIn,
  onSignOut,
  userLabel,
  initialModelIconOverrides = {},
  onSaveModelIconOverrides,
  onSave,
  onClose,
}: SettingsModalProps) {
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [modelsStatus, setModelsStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [iconOverrides, setIconOverrides] = useState<ModelIconOverrides>(initialModelIconOverrides);

  const sortedModels = useMemo(
    () => [...models].sort((a, b) => a.display_name.localeCompare(b.display_name)),
    [models]
  );

  useEffect(() => {
    setIconOverrides(initialModelIconOverrides);
  }, [initialModelIconOverrides]);

  useEffect(() => {
    const base = baseUrl.trim();
    if (!base) {
      setModels([]);
      setModelsStatus('idle');
      return;
    }

    let cancelled = false;
    setModelsStatus('loading');
    getModels({ baseUrl: base, getAuthToken })
      .then((res) => {
        if (cancelled) return;
        setModels(res.models ?? []);
        setModelsStatus('idle');
      })
      .catch(() => {
        if (cancelled) return;
        setModels([]);
        setModelsStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [baseUrl, getAuthToken]);

  const handleTest = async () => {
    setStatus('checking');
    setErrorMsg('');
    try {
      const base = baseUrl.trim();
      if (requiresAuth) {
        const token = getAuthToken ? await getAuthToken() : null;
        if (!token) {
          throw new Error('Sign in with Clerk to continue.');
        }
      }
      await checkHealth({ baseUrl: base, getAuthToken });
      setStatus('ok');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSave = async () => {
    const trimmedBaseUrl = baseUrl.trim();
    if (!trimmedBaseUrl) return;

    setSaveError('');
    setSaving(true);
    try {
      await onSave(trimmedBaseUrl);
      if (onSaveModelIconOverrides) {
        await onSaveModelIconOverrides(iconOverrides);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleIconSelection = (modelId: string, value: string) => {
    setIconOverrides((current) => {
      const next = { ...current };
      if (value === INFERRED_ICON_VALUE) {
        delete next[modelId];
      } else {
        next[modelId] = value;
      }
      return next;
    });
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl">
      <ModalHeader title="Server Settings" onClose={onClose} />

      <ModalBody className="space-y-4">
        {clerkEnabled && (
          <div className="rounded-lg border border-border-light bg-surface-warm px-3 py-2">
            <div className="text-xs text-muted">Account</div>
            <div className="mt-1 text-sm text-primary">
              {isSignedIn ? `Signed in${userLabel ? ` as ${userLabel}` : ''}` : 'Signed out'}
            </div>
            <div className="mt-2 flex gap-2">
              {!isSignedIn && (
                <Button variant="secondary" onClick={() => void onSignIn?.()}>
                  Sign in with Clerk
                </Button>
              )}
              {isSignedIn && (
                <Button variant="ghost" onClick={() => void onSignOut?.()}>
                  Sign out
                </Button>
              )}
            </div>
          </div>
        )}

        {requiresAuth && (
          <div className="rounded-lg border border-warning/30 bg-warning/15 px-3 py-2 text-xs text-warning">
            Sign in with Clerk to call the API. This app no longer accepts local API keys.
          </div>
        )}

        <Input
          label="Base URL"
          type="text"
          value={baseUrl}
          onChange={(e) => { setBaseUrl(e.target.value); setStatus('idle'); }}
          placeholder="http://localhost:8080"
          autoFocus
        />

        <div className="space-y-2.5 rounded-lg border border-border-light bg-surface px-3 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-primary font-medium">Model icons</div>
              <div className="text-xs text-muted">
                {clerkEnabled
                  ? 'Per-model icon mapping is saved to your Clerk unsafe metadata.'
                  : 'Per-model icon mapping is saved locally in this browser.'}
              </div>
            </div>
            {modelsStatus === 'loading' && <Loader2 size={14} className="animate-spin text-muted" />}
          </div>

          {modelsStatus === 'error' && (
            <div className="text-xs text-warning">
              Could not load models from this base URL. Fix the URL or test connection first.
            </div>
          )}

          {modelsStatus !== 'error' && sortedModels.length === 0 && (
            <div className="text-xs text-muted">No models available yet for icon mapping.</div>
          )}

          {sortedModels.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-md border border-border-light">
              <div className="divide-y divide-border-light">
                {sortedModels.map((model) => {
                  const autoIcon = inferModelIconKey(model.id, model.provider);
                  const selectedIcon = resolveModelIconKey(model.id, model.provider, iconOverrides);
                  const selectedOverride = iconOverrides[model.id] ?? INFERRED_ICON_VALUE;

                  return (
                    <div key={model.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="flex-shrink-0">
                        <ModelIcon iconKey={selectedIcon} size={16} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-primary truncate">{model.display_name}</div>
                        <div className="text-xs text-muted truncate">{model.id}</div>
                      </div>

                      <select
                        value={selectedOverride}
                        onChange={(e) => handleIconSelection(model.id, e.target.value)}
                        className="min-w-[190px] rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-primary"
                      >
                        <option value={INFERRED_ICON_VALUE}>Use inferred icon ({autoIcon})</option>
                        {MODEL_ICON_DEFINITIONS.map((definition) => (
                          <option key={definition.key} value={definition.key}>
                            {definition.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-xs text-muted">
            Drop custom files into <code>public/model-icons</code>, then register new keys in <code>src/lib/modelIcons.tsx</code>.
          </div>
        </div>

        {/* Inline connection status */}
        {status === 'ok' && (
          <div className="flex items-center gap-2 text-xs text-accent bg-accent/15 border border-accent/30 rounded-lg px-3 py-2">
            <Check size={13} className="flex-shrink-0" />
            <span>Connected successfully</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-start gap-2 text-xs text-danger bg-danger/15 border border-danger/30 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
            <span>{errorMsg || 'Connection failed'}</span>
          </div>
        )}

        {saveError && (
          <div className="flex items-start gap-2 text-xs text-danger bg-danger/15 border border-danger/30 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <button
          type="button"
          onClick={() => void handleTest()}
          disabled={status === 'checking' || saving || !baseUrl.trim()}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors duration-150 disabled:opacity-40 cursor-pointer disabled:cursor-default"
        >
          {status === 'checking' && (
            <Loader2 size={13} className="animate-spin flex-shrink-0" />
          )}
          Test connection
        </button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSave()}
            disabled={saving || !baseUrl.trim()}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
