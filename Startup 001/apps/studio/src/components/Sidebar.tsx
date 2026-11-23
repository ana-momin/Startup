import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { initials } from '@/lib/api';
import type { User, Video } from '@/lib/api';
import './sidebar.css';

/* Kept in step with the app's own list. 'building' is here so the sidebar can show
   nothing as current while a video is being made — none of the destinations is. */
type View = 'new' | 'projects' | 'brands' | 'building' | 'video';

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  view: View;
  onNew: () => void;
  onProjects: () => void;
  onBrands: () => void;
  brandCount: number;
  /** Rename a video from the list. */
  onRename: (id: string, title: string) => void;
  videos: Video[];
  activeId?: string;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onSettings: () => void;
};

/**
 * Whether the recent list is open, remembered.
 *
 * A collapse that forgets itself is worse than no collapse: somebody who shuts this list
 * has decided they do not want it, and showing it again on the next load overrules that
 * decision every single time. Wrapped because storage throws in a private window, and a
 * sidebar is not worth a blank page.
 */
const RECENTS_KEY = 'motion.recents-open';

const rememberedOpen = (): boolean => {
  try {
    return localStorage.getItem(RECENTS_KEY) !== 'shut';
  } catch {
    return true;
  }
};

/**
 * The left panel.
 *
 * Two shapes, one component: a full panel, and a narrow rail of icons when collapsed.
 * Keeping both here means a new item can never be added to one and forgotten in the
 * other — the classic way sidebars drift apart.
 *
 * Only three destinations, and every one does something. A menu item that does nothing
 * teaches people not to trust the menu.
 */
