import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip } from '@lobehub/ui';
import { Menu } from 'lucide-react';
import { IconSidebarToggle } from '../icons/CustomIcons';
import { BrandMark, BrandWordmark } from '../branding/Brand';
import type { SidebarProps } from './sidebar-types';
import { getNavItems, WIDTH_EXPANDED, WIDTH_COLLAPSED } from './sidebar-types';
import { SidebarCollapsedNav, SidebarExpandedNavGroup } from './SidebarNav';
import { SidebarWorkflows } from './SidebarWorkflows';
import { SidebarAccount } from './SidebarAccount';

export type { NavId } from './sidebar-types';

export function Sidebar({
  activeNav = 'tasks',
  onNavChange,
  onOpenSettings,
  onSignOut,
  isSignedIn = false,
  userLabel,
  userAvatarUrl,
  collapsed: collapsedProp,
  onCollapsedChange,
  workflows = [],
  pinnedIds,
  onSelectWorkflow,
  getDisplayName,
  isMobile = false,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = collapsedProp !== undefined ? collapsedProp : internalCollapsed;
  const setCollapsed = (value: boolean) => {
    if (onCollapsedChange) onCollapsedChange(value);
    else setInternalCollapsed(value);
  };

  const navItems = getNavItems();
  const actionItems = navItems.filter((i) => i.group === 'action');
  const pageItems = navItems.filter((i) => i.group === 'page');

  // On mobile, wrap nav change to auto-collapse after navigation
  const handleNavChange = (id: typeof activeNav) => {
    onNavChange?.(id);
    if (isMobile) setCollapsed(true);
  };

  /* ─── Mobile: collapsed = hamburger button only ─── */
  if (isMobile && collapsed) {
    return (
      <div className="flex-shrink-0 flex items-start pt-3 pl-3" style={{ width: 52 }}>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface border border-border-light shadow-sm cursor-pointer hover:bg-surface-hover transition-colors duration-200"
          aria-label="Open menu"
        >
          <Menu size={18} className="text-primary" />
        </button>
      </div>
    );
  }

  /* ─── Mobile: expanded = overlay sidebar ─── */
  if (isMobile && !collapsed) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 transition-opacity duration-200"
          onClick={() => setCollapsed(true)}
          aria-hidden="true"
        />
        {/* Sidebar panel */}
        <aside
          className="relative flex flex-col h-full bg-sidebar border-r border-border-subtle overflow-hidden animate-slide-in-left"
          style={{ width: WIDTH_EXPANDED, padding: '16px 12px 12px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-1 mb-5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-light bg-surface text-primary shadow-xs">
                <BrandMark size={18} className="text-primary" />
              </div>
              <BrandWordmark primaryClassName="text-[18px]" secondaryClassName="text-[18px]" />
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-transparent border-none cursor-pointer hover:bg-surface-hover transition-colors duration-200"
              aria-label="Close menu"
            >
              <IconSidebarToggle size={16} className="text-muted" />
            </button>
          </div>

          <SidebarExpandedNavGroup items={actionItems} activeNav={activeNav} onNavChange={handleNavChange} />
          <div className="mx-1 my-3.5 h-px bg-sidebar-sep" />
          <SidebarExpandedNavGroup items={pageItems} activeNav={activeNav} onNavChange={handleNavChange} />

          <SidebarWorkflows
            workflows={workflows}
            pinnedIds={pinnedIds}
            onSelectWorkflow={(id, obj) => {
              onSelectWorkflow?.(id, obj);
              setCollapsed(true);
            }}
            getDisplayName={getDisplayName}
          />

          <div className="flex-1" />

          <SidebarAccount
            isSignedIn={isSignedIn}
            userLabel={userLabel}
            userAvatarUrl={userAvatarUrl}
            onOpenSettings={() => {
              onOpenSettings?.();
              setCollapsed(true);
            }}
            onSignOut={onSignOut}
          />
        </aside>
      </div>,
      document.body,
    );
  }

  /* ─── Desktop: collapsed state ─── */

  if (collapsed) {
    return (
      <aside
        className="flex flex-col h-full flex-shrink-0 app-ui items-center bg-sidebar border-r border-border-subtle transition-[width] duration-slow overflow-visible"
        style={{ width: WIDTH_COLLAPSED, padding: '12px 0' }}
      >
        <div className="group relative flex items-center justify-center">
          <Tooltip title="Menu" placement="right">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center flex-shrink-0 h-10 w-10 bg-surface border border-border-light cursor-pointer rounded-xl hover:bg-surface-hover transition-colors duration-200"
              aria-label="Expand sidebar"
            >
              <BrandMark size={18} className="text-primary" />
            </button>
          </Tooltip>
        </div>

        <SidebarCollapsedNav navItems={navItems} activeNav={activeNav} onNavChange={onNavChange} />
      </aside>
    );
  }

  /* ─── Desktop: expanded state ─── */

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0 app-ui bg-sidebar border-r border-border-subtle transition-[width] duration-slow overflow-hidden"
      style={{ width: WIDTH_EXPANDED, padding: '16px 12px 12px' }}
    >
      {/* Header: brand + toggle */}
      <div className="flex items-center justify-between px-1 mb-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-light bg-surface text-primary shadow-xs">
            <BrandMark size={18} className="text-primary" />
          </div>
          <BrandWordmark
            primaryClassName="text-[18px]"
            secondaryClassName="text-[18px]"
          />
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-transparent border-none cursor-pointer hover:bg-surface-hover transition-colors duration-200"
          aria-label="Collapse sidebar"
        >
          <IconSidebarToggle size={16} className="text-muted" />
        </button>
      </div>

      {/* Action items (New task, Search) */}
      <SidebarExpandedNavGroup items={actionItems} activeNav={activeNav} onNavChange={onNavChange} />

      {/* Separator */}
      <div className="mx-1 my-3.5 h-px bg-sidebar-sep" />

      {/* Page nav items */}
      <SidebarExpandedNavGroup items={pageItems} activeNav={activeNav} onNavChange={onNavChange} />

      {/* Starred & Recents */}
      <SidebarWorkflows
        workflows={workflows}
        pinnedIds={pinnedIds}
        onSelectWorkflow={onSelectWorkflow}
        getDisplayName={getDisplayName}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom: user profile + notifications */}
      <SidebarAccount
        isSignedIn={isSignedIn}
        userLabel={userLabel}
        userAvatarUrl={userAvatarUrl}
        onOpenSettings={onOpenSettings}
        onSignOut={onSignOut}
      />
    </aside>
  );
}
