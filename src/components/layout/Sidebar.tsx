import { useEffect, useRef, useState } from 'react';
import { Plus, CircleCheck, FileText, Plug, Blocks, Settings, Menu, PanelLeftClose } from 'lucide-react';
import type { ApiConfig } from '../../api/client';
import { getBillingBalance } from '../../api/client';
import { toastApiError } from '../../lib/toast';

type NavId = 'search' | 'tasks' | 'files' | 'connectors' | 'skills';

interface NavItem {
  id: NavId;
  label: string;
  icon: React.ReactNode;
}

const COLLAPSED_ICON_SIZE = 18;
const EXPANDED_ICON_SIZE = 18;

const getNavItems = (collapsed: boolean): NavItem[] => [
  { id: 'search',     label: 'New',        icon: <Plus size={collapsed ? COLLAPSED_ICON_SIZE : EXPANDED_ICON_SIZE} strokeWidth={1.75} /> },
  { id: 'tasks',      label: 'Tasks',      icon: <CircleCheck size={collapsed ? COLLAPSED_ICON_SIZE : EXPANDED_ICON_SIZE} strokeWidth={1.75} /> },
  { id: 'files',      label: 'Files',      icon: <FileText size={collapsed ? COLLAPSED_ICON_SIZE : EXPANDED_ICON_SIZE} strokeWidth={1.75} /> },
  { id: 'connectors', label: 'Connectors', icon: <Plug size={collapsed ? COLLAPSED_ICON_SIZE : EXPANDED_ICON_SIZE} strokeWidth={1.75} /> },
  { id: 'skills',     label: 'Skills',     icon: <Blocks size={collapsed ? COLLAPSED_ICON_SIZE : EXPANDED_ICON_SIZE} strokeWidth={1.75} /> },
];

interface SidebarProps {
  activeNav?: NavId;
  onNavChange?: (id: NavId) => void;
  config?: ApiConfig;
  onOpenSettings?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ activeNav = 'tasks', onNavChange, config, onOpenSettings, collapsed: collapsedProp, onCollapsedChange }: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = collapsedProp !== undefined ? collapsedProp : internalCollapsed;
  const setCollapsed = (value: boolean) => {
    if (onCollapsedChange) {
      onCollapsedChange(value);
    } else {
      setInternalCollapsed(value);
    }
  };
  const [credits, setCredits] = useState<number | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const billingErrorShownRef = useRef(false);

  useEffect(() => {
    if (!config?.apiKey) {
      setCredits(null);
      setTier(null);
      billingErrorShownRef.current = false;
      return;
    }
    let cancelled = false;

    const fetch_ = async () => {
      try {
        const bal = await getBillingBalance(config);
        if (cancelled) return;
        setCredits(bal.credits_balance);
        setTier(bal.tier);
        billingErrorShownRef.current = false;
      } catch (err) {
        if (cancelled) return;
        if (!billingErrorShownRef.current) {
          billingErrorShownRef.current = true;
          toastApiError(err, 'Failed to load billing');
        }
      }
    };

    void fetch_();
    const t = setInterval(fetch_, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [config?.baseUrl, config?.apiKey]);

  const NEW_BUTTON_BG = '#ffffff';

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0 app-ui"
      style={{
        width: collapsed ? 44 : 176,
        background: '#f2f0eb',
        borderRight: '1px solid #f2f0eb',
        padding: collapsed ? '12px 0' : '20px 14px',
        justifyContent: 'space-between',
        transition: 'width 0.2s ease',
        overflow: collapsed ? 'visible' : 'hidden',
      }}
    >
      {/* Top nav */}
      <div className="flex flex-col" style={{ gap: 4 }}>
        {collapsed ? (
          <div className="group relative flex items-center justify-center">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center flex-shrink-0"
              style={{
                height: 48,
                width: 48,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Menu size={16} color="#222222" strokeWidth={1.75} />
            </button>
            {/* Tooltip */}
            <div
              className="absolute ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50"
              style={{ pointerEvents: 'none', left: '100%' }}
            >
              Menu
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between" style={{ padding: '0 8px 8px 8px' }}>
             <div className="flex items-baseline gap-0.5">
              <span style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 500, color: '#222222', letterSpacing: -0.6 }}>relay</span>
              <span style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 300, color: '#555555', letterSpacing: -0.6 }}>pro</span>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={18} color="#222222" strokeWidth={1.75} />
            </button>
          </div>
        )}

        {getNavItems(collapsed).map((item, idx) => {
          const isActive = activeNav === item.id;
          const isSearch = item.id === 'search';

              if (collapsed) {
            return (
              <div key={item.id} className="group relative flex items-center justify-center" style={{ marginBottom: isSearch ? 12 : 0 }}>
                <button
                  type="button"
                  onClick={() => onNavChange?.(item.id)}
                  className="flex items-center justify-center"
                  style={{
                    height: isSearch ? 32 : 32,
                    width: isSearch ? 32 : '100%',
                    margin: isSearch ? '0 auto' : 0,
                    background: isSearch ? NEW_BUTTON_BG : 'transparent',
                    border: isSearch ? '1px solid #e0e0e0' : 'none',
                    cursor: 'pointer',
                    borderRadius: isSearch ? 8 : 0,
                    boxShadow: isSearch ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ color: isSearch ? '#111111' : '#222222' }}>{item.icon}</span>
                </button>
                {/* Tooltip */}
                <div
                  className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50"
                  style={{ pointerEvents: 'none', left: '100%' }}
                >
                  {item.label}
                </div>
              </div>
            );
          }

          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => onNavChange?.(item.id)}
                className="w-full flex items-center"
                style={{
                  gap: isSearch ? 10 : 12,
                  padding: isSearch ? '7px 12px' : '8px 10px',
                  borderRadius: isSearch ? 8 : 6,
                  background: isSearch ? NEW_BUTTON_BG : 'transparent',
                  boxShadow: isSearch ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                  border: isSearch ? '1px solid #e0e0e0' : 'none',
                  cursor: 'pointer',
                  fontFamily: 'Inter',
                  fontSize: 14,
                  fontWeight: isSearch ? 500 : isActive ? 500 : 400,
                  color: isSearch ? '#111111' : '#222222',
                  transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ color: isSearch ? '#111111' : '#222222', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.15s' }}>{item.label}</span>
              </button>
              {isSearch && idx === 0 && <div style={{ height: 16 }} />}
            </div>
          );
        })}
      </div>

      {/* Bottom: user profile */}
      {!collapsed && (
        <div className="flex flex-col" style={{ gap: 16 }}>
          <div
            className="flex items-center justify-between"
            style={{ padding: '8px 12px', gap: 12 }}
          >
            <div className="flex items-center" style={{ gap: 12 }}>
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{ width: 24, height: 24, borderRadius: 12, background: '#111111' }}
              >
                <span style={{ color: '#FFFFFF', fontSize: 12, fontFamily: 'Inter', fontWeight: 400 }}>
                  {tier ? tier[0]?.toUpperCase() : '•'}
                </span>
              </div>
              <div className="flex flex-col" style={{ lineHeight: 1.15 }}>
                <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 500, color: '#111111' }}>
                  Connected
                </span>
                <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 400, color: '#444444' }}>
                  {credits !== null ? `${credits.toFixed(2)} credits` : '—'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'transparent',
                border: 'none',
              }}
              aria-label="Open settings"
            >
              <Settings size={16} color="#222222" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
