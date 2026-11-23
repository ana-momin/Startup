import { useCallback, useEffect, useRef, useState } from 'react';
import type { VideoSpec } from '@motion/planner';
import { AuthModal } from '@/components/AuthModal';
import { ImportBrandModal } from '@/components/ImportBrandModal';
import { SettingsModal } from '@/components/SettingsModal';
import { Sidebar } from '@/components/Sidebar';
import type { PromptOptions } from '@/components/PromptBar';
import { api, ApiOffline, download } from '@/lib/api';
import type { Brand, User, Video } from '@/lib/api';
import { clearLocal, loadLocal, makeLocalVideo, saveLocal } from '@/lib/localVideos';
import { loadPreferences, savePreferences } from '@/lib/preferences';
import type { Preferences } from '@/lib/preferences';
import { useTitle } from '@/lib/title';
import { BrandPage } from '@/pages/BrandPage';
import { Building, useBuildStages } from '@/pages/Building';
import type { BuildStage } from '@/pages/Building';
import { Chat } from '@/pages/Chat';
import type { ChatMessage, Pending } from '@/pages/Chat';
import { Projects } from '@/pages/Projects';
import { Workspace } from '@/pages/Workspace';
import type { EditMessage, ExportState } from '@/pages/Workspace';
import './app.css';

type Theme = 'light' | 'dark';
type View = 'new' | 'projects' | 'brands' | 'building' | 'video';

/** Remembering the chosen brand here, so it survives a reload. */
const ACTIVE_BRAND_KEY = 'motion.activeBrand';

/**
 * App shell.
 *
 * Shared state lives here because the sidebar, the project list and the workspace all
 * read the same list of videos. One owner means they can never disagree.
 *
 * Two rules the product rests on:
 *   - **It works signed out.** Videos live in this browser until there is an account to
 *     put them in, then they move across.
 *   - **It converses.** No forms. The assistant asks only what it genuinely needs, and
 *     builds as soon as it has enough.
 */

/**
 * A sentence that ends, so the next one can start.
 *
 * The director's reason for its own direction is written by a model and arrives with a
 * full stop about half the time. Dropped straight into the handover line, the half
 * without one produced "...the step-by-step workflow that the brief highlights Tell me
 * what to change and I will" — two sentences fused at the seam, which reads as a
 * glitch in exactly the message that is meant to sound deliberate.
 */
