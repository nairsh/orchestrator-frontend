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
          colorSuccess: isDark ? '#22c55e' : '#22c55e',
          colorWarning: '#F59E0B',
          colorError: '#EF4444',
          colorBgContainer: isDark ? '#161616' : '#ffffff',
          colorBgElevated: isDark ? '#1b1b1b' : '#f7f7f8',
          colorBgLayout: isDark ? '#111111' : '#faf8f4',
          colorBgSpotlight: isDark ? '#202020' : '#f5f5f5',
          colorBorder: isDark ? '#303030' : '#e0e0e0',
          colorBorderSecondary: isDark ? '#3a3a3a' : '#e5e7eb',
          colorText: isDark ? '#ececec' : '#111111',
          colorTextSecondary: isDark ? '#bbbbbb' : '#444444',
          colorTextTertiary: isDark ? '#959595' : '#666666',
          colorTextQuaternary: isDark ? '#727272' : '#a0a0a0',
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
