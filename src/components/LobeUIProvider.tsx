import type { ReactNode } from 'react';
import { ThemeProvider } from '@lobehub/ui';
import { ConfigProvider } from '@lobehub/ui';
import { motion } from 'motion/react';

/**
 * Bridges the existing Relay CSS custom properties to LobeUI's antd theme tokens.
 * This lets LobeUI components render with the same color palette while
 * Tailwind classes continue to work alongside.
 */

interface LobeUIProviderProps {
  children: ReactNode;
  appearance?: 'dark' | 'light';
}

export function LobeUIProvider({ children, appearance = 'dark' }: LobeUIProviderProps) {
  const isDark = appearance === 'dark';

  return (
    <ThemeProvider
      appearance={appearance}
      theme={{
        token: {
          // Map Relay palette → antd design tokens
          colorPrimary: '#008040',
          colorInfo: '#3B82F6',
          colorSuccess: '#22c55e',
          colorWarning: '#F59E0B',
          colorError: '#EF4444',
          colorBgContainer: isDark ? '#161616' : '#ffffff',
          colorBgElevated: isDark ? '#1e1c1a' : '#f8f5f0',
          colorBgLayout: isDark ? '#131211' : '#f5f3ee',
          colorBgSpotlight: isDark ? '#252320' : '#efece6',
          colorBorder: isDark ? '#2e2c28' : '#e6e2db',
          colorBorderSecondary: isDark ? '#3a3835' : '#ebe8e2',
          colorText: isDark ? '#ececec' : '#1a1a1a',
          colorTextSecondary: isDark ? '#bbbbbb' : '#555555',
          colorTextTertiary: isDark ? '#959595' : '#8a8a8a',
          colorTextQuaternary: isDark ? '#727272' : '#aaaaaa',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontFamilyCode: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
          fontSize: 14,
          borderRadius: 8,
          borderRadiusSM: 6,
          borderRadiusLG: 12,
        },
      }}
    >
      <ConfigProvider motion={motion}>
        {children}
      </ConfigProvider>
    </ThemeProvider>
  );
}
