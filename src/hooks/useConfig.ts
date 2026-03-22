import { useState, useCallback } from 'react';

export interface AppConfig {
  baseUrl: string;
}

const STORAGE_KEY = 'relay_config';

const DEFAULT_CONFIG: AppConfig = {
  baseUrl: 'http://localhost:8080',
};

function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppConfig>;
      return {
        baseUrl: parsed.baseUrl ?? DEFAULT_CONFIG.baseUrl,
      };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_CONFIG };
}

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(loadConfig);

  const saveConfig = useCallback((next: AppConfig) => {
    setConfig(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const isConfigured = config.baseUrl.trim().length > 0;

  return { config, saveConfig, isConfigured };
}
