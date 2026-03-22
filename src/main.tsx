import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider, useAuth, useClerk, useUser } from '@clerk/clerk-react';
import App from './App';
import './styles/globals.css';
import {
  MODEL_ICON_LOCAL_STORAGE_KEY,
  extractModelIconOverridesFromUnsafeMetadata,
  sanitizeModelIconOverrides,
  withModelIconOverridesInUnsafeMetadata,
  type ModelIconOverrides,
} from './lib/modelIcons';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function applyInitialTheme(): void {
  const root = document.documentElement;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem('relay-theme');
  } catch {
    stored = null;
  }

  const theme =
    stored === 'light' || stored === 'dark'
      ? stored
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
}

applyInitialTheme();

function loadLocalModelIconOverrides(): ModelIconOverrides {
  try {
    const raw = localStorage.getItem(MODEL_ICON_LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeModelIconOverrides(parsed);
  } catch {
    return {};
  }
}

function saveLocalModelIconOverrides(overrides: ModelIconOverrides): void {
  try {
    localStorage.setItem(MODEL_ICON_LOCAL_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore local storage failures
  }
}

function sameOverrides(a: ModelIconOverrides, b: ModelIconOverrides): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function ClerkAwareApp() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const { openSignIn, signOut } = useClerk();
  const { user } = useUser();
  const [modelIconOverrides, setModelIconOverrides] = useState<ModelIconOverrides>(loadLocalModelIconOverrides);

  useEffect(() => {
    if (!user) return;
    const remoteOverrides = extractModelIconOverridesFromUnsafeMetadata(user.unsafeMetadata);
    if (!Object.keys(remoteOverrides).length) return;

    setModelIconOverrides((current) => {
      const merged = { ...current, ...remoteOverrides };
      if (sameOverrides(current, merged)) return current;
      saveLocalModelIconOverrides(merged);
      return merged;
    });
  }, [user?.id, user?.unsafeMetadata]);

  const handleSaveModelIconOverrides = async (overrides: ModelIconOverrides) => {
    const sanitized = sanitizeModelIconOverrides(overrides);
    setModelIconOverrides(sanitized);
    saveLocalModelIconOverrides(sanitized);

    if (!user) return;

    await user.update({
      unsafeMetadata: withModelIconOverridesInUnsafeMetadata(user.unsafeMetadata, sanitized),
    });
    await user.reload();
  };

  return (
    <App
      clerkEnabled
      authLoaded={isLoaded}
      hasSessionAuth={Boolean(isSignedIn)}
      userLabel={user?.fullName ?? user?.firstName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? null}
      userAvatarUrl={user?.imageUrl ?? null}
      modelIconOverrides={modelIconOverrides}
      onSaveModelIconOverrides={handleSaveModelIconOverrides}
      onSignIn={async () => {
        await openSignIn();
      }}
      onSignOut={async () => {
        await signOut();
      }}
      getAuthToken={async () => {
        const token = await getToken();
        return token ?? null;
      }}
    />
  );
}

function LocalAwareApp() {
  const [modelIconOverrides, setModelIconOverrides] = useState<ModelIconOverrides>(loadLocalModelIconOverrides);

  const handleSaveModelIconOverrides = async (overrides: ModelIconOverrides) => {
    const sanitized = sanitizeModelIconOverrides(overrides);
    setModelIconOverrides(sanitized);
    saveLocalModelIconOverrides(sanitized);
  };

  return (
    <App
      clerkEnabled={false}
      modelIconOverrides={modelIconOverrides}
      onSaveModelIconOverrides={handleSaveModelIconOverrides}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {clerkPublishableKey ? (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <ClerkAwareApp />
      </ClerkProvider>
    ) : (
      <LocalAwareApp />
    )}
  </React.StrictMode>
);