export const Sidebar = ({
  collapsed,
  onToggle,
  view,
  onNew,
  onProjects,
  onBrands,
  brandCount,
  onRename,
  videos,
  activeId,
  onOpen,
  onDelete,
  user,
  onSignIn,
  onSignOut,
  onSettings,
}: SidebarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close the account menu on any outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const recents = videos.slice(0, 8);

  const [recentsOpen, setRecentsOpen] = useState(rememberedOpen);

  useEffect(() => {
    try {
      localStorage.setItem(RECENTS_KEY, recentsOpen ? 'open' : 'shut');
    } catch {
      // A browser that will not remember it still has to show it.
    }
  }, [recentsOpen]);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* ---------- Head ---------- */}
      <div className="sidebar__head">
        {collapsed ? (
          /* Collapsed, the logo IS the expand control: it swaps to the panel icon on
             hover. That is where the hand already goes. */
          <button className="sidebar__logo" onClick={onToggle} title="Expand sidebar">
            <span className="sidebar__logo-mark">
              <Icon name="logo" size={21} />
            </span>
            <span className="sidebar__logo-swap">
              <Icon name="panel" size={18} />
            </span>
          </button>
        ) : (
          <>
            <span className="sidebar__brand">
              <Icon name="logo" size={18} />
              Motion
            </span>
            <button
              className="icon-btn"
              onClick={onToggle}
              title="Collapse sidebar"
              type="button"
            >
              <Icon name="panel" size={17} />
            </button>
          </>
        )}
      </div>

      {/* ---------- Links ---------- */}
      <nav className="sidebar__nav">
        <SidebarLink
          icon="edit"
          label="New video"
          collapsed={collapsed}
          active={view === 'new'}
          onClick={onNew}
        />
        <SidebarLink
          icon="folder"
          label="Projects"
          collapsed={collapsed}
          active={view === 'projects'}
          count={videos.length}
          onClick={onProjects}
        />
        <SidebarLink
          icon="brand"
          label="Brands"
          collapsed={collapsed}
          active={view === 'brands'}
          count={brandCount}
          onClick={onBrands}
        />
      </nav>

      {/* The active brand used to be shown here too. It lives in the prompt box now,
          which is where the choice is actually made — saying it twice made the sidebar
          look like a status panel rather than navigation. */}

      {/* ---------- Recents ---------- */}
      {!collapsed && (
        <div className={`sidebar__recents ${recentsOpen ? '' : 'is-shut'}`}>
          {/*
            The heading is the control.

            A chevron on its own is a 16px target next to a word that looks like a label
            and is not one; making the whole row the button means the thing you read and
            the thing you press are the same object. The count appears only when the list
            is shut, because that is the only time you cannot simply look.
          */}
          <button
            className="sidebar__section"
            onClick={() => setRecentsOpen((open) => !open)}
            aria-expanded={recentsOpen}
            title={recentsOpen ? 'Hide recent videos' : 'Show recent videos'}
          >
            <Icon name="chevronRight" size={12} />
            Recent
            {!recentsOpen && videos.length > 0 && <em>{videos.length}</em>}
          </button>

          {recentsOpen &&
            (recents.length === 0 ? (
              <p className="sidebar__empty">Videos you make will show up here.</p>
            ) : (
              <ul className="recent-list">
                {recents.map((video) => (
                  <RecentRow
                    key={video.id}
                    video={video}
                    active={video.id === activeId}
                    onOpen={() => onOpen(video.id)}
                    onDelete={() => onDelete(video.id)}
                    onRename={(title) => onRename(video.id, title)}
                  />
                ))}
              </ul>
            ))}
        </div>
      )}

      {/* ---------- Account ---------- */}
      <div className="sidebar__foot" ref={accountRef}>
        {user ? (
          <>
            <button
              className="account"
              onClick={() => setMenuOpen((o) => !o)}
              title={collapsed ? user.name : undefined}
            >
              <span className="avatar">{initials(user)}</span>
              {!collapsed && (
                <>
                  <span className="account__text">
                    <span className="account__name">{user.name}</span>
                    <span className="account__plan">
                      {user.plan === 'free' ? 'Free' : user.plan}
                    </span>
                  </span>
                  <Icon name="settings" size={15} />
                </>
              )}
            </button>

            {menuOpen && (
              <div className="account__menu">
                <span className="account__menu-email">{user.email}</span>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onSettings();
                  }}
                >
                  <Icon name="settings" size={15} />
                  Settings
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                >
                  <Icon name="logout" size={15} />
                  Sign out
                </button>
              </div>
            )}
          </>
        ) : collapsed ? (
          <button className="account" onClick={onSignIn} title="Sign in">
            <span className="avatar avatar--empty">
              <Icon name="user" size={15} />
            </span>
          </button>
        ) : (
          <div className="signed-out">
            <p className="signed-out__note">
              Your videos are saved in this browser. Sign in to keep them.
            </p>
            <button className="btn btn--primary signed-out__primary" onClick={onSignIn}>
              Sign in
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

/* ---------- one video in the list ---------- */

/**
 * A recent video, renameable in place.
 *
 * Editing the name where it sits rather than in a dialog: a rename is a two-second
 * correction, and anything that opens a window to do it feels heavier than the task.
 * The controls only appear on hover, because a permanent row of little icons beside
 * every item is visual noise.
 */
const RecentRow = ({
  video,
  active,
  onOpen,
  onDelete,
  onRename,
}: {
  video: Video;
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(video.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const title = draft.trim();
    if (title && title !== video.title) onRename(title);
    else setDraft(video.title);
    setEditing(false);
  };

  if (editing) {
    return (
      <li>
        <input
          ref={inputRef}
          className="recent__input"
          value={draft}
          maxLength={60}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraft(video.title);
              setEditing(false);
            }
          }}
        />
      </li>
    );
  }

  return (
    <li>
      <button
        className={`recent ${active ? 'is-active' : ''}`}
        onClick={onOpen}
        title={video.title}
      >
        <span className="recent__title">{video.title}</span>
        {video.local && (
          <span className="recent__badge" title="Saved in this browser only">
            local
          </span>
        )}
      </button>

      <span className="recent__actions">
        <button
          onClick={() => {
            setDraft(video.title);
            setEditing(true);
          }}
          aria-label={`Rename ${video.title}`}
          title="Rename"
        >
          <Icon name="edit" size={13} />
        </button>
        <button onClick={onDelete} aria-label={`Delete ${video.title}`} title="Delete">
          <Icon name="trash" size={13} />
        </button>
      </span>
    </li>
  );
};

/* ---------- One row ---------- */

const SidebarLink = ({
  icon,
  label,
  collapsed,
  active,
  count,
  onClick,
}: {
  icon: 'edit' | 'folder' | 'brand';
  label: string;
  collapsed: boolean;
  active?: boolean;
  count?: number;
  onClick: () => void;
}) => (
  <button
    className={`sidebar__link ${active ? 'is-active' : ''}`}
    onClick={onClick}
    title={collapsed ? label : undefined}
    type="button"
  >
    <Icon name={icon} size={17} />
    {!collapsed && (
      <>
        <span>{label}</span>
        {count !== undefined && count > 0 && (
          <span className="sidebar__count">{count}</span>
        )}
      </>
    )}
  </button>
);
