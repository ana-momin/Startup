import { useCallback, useEffect, useRef, useState } from 'react';
import type { Tone } from '@motion/planner';
import { Icon } from '@/components/Icon';
import { api, assetUrl } from '@/lib/api';
import { BrandMark } from '@/components/BrandMark';
import type { Brand } from '@/lib/api';
import { readLogoFile } from '@/lib/logo';
import './brand-page.css';

type Props = {
  brands: Brand[];
  activeId: string | null;
  onChange: (brands: Brand[]) => void;
  onSelect: (id: string | null) => void;
  onImport: () => void;
  /** How many videos each kit has been used for. */
  counts?: Record<string, number>;
};

/**
 * Brand kits.
 *
 * Everything we know about who a video is for. Laid out as a list of kits beside one
 * open editor, because somebody with five clients spends most of their time comparing
 * and switching rather than editing.
 *
 * The editor is grouped into three plain sections — how it looks, how it sounds, and
 * what it is called — so an eleven-field form reads as three short decisions.
 */
export const BrandPage = ({ brands, activeId, onChange, onSelect, onImport, counts }: Props) => {
  /*
   * Nothing is open until something is chosen.
   *
   * This used to default to the active kit, so arriving at the page always put one
   * brand's eleven-field form on screen — a decision made on your behalf about which
   * brand you had come to edit, right about half the time.
   */
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = brands.find((b) => b.id === editingId) ?? null;

  /*
   * Escape closes the drawer.
   *
   * A panel that covers the page needs a way out that does not require finding a
   * button, and Escape is the one people try first. Bound only while something is open
   * so it cannot swallow the key anywhere else on the page.
   */
  useEffect(() => {
    if (!editingId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingId]);

  const update = useCallback(
    (brand: Brand) => onChange(brands.map((b) => (b.id === brand.id ? brand : b))),
    [brands, onChange],
  );

  const remove = useCallback(
    async (id: string) => {
      onChange(brands.filter((b) => b.id !== id));
      if (activeId === id) onSelect(null);
      if (editingId === id) setEditingId(brands.find((b) => b.id !== id)?.id ?? null);
      await api.deleteBrand(id).catch(() => undefined);
    },
    [brands, activeId, editingId, onChange, onSelect],
  );

  const create = useCallback(async () => {
    const brand = await api.createBrand({ name: 'New brand', mode: 'dark' });
    onChange([brand, ...brands]);
    setEditingId(brand.id);
  }, [brands, onChange]);

  return (
    <div className="brands">
      <header className="brands__head">
        <div>
          <h1>Brand kits</h1>
          <span>
            {brands.length === 0
              ? 'Your colours, your logo, your voice — applied to every video'
              : `${brands.length} kit${brands.length === 1 ? '' : 's'}`}
          </span>
        </div>
        <div className="brands__head-actions">
          <button className="btn btn--outline" onClick={create}>
            <Icon name="plus" size={15} />
            Blank
          </button>
          <button className="btn btn--primary" onClick={onImport}>
            <Icon name="sparkle" size={15} />
            From a website
          </button>
        </div>
      </header>

      {brands.length === 0 ? (
        <div className="brands__empty">
          <span className="brands__empty-icon">
            <Icon name="brand" size={24} />
          </span>
          <h2>No brand kits yet</h2>
          <p>
            A brand kit is how your videos come out in your colours, with your logo, in
            your voice — without you asking for it every time.
          </p>
          <div className="brands__empty-actions">
            <button className="btn btn--primary" onClick={onImport}>
              <Icon name="sparkle" size={15} />
              Build one from your website
            </button>
            <button className="btn btn--ghost" onClick={create}>
              Start blank
            </button>
          </div>
        </div>
      ) : (
        <>
          {/*
            A shelf of kits, not a sidebar of them.

            The list was 264px wide with an editor permanently open beside it, so every
            kit was reduced to a line of truncated text and the screen always showed one
            brand's form whether or not anybody had asked for it. A kit is a thing you
            recognise — a mark, a name, a colour, a sentence about who it is for — and
            none of that survives a 264px row. Cards give each one room to be
            recognised, and the editor arrives only when one is chosen.
          */}
          <ul className="brands__grid">
            {brands.map((brand) => (
              <li key={brand.id}>
                <button className="bcard" onClick={() => setEditingId(brand.id)}>
                  <span className="bcard__top">
                    <BrandMark
                      name={brand.name}
                      logoId={brand.logoId}
                      color={brand.palette.accent}
                      mode={brand.mode}
                      size={46}
                    />
                    <span className="bcard__ident">
                      <span className="bcard__name">
                        {brand.name}
                        {brand.id === activeId && (
                          <span className="bcard__badge" title="Used for new videos">
                            <Icon name="check" size={10} />
                            Default
                          </span>
                        )}
                      </span>
                      <span className="bcard__sub">
                        {brand.tone ? TONE_LABEL[brand.tone] : 'No tone set'}
                        {brand.website ? ` · ${tidyHost(brand.website)}` : ''}
                      </span>
                    </span>
                  </span>

                  {/*
                    The sentence that says who this is for.

                    The one piece of a kit that cannot be inferred from looking at it,
                    and the thing that tells two similar-looking brands apart. Clamped to
                    two lines so a long description cannot make one card taller than the
                    rest and break the row.
                  */}
                  <span className="bcard__about">
                    {brand.description?.trim() || 'No description yet.'}
                  </span>

                  <span className="bcard__foot">
                    <span className="bcard__palette" aria-hidden="true">
                      <i style={{ background: brand.palette.accent }} />
                      <i style={{ background: brand.palette.accentSoft }} />
                      <i style={{ background: brand.palette.muted }} />
                    </span>
                    <span className="bcard__count">
                      <Icon name="video" size={13} />
                      {counts?.[brand.id] ?? 0}
                      {(counts?.[brand.id] ?? 0) === 1 ? ' video' : ' videos'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/*
            The kit itself, as a panel over the shelf.

            A drawer rather than a page: you came here to change one thing about one
            brand, and losing the shelf to do it means losing your place among the
            others. It covers rather than reflows, so nothing moves underneath while it
            is open.
          */}
          {editing && (
            <div className="drawer" role="dialog" aria-modal="true">
              <button
                className="drawer__scrim"
                onClick={() => setEditingId(null)}
                aria-label="Close"
                tabIndex={-1}
              />
              <aside className="drawer__panel">
                <button
                  className="drawer__close"
                  onClick={() => setEditingId(null)}
                  title="Close (Esc)"
                >
                  <Icon name="close" size={16} />
                </button>
                <BrandEditor
                  key={editing.id}
                  brand={editing}
                  isActive={editing.id === activeId}
                  onSaved={update}
                  onDelete={() => {
                    remove(editing.id);
                    setEditingId(null);
                  }}
                  onUse={() => onSelect(editing.id)}
                />
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ---------- the editor ---------- */

const TONES: { id: Tone; label: string; hint: string }[] = [
  { id: 'clean', label: 'Clean', hint: 'Calm, centred' },
  { id: 'bold', label: 'Bold', hint: 'Heavy, hard cuts' },
  { id: 'editorial', label: 'Editorial', hint: 'Left, considered' },
  { id: 'kinetic', label: 'Kinetic', hint: 'Big and fast' },
];

const BrandEditor = ({
  brand,
  isActive,
  onSaved,
  onDelete,
  onUse,
}: {
  brand: Brand;
  isActive: boolean;
  onSaved: (brand: Brand) => void;
  onDelete: () => void;
  onUse: () => void;
}) => {
  const [draft, setDraft] = useState(brand);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | null>(null);

  /*
   * Nothing is saved until something is changed.
   *
   * The debounce below runs on mount like any other effect, so simply OPENING a kit
   * wrote it back unchanged. That was invisible while the editor was always on screen
   * beside a sidebar; with a shelf of cards ordered by when each was last touched, it
   * became obvious — open a brand, close it, and the cards rearrange themselves. Worse,
   * the default kit is whichever comes first when nothing is remembered, so looking at
   * a brand could quietly make it the default.
   *
   * A flag rather than comparing draft to brand: the draft is replaced wholesale by
   * every edit, so an equality check would have to be deep, and "has anybody typed
   * anything" is the question actually being asked.
   */
  const dirty = useRef(false);


  // Saving is debounced: a colour picker fires on every pixel of drag, and each one
  // would otherwise be a request.
  useEffect(() => {
    if (!dirty.current) return;
    if (timer.current) window.clearTimeout(timer.current);

    timer.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        onSaved(
          await api.updateBrand(brand.id, {
            name: draft.name,
            description: draft.description,
            audience: draft.audience,
            voice: draft.voice,
            avoid: draft.avoid,
            color: draft.color,
            mode: draft.mode,
            tone: draft.tone,
            website: draft.website,
            logoId: draft.logoId,
          }),
        );
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save.');
      } finally {
        setSaving(false);
      }
    }, 600);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // brand.id is stable for this component thanks to the key on it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const set = <K extends keyof Brand>(key: K, value: Brand[K]) => {
    dirty.current = true;
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const pickLogo = async (file: File) => {
    setError(null);
    try {
      const logo = await readLogoFile(file);
      const { assetId } = await api.uploadLogo(logo.dataUrl, logo.width, logo.height);

      // Uploading a logo is an edit, and it does not go through `set`.
      dirty.current = true;

      setDraft((d) => ({
        ...d,
        logoId: assetId,
        // A logo usually carries the brand colour. Offering it saves hunting for a hex
        // code they may not even know.
        color: d.color ?? logo.color,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that image.');
    }
  };

  return (
    <section className="editor-card">
      {/* ---- header ---- */}
      <div className="editor-card__head">
        <input
          className="editor-card__name"
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Brand name"
          maxLength={60}
        />
        <span className={`editor-card__status ${saving ? 'is-saving' : ''}`}>
          {saving ? 'Saving' : 'Saved'}
        </span>
        <button
          className={`btn ${isActive ? 'btn--outline' : 'btn--primary'}`}
          onClick={onUse}
          disabled={isActive}
        >
          {isActive ? (
            <>
              <Icon name="check" size={14} />
              In use
            </>
          ) : (
            'Use this'
          )}
        </button>
      </div>

      <div className="editor-card__scroll">
        {/* ---- preview ---- */}
        <div className="preview" style={{ background: brand.palette.bg }}>
          {brand.logoId ? (
            // crossOrigin so this load shares the brand mark's cache entry rather than
            // poisoning it with a copy that carries no CORS header.
            <img
              className="preview__logo"
              src={assetUrl(brand.logoId)}
              crossOrigin="anonymous"
              alt=""
            />
          ) : (
            <span className="preview__name" style={{ color: brand.palette.text }}>
              {draft.name || 'Your brand'}
            </span>
          )}
          <span className="preview__line" style={{ color: brand.palette.accent }}>
            Headline in your colour
          </span>
          <span className="preview__muted" style={{ color: brand.palette.muted }}>
            Supporting line, quieter
          </span>
        </div>

        {brand.paletteReport.adjusted && (
          <p className="note">
            <Icon name="sparkle" size={13} />
            <span>{brand.paletteReport.reason}</span>
          </p>
        )}

        {/* ---- look ---- */}
        <Group title="How it looks">
          <div className="row">
            <Field label="Brand colour" hint="Leave empty if your brand is black and white.">
              <div className="colour">
                <input
                  type="color"
                  value={draft.color ?? '#6C9BFF'}
                  onChange={(e) => set('color', e.target.value.toUpperCase())}
                />
                <input
                  className="input"
                  value={draft.color ?? ''}
                  placeholder="#6C9BFF"
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    if (v === '' || /^#[0-9a-fA-F]{0,6}$/.test(v)) {
                      set('color', v.length === 7 ? v.toUpperCase() : (v as Brand['color']));
                    }
                  }}
                />
                {draft.color && (
                  <button
                    className="colour__clear"
                    onClick={() => set('color', undefined)}
                    title="No brand colour"
                  >
                    <Icon name="close" size={13} />
                  </button>
                )}
              </div>
            </Field>

            <Field label="Backgrounds">
              <div className="segmented">
                {(['dark', 'light'] as const).map((mode) => (
                  <button
                    key={mode}
                    className={draft.mode === mode ? 'is-active' : ''}
                    onClick={() => set('mode', mode)}
                  >
                    <Icon name={mode === 'dark' ? 'moon' : 'sun'} size={14} />
                    {mode === 'dark' ? 'Dark' : 'Light'}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="Logo" hint="PNG, SVG or JPG up to 2 MB. We read the colour out of it too.">
            <div className="logo">
              {draft.logoId ? (
                /*
                 * The brand mark, not a raw image on the brand's background.
                 *
                 * This showed the logo on `palette.bg`, which for a dark brand means a
                 * dark logo on a dark square — the exact invisible-logo case the mark
                 * exists to solve, left in the one screen whose job is to show you your
                 * logo. The mark measures the artwork and picks a plate it can be seen
                 * against.
                 */
                <BrandMark
                  name={draft.name || brand.name}
                  logoId={draft.logoId}
                  color={draft.color ?? brand.palette.accent}
                  mode={draft.mode}
                  size={56}
                />
              ) : (
                <div className="logo__empty">
                  <Icon name="image" size={18} />
                </div>
              )}

              <div className="logo__actions">
                <button className="btn btn--outline" onClick={() => fileRef.current?.click()}>
                  {draft.logoId ? 'Replace' : 'Upload'}
                </button>
                {draft.logoId && (
                  <button className="btn btn--ghost" onClick={() => set('logoId', undefined)}>
                    Remove
                  </button>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void pickLogo(file);
                  e.target.value = '';
                }}
              />
            </div>
          </Field>

          <Field label="Default look" hint="Leave all off to let each video choose what suits it.">
            <div className="tones">
              {TONES.map((tone) => (
                <button
                  key={tone.id}
                  className={`tones__item ${draft.tone === tone.id ? 'is-active' : ''}`}
                  onClick={() => set('tone', draft.tone === tone.id ? undefined : tone.id)}
                >
                  <strong>{tone.label}</strong>
                  <span>{tone.hint}</span>
                </button>
              ))}
            </div>
          </Field>
        </Group>

        {/* ---- voice ---- */}
        <Group title="How it sounds" note="This is what the copy is written from.">
          <Field label="What you do">
            <textarea
              className="input"
              rows={2}
              value={draft.description ?? ''}
              placeholder="A calm note-taking app for people who think in writing."
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>

          <div className="row">
            <Field label="Who you talk to">
              <input
                className="input"
                value={draft.audience ?? ''}
                placeholder="Writers and researchers"
                onChange={(e) => set('audience', e.target.value)}
              />
            </Field>

            <Field label="How you sound">
              <input
                className="input"
                value={draft.voice ?? ''}
                placeholder="Plain and quiet. No exclamation marks."
                onChange={(e) => set('voice', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Never say" hint="Words and claims that are off-limits. These are obeyed literally.">
            <input
              className="input"
              value={draft.avoid ?? ''}
              placeholder="hustle, 10x, game-changing"
              onChange={(e) => set('avoid', e.target.value)}
            />
          </Field>

          <Field label="Website">
            <input
              className="input"
              value={draft.website ?? ''}
              placeholder="yourcompany.com"
              onChange={(e) => set('website', e.target.value)}
            />
          </Field>
        </Group>

        {error && <p className="error">{error}</p>}

        {/* ---- danger ----
            Its own framed block at the very bottom, well away from everything else.
            A delete sitting beside a save is how people delete things by accident. */}
        <div className="danger">
          <div className="danger__head">
            <strong>Delete this brand kit</strong>
            <span>
              Videos already made with it keep their colours. New ones will not use it.
            </span>
          </div>

          {confirmingDelete ? (
            <div className="danger__confirm">
              <button className="btn btn--outline" onClick={() => setConfirmingDelete(false)}>
                Keep it
              </button>
              <button className="btn danger__go" onClick={onDelete}>
                Delete {draft.name}
              </button>
            </div>
          ) : (
            <button className="btn danger__trigger" onClick={() => setConfirmingDelete(true)}>
              <Icon name="trash" size={14} />
              Delete kit
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

/* ---------- small pieces ---------- */

const Group = ({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) => (
  <div className="group">
    <div className="group__head">
      <h3>{title}</h3>
      {note && <p>{note}</p>}
    </div>
    <div className="group__body">{children}</div>
  </div>
);

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <label className="field">
    <span className="field__label">{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

/**
 * Tone, in words a person would use.
 *
 * The stored value is a key like "editorial"; on a card it should read as the decision
 * it represents, not as the name of the option.
 */
const TONE_LABEL: Record<string, string> = {
  clean: 'Calm and clear',
  bold: 'Bold and direct',
  editorial: 'Considered, editorial',
  kinetic: 'Fast and loud',
};

/** Just the domain. A full URL on a card is mostly punctuation. */
const tidyHost = (website: string): string =>
  website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '');
