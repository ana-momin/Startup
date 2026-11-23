import { useEffect, useRef, useState } from 'react';
import { BrandMark } from './BrandMark';
import type { FormatName, LengthPreference } from '@motion/planner';
import { Icon } from './Icon';
import './prompt-bar.css';

export type PromptOptions = {
  format: FormatName;
  length: LengthPreference;
};

export type BrandOption = {
  id: string;
  name: string;
  /** Their real logo, when the kit has one. */
  logoId?: string;
  palette: { accent: string; accentSoft?: string; bg?: string };
};

type PromptBarProps = {
  onSubmit: (prompt: string, options: PromptOptions) => void;
  placeholder?: string;
  busy?: boolean;
  autoFocus?: boolean;
  /** Brand kits available to make this video in. */
  brands?: BrandOption[];
  activeBrandId?: string | null;
  onSelectBrand?: (id: string | null) => void;
  onCreateBrand?: () => void;
};

const FORMATS: { id: FormatName; label: string; ratio: string }[] = [
  { id: 'landscape', label: 'Wide', ratio: '16:9' },
  { id: 'vertical', label: 'Vertical', ratio: '9:16' },
  { id: 'square', label: 'Square', ratio: '1:1' },
];

const LENGTHS: { id: LengthPreference; label: string; hint: string }[] = [
  { id: 'short', label: 'Short', hint: '~8s' },
  { id: 'standard', label: 'Standard', hint: '~15s' },
  { id: 'long', label: 'Long', hint: '~25s' },
];

type MenuName = 'brand' | 'format' | 'length';

/**
 * The prompt box.
 *
 * A plain rectangle with a thin border — the shape ChatGPT and Claude settled on
 * because it disappears and lets the writing be the thing.
 *
 * The controls underneath never hide. They used to vanish once a conversation started,
 * which meant typing "hi" silently dropped your brand and your format: settings
 * disappearing because you typed is never right, and it made the selection feel
 * untrustworthy even when it had been kept.
 */