const endStop = (text: string): string => {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [collapsed, setCollapsed] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>(() => loadLocal());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>('new');

  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(() => remembered());
  /*
   * Whether the editor opens with its panel out.
   *
   * There are two ways into a video and they want opposite things. Arriving from the
   * conversation, the person was mid-sentence with the assistant a moment ago and the
   * thread that produced the film is the obvious next thing — hiding it would throw
   * away the conversation at the exact moment it became useful. Arriving from
   * Projects, they came to watch something they already made, and an empty "tell me
   * what to change" box taking a third of the screen is in the way.
   */
  const [openWithPanel, setOpenWithPanel] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  /** Shown once, right after signing up, and never again. */
  const [onboarding, setOnboarding] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  /** What the assistant is about to make, waiting for a yes. */
  const [pending, setPending] = useState<Pending | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(loadPreferences);
  const [lastOptions, setLastOptions] = useState<PromptOptions>(() => {
    const saved = loadPreferences();
    return { format: saved.format, length: saved.length };
  });

  const [busy, setBusy] = useState(false);
  /** How far the build has actually got, for the page that shows it happening. */
  const [buildStage, setBuildStage] = useState<BuildStage>('reading');
  /**
   * What the director said about its own choice of direction.
   *
   * Held here rather than read off the finished video, because the point of it is to be
   * readable *while* the build is still running — the moment the plan lands and before
   * the editor opens.
   */
  const [buildDirection, setBuildDirection] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportState, setExportState] = useState<ExportState>({ status: 'idle' });

  /**
   * The editing conversation, kept per video.
   *
   * Opening a different video must show that video's history, not the last one's — the
   * thread is part of the work, not part of the screen.
   */
  const [editThreads, setEditThreads] = useState<Record<string, EditMessage[]>>({});

  // Preferences are workspace settings, not account data, so they live in this browser.
  useEffect(() => {
    savePreferences(preferences);
    // Reduced motion is applied as an attribute so CSS can switch off every transition
    // in one rule rather than each component checking a prop.
    document.documentElement.dataset.motion = preferences.reduceMotion ? 'reduced' : 'full';
  }, [preferences]);

  // Theme goes on <html> so the variables cascade to everything, modals included.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* private browsing can block storage; the theme just will not persist */
    }
  }, [theme]);

  // Anything not yet in an account is kept in this browser.
  useEffect(() => {
    if (!user) saveLocal(videos.filter((v) => v.local));
  }, [videos, user]);

  // Remember which brand is in use between visits.
  useEffect(() => {
    try {
      if (activeBrandId) localStorage.setItem(ACTIVE_BRAND_KEY, activeBrandId);
      else localStorage.removeItem(ACTIVE_BRAND_KEY);
    } catch {
      /* storage can be blocked; the choice just will not persist */
    }
  }, [activeBrandId]);

  // Load brand kits whenever somebody signs in.
  useEffect(() => {
    if (!user) {
      setBrands([]);
      return;
    }
    let cancelled = false;
    api
      .listBrands()
      .then((list) => {
        if (cancelled) return;
        setBrands(list);
        // A remembered brand that has since been deleted must not stay selected.
        setActiveBrandId((current) =>
          current && list.some((b) => b.id === current)
            ? current
            : (list[0]?.id ?? null),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user]);

  const report = useCallback((e: unknown) => {
    setError(
      e instanceof ApiOffline
        ? 'Cannot reach the server. Start it with:  npm run server'
        : e instanceof Error
          ? e.message
          : 'Something went wrong.',
    );
  }, []);

  /* ---------- sign-in, and carrying work across ---------- */

  const adoptLocalVideos = useCallback(async (signedIn: User) => {
    const local = loadLocal();
    try {
      const saved = await api.listVideos();

      // Work done signed out moves into the account rather than being discarded — the
      // whole reason it was acceptable to let someone start without one.
      const migrated: Video[] = [];
      for (const video of local) {
        try {
          migrated.push(await api.saveVideo(video.spec, video.prompt));
        } catch {
          /* one failed migration should not lose the rest */
        }
      }

      if (migrated.length > 0) clearLocal();
      setVideos([...migrated, ...saved]);
    } catch {
      setVideos(local);
    }
    setUser(signedIn);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((found) => {
        if (cancelled || !found) return;
        void adoptLocalVideos(found);
      })
      .catch((e) => {
        if (!cancelled && e instanceof ApiOffline) {
          setError('Cannot reach the server. Start it with:  npm run server');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [adoptLocalVideos]);

  /*
   * What the build page shows.
   *
   * Three of the stages happen inside a single API call, so there is nothing to observe
   * between them — those walk forward on a schedule. Any stage the pipeline genuinely
   * reports overrides the walk immediately, so the page can run ahead of itself but never
   * behind.
   */
  const shownStage = useBuildStages(view === 'building', buildStage);

  /* ---------- the conversation ---------- */

  const send = useCallback(
    async (text: string, chosen: PromptOptions) => {
      setError(null);
      setPending(null);
      setLastOptions(chosen);

      const history: ChatMessage[] = [...messages, { role: 'user', content: text }];
      setMessages([...history, { role: 'assistant', content: '', thinking: true }]);
      setBusy(true);

      try {
        /*
         * Never answer faster than it takes to have thought about it.
         *
         * A reply that lands in 200ms reads as a lookup, not as consideration — and when
         * the same assistant sometimes takes four seconds and sometimes none, the fast
         * answers feel cheaper than the slow ones even when they are better. A floor
         * costs nothing on a slow call, because the wait has already passed, and it only
         * ever adds time to a call that had nothing to wait for.
         */
        const thoughtFor = new Promise((done) => setTimeout(done, 800));

        const [result] = await Promise.all([
          api.chat(
            history.map(({ role, content }) => ({ role, content })),
            {
              format: chosen.format,
              length: chosen.length,
              brandId: activeBrandId ?? undefined,
            },
          ),
          thoughtFor,
        ]);

        // Replace the thinking bubble with the real reply.
        setMessages([...history, { role: 'assistant', content: result.reply }]);

        // Ready, but waiting for a yes. Catching a misunderstanding before the render
        // is far cheaper than after it.
        if (result.awaitingConfirm && result.brief) {
          setPending({
            summary: result.summary ?? 'A short video from what you described.',
            plan: result.plan,
            brief: result.brief,
            brand: result.brand,
          });
        }
      } catch (e) {
        setMessages(history);
        report(e);
      } finally {
        setBusy(false);
      }
    },
    [messages, activeBrandId, report],
  );

  /** They said go. Build it. */
  const confirm = useCallback(async () => {
    if (!pending) return;

    setBusy(true);
    setError(null);

    /*
     * Go to the build page before the work starts, not after it finishes.
     *
     * Pressing "Make it" used to sit on the chat for several seconds and then drop you
     * into an editor with a finished video in it. The same video, delivered with no
     * visible work, reads as a template being filled — which is the one impression this
     * product cannot afford, because the work genuinely is being done.
     */
    setBuildStage('reading');
    setBuildDirection(null);
    setView('building');

    /*
     * A floor on how briefly the making screen can appear.
     *
     * The plan usually takes several seconds, so this changes nothing most of the time.
     * But when it comes back fast the old behaviour was a hard cut from the chat into a
     * finished editor, which reads as the page glitching rather than as a video being
     * made — the thing he kept describing as "so quick".
     *
     * A floor, never a ceiling: it is awaited alongside the real work rather than after
     * it, so a slow build is never made slower.
     */
    const floor = new Promise<void>((resolve) => setTimeout(resolve, 3000));

    try {
      const result = await api.chat([], {
        format: lastOptions.format,
        length: lastOptions.length,
        brandId: activeBrandId ?? undefined,
        confirmed: true,
        brief: pending.brief,
      });

      if (!result.spec) throw new Error('Nothing came back. Try again.');

      // The plan is real now — everything up to composing has actually happened.
      setBuildStage('composing');
      // And the direction it chose can stop being a generic placeholder.
      if (result.spec.styleWhy) setBuildDirection(result.spec.styleWhy);

      const history = messages;
      const prompt = history.map((m) => m.content).join('\n');
      const video = user
        ? await api.saveVideo(result.spec, prompt)
        : makeLocalVideo(result.spec, prompt);

      // Everything is ready; wait out whatever is left of the floor before handing over.
      await floor;

      setVideos((list) => [video, ...list]);
      setActiveId(video.id);
      setOpenWithPanel(true);
      setView('video');

      /*
       * The conversation follows the video into the editor.
       *
       * It used to stop dead here: the chat that produced the video lived in one piece
       * of state, the editor's chat lived in another, and making a video threw the first
       * one away. Everything the person had explained was gone, and reopening the video
       * from the sidebar showed an empty panel — so the only way back to their own words
       * was to remember them.
       *
       * They are one conversation, so they are now one thread. The editor opens on the
       * whole history: what was asked for, what was agreed, and every change since.
       */
      setEditThreads((threads) => ({
        ...threads,
        [video.id]: [
          ...history.map(({ role, content }) => ({ role, content })),
          {
            role: 'assistant' as const,
            /*
             * The first message says what was decided, not just that something happened.
             *
             * The build page shows the direction while the plan is landing, and then it
             * is gone — the editor opens a moment later and the decision goes with it.
             * Saying it here puts it somewhere permanent, in the thread the person is
             * about to reply in, which is also where they would push back on it. A
             * choice you cannot see is a choice you cannot argue with.
             */
            content: result.spec!.styleWhy
              ? `Made it — "${result.spec!.title}". ${endStop(result.spec!.styleWhy)} Tell me what to change and I will.`
              : `Made it — "${result.spec!.title}". Tell me what to change and I will.`,
          },
        ],
      }));

      // A fresh slate for the *next* video, now that this one keeps its own history.
      setMessages([]);
      setPending(null);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }, [pending, lastOptions, activeBrandId, messages, user, report]);

  /* ---------- editing ---------- */

  const saveTimer = useRef<number | null>(null);

  /**
   * An edit from the inspector or timeline.
   *
   * The screen updates immediately and the save is debounced, because a duration slider
   * fires dozens of times a second and each one would otherwise be a request.
   */
  const changeSpec = useCallback(
    (spec: VideoSpec) => {
      if (!activeId) return;

      setVideos((list) =>
        list.map((v) =>
          v.id === activeId ? { ...v, spec, title: spec.title, updatedAt: Date.now() } : v,
        ),
      );

      const video = videos.find((v) => v.id === activeId);
      if (!video || video.local) return;

      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        api.saveSpec(activeId, spec).catch(report);
      }, 700);
    },
    [activeId, videos, report],
  );

  /**
   * A change asked for in the workspace conversation.
   *
   * The current plan goes up, not the original prompt, so edits made along the way
   * survive. The reply comes back with the new plan in the same response, which is why
   * the video and the answer appear together rather than one lagging the other.
   */
  const askForEdit = useCallback(
    async (instruction: string) => {
      const video = videos.find((v) => v.id === activeId);
      if (!video) return;

      const id = video.id;
      const history = [
        ...(editThreads[id] ?? []),
        { role: 'user' as const, content: instruction },
      ];

      setEditThreads((t) => ({
        ...t,
        [id]: [...history, { role: 'assistant', content: '', thinking: true }],
      }));
      setBusy(true);
      setError(null);

      try {
        const result = await api.edit(
          video.spec,
          instruction,
          // The video's own brand, not whichever is currently selected — editing an old
          // client's video must not quietly repaint it in a new client's colours.
          video.spec.brandId ?? video.brandId ?? undefined,
          // Everything asked for so far, so "now even bolder" has a "bolder" to build
          // on rather than being read as a first request.
          (editThreads[id] ?? [])
            .filter((m) => !m.thinking)
            .map(({ role, content }) => ({ role, content })),
        );

        setEditThreads((t) => ({
          ...t,
          [id]: [...history, { role: 'assistant', content: result.reply }],
        }));

        const updated = {
          ...video,
          spec: result.spec,
          title: result.spec.title,
          updatedAt: Date.now(),
        };

        setVideos((list) => list.map((v) => (v.id === id ? updated : v)));
        if (!video.local) api.saveSpec(id, result.spec).catch(report);
      } catch (e) {
        // Drop the thinking bubble rather than leaving it spinning forever.
        setEditThreads((t) => ({ ...t, [id]: history }));
        report(e);
      } finally {
        setBusy(false);
      }
    },
    [activeId, videos, editThreads, report],
  );

  const remove = useCallback(
    async (id: string) => {
      // Take it off the screen first, then confirm with the server.
      const previous = videos;
      const target = videos.find((v) => v.id === id);

      setVideos((list) => list.filter((v) => v.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setView('new');
      }

      if (target?.local) return;

      try {
        await api.deleteVideo(id);
      } catch (e) {
        setVideos(previous); // put it back — the delete did not actually happen
        report(e);
      }
    },
    [videos, activeId, report],
  );

  /* ---------- exporting ---------- */

  const runExport = useCallback(async () => {
    const video = videos.find((v) => v.id === activeId);
    if (!video) return;

    setExportState({ status: 'rendering', done: 0, total: 1 });

    try {
      const { jobId } = await api.startRender(video.spec);

      // Poll rather than hold a request open for a minute. Twice a second is enough to
      // look alive without hammering the server.
      const poll = async (): Promise<void> => {
        const status = await api.renderStatus(jobId);

        if (status.status === 'rendering') {
          setExportState({ status: 'rendering', done: status.done, total: status.total });
          await new Promise((r) => setTimeout(r, 500));
          return poll();
        }

        if (status.status === 'error') {
          setExportState({ status: 'error', message: status.error ?? 'Render failed.' });
          return;
        }

        download(await api.renderFile(jobId), status.filename);
        setExportState({ status: 'done', filename: status.filename });
      };

      await poll();
    } catch (e) {
      setExportState({
        status: 'error',
        message:
          e instanceof ApiOffline
            ? 'Cannot reach the server. Start it with:  npm run server'
            : e instanceof Error
              ? e.message
              : 'Something went wrong.',
      });
    }
  }, [activeId, videos]);

  /* ---------- account ---------- */

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* clearing local state matters more than the server acknowledging it */
    }
    setUser(null);
    setVideos([]);
    setActiveId(null);
    setView('new');
    setSettingsOpen(false);
  }, []);

  const startNew = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setPending(null);
    setView('new');
  }, []);

  /** Rename a video from the sidebar or the project list. */
  const rename = useCallback(
    (id: string, title: string) => {
      const video = videos.find((v) => v.id === id);
      if (!video) return;

      const spec = { ...video.spec, title };
      setVideos((list) =>
        list.map((v) => (v.id === id ? { ...v, title, spec, updatedAt: Date.now() } : v)),
      );

      if (!video.local) api.saveSpec(id, spec).catch(report);
    },
    [videos, report],
  );

  const active = videos.find((v) => v.id === activeId) ?? null;

  // The tab always says which screen you are on, most specific part first.
  useTitle(
    view === 'video' && active
      ? active.title
      : view === 'projects'
        ? 'Projects'
        : view === 'brands'
          ? 'Brands'
          : undefined,
  );

  return (
    <div className="app">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        view={view}
        onNew={startNew}
        onProjects={() => setView('projects')}
        onBrands={() => (user ? setView('brands') : setAuthOpen(true))}
        brandCount={brands.length}
        onRename={rename}
        videos={videos}
        activeId={active?.id}
        onOpen={(id) => {
          setActiveId(id);
          setOpenWithPanel(false);
          setView('video');
        }}
        onDelete={remove}
        user={user}
        onSignIn={() => setAuthOpen(true)}
        onSignOut={signOut}
        onSettings={() => setSettingsOpen(true)}
      />

      <main className="app__main">
        {view === 'building' ? (
          <Building
            stage={shownStage}
            direction={buildDirection ?? undefined}
            onCancel={() => {
              setView('new');
              setBusy(false);
            }}
          />
        ) : view === 'video' && active ? (
          <Workspace
            openPanel={openWithPanel}
            video={active}
            busy={busy}
            messages={editThreads[active.id] ?? []}
            onSpecChange={changeSpec}
            onAsk={askForEdit}
            onExport={runExport}
            exportState={exportState}
            onDismissExport={() => setExportState({ status: 'idle' })}
            autoplay={preferences.autoplay}
            recents={videos.slice(0, 10)}
            onOpenVideo={setActiveId}
            onNew={startNew}
            onBack={() => {
              setActiveId(null);
              setView('projects');
            }}
          />
        ) : view === 'projects' ? (
          <Projects
            videos={videos}
            brands={brands}
            onOpen={(id) => {
              setActiveId(id);
              setOpenWithPanel(false);
              setView('video');
            }}
            onDelete={remove}
            onNew={startNew}
          />
        ) : view === 'brands' ? (
          <BrandPage
            /* How many videos each kit has been used for — the one number on a brand
               card that says anything about the brand rather than about its colours. */
            counts={videos.reduce<Record<string, number>>((n, v) => {
              const id = v.spec.brandId ?? v.brandId;
              if (id) n[id] = (n[id] ?? 0) + 1;
              return n;
            }, {})}
            brands={brands}
            activeId={activeBrandId}
            onChange={setBrands}
            onSelect={setActiveBrandId}
            onImport={() => setImportOpen(true)}
          />
        ) : (
          <Chat
            userName={user?.name}
            messages={messages}
            busy={busy}
            onSend={send}
            brands={brands}
            activeBrandId={activeBrandId}
            onSelectBrand={(id) => (user ? setActiveBrandId(id) : setAuthOpen(true))}
            onCreateBrand={() => (user ? setImportOpen(true) : setAuthOpen(true))}
            pending={pending}
            onConfirm={confirm}
            onCancelPending={() => setPending(null)}
          />
        )}

        {error && (
          <div className="banner" role="status">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss">
              ✕
            </button>
          </div>
        )}
      </main>

      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onDone={(signedIn, isNew) => {
            setAuthOpen(false);
            void adoptLocalVideos(signedIn);
            // Straight into brand setup for somebody new. Asking for a website while
            // they are still curious works; asking three screens later does not.
            if (isNew) {
              setOnboarding(true);
              setImportOpen(true);
            }
          }}
        />
      )}

      {importOpen && (
        <ImportBrandModal
          canSkip={onboarding}
          onSkip={() => {
            setImportOpen(false);
            setOnboarding(false);
          }}
          onClose={() => {
            setImportOpen(false);
            setOnboarding(false);
          }}
          onCreated={(brand) => {
            setBrands((list) => [brand, ...list]);
            setActiveBrandId(brand.id);
            setImportOpen(false);
            setView(onboarding ? 'new' : 'brands');
            setOnboarding(false);
          }}
        />
      )}

      {settingsOpen && user && (
        <SettingsModal
          user={user}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          brands={brands}
          activeBrandId={activeBrandId}
          onSelectBrand={setActiveBrandId}
          onManageBrands={() => {
            setSettingsOpen(false);
            setView('brands');
          }}
          preferences={preferences}
          onPreferences={setPreferences}
          onClose={() => setSettingsOpen(false)}
          onUpdated={setUser}
          onSignOut={signOut}
          onDeleted={() => {
            setUser(null);
            setVideos([]);
            setActiveId(null);
            setView('new');
            setSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
}

/** The brand chosen last time, if the browser let us keep it. */
const remembered = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_BRAND_KEY);
  } catch {
    return null;
  }
};

/** Remember the last choice; otherwise follow the operating system. */
const getInitialTheme = (): Theme => {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage can be blocked; fall through to the system preference */
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};