export const PromptBar = ({
  onSubmit,
  placeholder = 'Describe the video you want…',
  busy = false,
  autoFocus = false,
  brands = [],
  activeBrandId,
  onSelectBrand,
  onCreateBrand,
}: PromptBarProps) => {
  const [value, setValue] = useState('');
  const [format, setFormat] = useState<FormatName>('landscape');
  const [length, setLength] = useState<LengthPreference>('standard');
  const [open, setOpen] = useState<MenuName | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Grow with the text instead of scrolling inside a fixed box.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 190)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  // Close on an outside click or Escape. Listening on the whole bar rather than each
  // menu means moving between menus does not flicker one shut and the next open.
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);

    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    onSubmit(trimmed, { format, length });
    setValue('');

    /*
     * Put the caret back when the send came from the button.
     *
     * This is not what fixed the focus bug — the `disabled` attribute on the textarea
     * was, and this call was powerless against it, because focus cannot be given to a
     * disabled element. It is kept for the one case it genuinely serves: clicking the
     * send button moves focus to the button, and the next thing anyone wants to do is
     * type again.
     *
     * Deferred a frame so it lands after the re-render rather than before it.
     */
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const activeFormat = FORMATS.find((f) => f.id === format)!;
  const activeLength = LENGTHS.find((l) => l.id === length)!;
  const activeBrand = brands.find((b) => b.id === activeBrandId) ?? null;

  const toggle = (menu: MenuName) => setOpen((current) => (current === menu ? null : menu));

  return (
    <div className="prompt" ref={barRef}>
      <textarea
        ref={textareaRef}
        className="prompt__input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        rows={1}
        spellCheck={false}
        /*
         * Never disabled — and this is the actual fix for the focus bug.
         *
         * It used to carry `disabled={busy}`. Pressing enter sets `busy`, which disabled
         * this element on the very next render, and a browser blurs a control the moment
         * it is disabled. Worse, `.focus()` on a disabled element silently does nothing,
         * which is exactly why re-focusing after submit *looked* like a fix and changed
         * nothing: by the time `busy` cleared, focus was long gone and nothing claimed
         * it back.
         *
         * Disabling it was never needed. Sending is already guarded — `submit()` returns
         * early while busy — so the only thing the attribute achieved was taking the
         * keyboard away from somebody mid-thought. Every chat tool worth copying lets you
         * keep typing while it answers.
         */
      />

      <div className="prompt__row">
        <div className="prompt__tools">
          {onSelectBrand && (
            <Picker
              open={open === 'brand'}
              onToggle={() => toggle('brand')}
              active={Boolean(activeBrand)}
              title="Brand kit"
              label={activeBrand?.name ?? 'Brand'}
              mark={activeBrand ? <BrandMark name={activeBrand.name} logoId={activeBrand.logoId} color={activeBrand.palette.accent} size={17} /> : undefined}
              icon="brand"
            >
              {brands.length === 0 && (
                <p className="menu__empty">No brand kits yet.</p>
              )}

              {brands.map((brand) => (
                <MenuItem
                  key={brand.id}
                  selected={brand.id === activeBrandId}
                  onClick={() => {
                    onSelectBrand(brand.id);
                    setOpen(null);
                  }}
                >
                  <BrandMark name={brand.name} logoId={brand.logoId} color={brand.palette.accent} size={20} />
                  <span className="menu__brand-name">{brand.name}</span>
                  <PaletteStrip palette={brand.palette} />
                </MenuItem>
              ))}

              {brands.length > 0 && (
                <MenuItem
                  selected={!activeBrandId}
                  onClick={() => {
                    onSelectBrand(null);
                    setOpen(null);
                  }}
                >
                  <span className="menu__swatch menu__swatch--none" />
                  No brand
                </MenuItem>
              )}

              {onCreateBrand && (
                <>
                  <span className="menu__rule" />
                  <MenuItem
                    onClick={() => {
                      onCreateBrand();
                      setOpen(null);
                    }}
                  >
                    <Icon name="plus" size={13} />
                    New brand kit
                  </MenuItem>
                </>
              )}
            </Picker>
          )}

          <Picker
            open={open === 'format'}
            onToggle={() => toggle('format')}
            title="Aspect ratio"
            label={activeFormat.ratio}
            icon="reframe"
          >
            {FORMATS.map((f) => (
              <MenuItem
                key={f.id}
                selected={f.id === format}
                onClick={() => {
                  setFormat(f.id);
                  setOpen(null);
                }}
              >
                {f.label}
                <em>{f.ratio}</em>
              </MenuItem>
            ))}
          </Picker>

          <Picker
            open={open === 'length'}
            onToggle={() => toggle('length')}
            title="Length"
            label={activeLength.label}
            icon="clock"
          >
            {LENGTHS.map((l) => (
              <MenuItem
                key={l.id}
                selected={l.id === length}
                onClick={() => {
                  setLength(l.id);
                  setOpen(null);
                }}
              >
                {l.label}
                <em>{l.hint}</em>
              </MenuItem>
            ))}
          </Picker>
        </div>

        <button
          className="prompt__send"
          onClick={submit}
          disabled={!value.trim() || busy}
          aria-label="Send"
          type="button"
        >
          {busy ? <span className="prompt__spinner" /> : <Icon name="arrowUp" size={17} />}
        </button>
      </div>
    </div>
  );
};

/* ---------- a labelled dropdown ---------- */

/**
 * The palette, as a strip.
 *
 * Three colours rather than one, because what makes a kit feel like a kit is seeing that
 * decisions were made *together*. It is also the fastest way to tell two brands apart in
 * a list when their logos are both small and dark.
 */
const PaletteStrip = ({ palette }: { palette: BrandOption['palette'] }) => (
  <span className="brand-strip" aria-hidden="true">
    <span style={{ background: palette.accent }} />
    <span style={{ background: palette.accentSoft ?? palette.accent }} />
    <span style={{ background: palette.bg ?? palette.accent }} />
  </span>
);

const Picker = ({
  open,
  onToggle,
  title,
  label,
  icon,
  mark,
  active,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  label: string;
  icon: 'brand' | 'reframe' | 'clock';
  /** Something richer than an icon, when the control has one to show. */
  mark?: React.ReactNode;
  active?: boolean;
  children: React.ReactNode;
}) => (
  <div className="picker">
    <button
      className={`picker__trigger ${active ? 'is-active' : ''} ${open ? 'is-open' : ''}`}
      onClick={onToggle}
      title={title}
      type="button"
    >
      {mark ?? <Icon name={icon} size={15} />}
      <span className="picker__label">{label}</span>
    </button>

    {open && <div className="menu">{children}</div>}
  </div>
);

const MenuItem = ({
  selected,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    className={`menu__item ${selected ? 'is-selected' : ''}`}
    onClick={onClick}
    type="button"
  >
    <span className="menu__text">{children}</span>
    {selected && <Icon name="check" size={14} />}
  </button>
);
