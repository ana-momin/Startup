import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { BrandMark } from './BrandMark';
import { api } from '@/lib/api';
import type { Brand, BrandDraft } from '@/lib/api';
import './import-brand.css';

type Props = {
  onClose: () => void;
  onCreated: (brand: Brand) => void;
  /** Shown during onboarding, where skipping has to be obviously allowed. */
  canSkip?: boolean;
  onSkip?: () => void;
};

/**
 * Building a brand kit from a website.
 *
 * The fastest onboarding is the one nobody types into. Their site already contains their
 * name, their colour, their logo and a description somebody was paid to write.
 *
 * Three screens, and each had its own problem worth naming:
 *
 *   ASK was a field, a button, and then two bare underlined words — "set it up by hand"
 *   and "I'll do this later" — which read as footnotes rather than choices. They are two
 *   of the three things a person can do here and they looked like small print.
 *
 *   READING was the word "Reading…" on a disabled button for ten seconds. Nothing moved,
 *   nothing said what was happening, and ten seconds of that is long enough to wonder
 *   whether it has hung.
 *
 *   CONFIRM showed a name, "Logo: Found" and an About line — three label-and-value rows —
 *   while the scraper was also handing us their headline, their call to action and their
 *   site's light/dark mode, all of which were discarded before they reached the screen.
 *   The screen whose entire job is "have we understood your site?" was showing a third
 *   of what we understood.
 */
export const ImportBrandModal = ({ onClose, onCreated, canSkip, onSkip }: Props) => {
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'ask' | 'reading' | 'confirm'>('ask');
  const [found, setFound] = useState<BrandDraft | null>(null);
  const [chosen, setChosen] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const read = async () => {
    const value = website.trim();
    if (!value) return;

    setState('reading');
    setError(null);
    try {
      const result = await api.importWebsite(value);
      setFound(result);
      setChosen(result.draft.color);
      setState('confirm');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that site.');
      setState('ask');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      onCreated(
        await api.createBrand({
          name: found?.draft.name ?? 'My brand',
          description: found?.draft.description,
          color: chosen,
          mode: found?.draft.mode ?? 'dark',
          website: found?.draft.website,
          logoId: found?.draft.logoId,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that brand.');
      setSaving(false);
    }
  };

  /** Start a blank brand instead — for anyone without a site, or who would rather type. */
  const startBlank = async () => {
    setSaving(true);
    try {
      onCreated(await api.createBrand({ name: 'My brand', mode: 'dark' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create that brand.');
      setSaving(false);
    }
  };

  /** The palette for whichever colour is currently selected. */
  const preview =
    found?.colorOptions.find((o) => o.color === chosen)?.palette ?? found?.palette;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="import"
        role="dialog"
        aria-modal="true"
        aria-label="Build a brand kit"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="import__close icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" size={16} />
        </button>

        {state === 'reading' ? (
          <Reading website={website} />
        ) : state === 'ask' ? (
          <>
            <div className="import__head">
              <span className="import__icon">
                <Icon name="brand" size={19} />
              </span>
              <h2>Set up your brand</h2>
              <p>
                Give us your website and we'll read your logo, colours and the way you
                describe yourselves straight off it.
              </p>
            </div>

            <div className="import__entry">
              <span className="import__prefix">https://</span>
              <input
                className="import__input"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && read()}
                placeholder="yourcompany.com"
                autoFocus
                spellCheck={false}
              />
            </div>

            <button
              className="btn btn--primary import__go"
              onClick={read}
              disabled={!website.trim()}
            >
              <Icon name="sparkle" size={14} />
              Read my site
            </button>

            {error && <p className="import__error">{error}</p>}

            {/*
              The other two things you can do, as actual buttons.

              These were underlined words on their own lines, which is the visual language
              of a footnote — so two of the three real choices on this screen looked like
              small print you were not supposed to need. A divider separates them from the
              recommended path without demoting them to text.
            */}
            <div className="import__or">
              <span>or</span>
            </div>

            <div className="import__choices">
              <button className="import__choice" onClick={startBlank} disabled={saving}>
                <span className="import__choice-icon">
                  <Icon name="edit" size={15} />
                </span>
                <span className="import__choice-text">
                  <strong>Set it up by hand</strong>
                  <span>Pick your own name, colour and logo</span>
                </span>
                <Icon name="chevronRight" size={14} />
              </button>

              {canSkip && (
                <button className="import__choice" onClick={onSkip ?? onClose}>
                  <span className="import__choice-icon">
                    <Icon name="clock" size={15} />
                  </span>
                  <span className="import__choice-text">
                    <strong>I'll do this later</strong>
                    <span>Videos will use neutral colours for now</span>
                  </span>
                  <Icon name="chevronRight" size={14} />
                </button>
              )}
            </div>
          </>
        ) : (
          found &&
          preview && (
            <Confirm
              found={found}
              preview={preview}
              chosen={chosen}
              onChoose={setChosen}
              onBack={() => setState('ask')}
              onSave={save}
              saving={saving}
              error={error}
            />
          )
        )}
      </div>
    </div>
  );
};

/* ================= reading ================= */

/**
 * The stages the scrape really goes through.
 *
 * The work happens inside one request with no progress events, so these advance on a
 * timer — and the timings are the measured shape of a real scrape rather than a guess:
 * opening a headless browser and waiting for the page is most of it, and the parsing
 * afterwards is fast. The last stage does NOT complete on its own. It sits there until
 * the request actually returns, so the screen can run ahead of itself but never claims
 * to have finished something it has not.
 *
 * The layout holds still while the words change, because a loading state that reflows is
 * harder to read than one that does not move at all.
 */
const STAGES = [
  { at: 0, label: 'Opening your site' },
  { at: 1800, label: 'Reading the page' },
  { at: 4200, label: 'Finding your logo' },
  { at: 6400, label: 'Picking out colours' },
  { at: 8600, label: 'Building your profile' },
];

const Reading = ({ website }: { website: string }) => {
  const [stage, setStage] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current = STAGES.map((s, i) => setTimeout(() => setStage(i), s.at));
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const current = STAGES[stage];

  /*
   * One line and a row of ticks.
   *
   * This had a mark with three expanding rings, the site address in monospace, a stage
   * name, a line of detail explaining the stage, and the ticks — five pieces of text and
   * animation for a ten-second wait. Nobody reads an explanation of a loading step; by
   * the time you have parsed "Checking the header, the favicon and the metadata" it has
   * moved on to the next one.
   *
   * What is left is the only thing worth knowing — what it is doing now — and the only
   * thing worth seeing: that it is moving. The domain stays because it confirms we are
   * reading the site they meant.
   */
  return (
    <div className="import__reading">
      <p className="import__reading-site">{website.replace(/^https?:\/\//, '')}</p>

      {/* Keyed so each line animates in rather than the words swapping in place. */}
      <p key={current.label} className="import__reading-stage">
        {current.label}
      </p>

      <ol className="import__steps" aria-hidden="true">
        {STAGES.map((s, i) => (
          <li
            key={s.label}
            className={i < stage ? 'is-done' : i === stage ? 'is-now' : ''}
          />
        ))}
      </ol>
    </div>
  );
};

/* ================= confirm ================= */

const Confirm = ({
  found,
  preview,
  chosen,
  onChoose,
  onBack,
  onSave,
  saving,
  error,
}: {
  found: BrandDraft;
  preview: BrandDraft['palette'];
  chosen?: string;
  onChoose: (color?: string) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
}) => {
  const d = found.draft;
  const host = d.website.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <>
      <div className="import__head import__head--tight">
        <h2>Here's what we found</h2>
        <p>Check it over and pick the colour that's really yours.</p>
      </div>

      {/*
        The brand as a card, not a list of rows.

        Their logo, their name and the line they lead with, arranged the way a brand is
        actually presented — rather than "Name: …" / "Logo: Found", which is a database
        record with a label on it.
      */}
      <div className="import__card">
        <BrandMark
          name={d.name ?? host}
          logoId={d.logoId}
          color={chosen}
          mode={d.mode}
          size={46}
        />
        <div className="import__card-text">
          <strong>{d.name ?? host}</strong>
          <a href={d.website} target="_blank" rel="noreferrer noopener">
            {host}
            <Icon name="arrowRight" size={11} />
          </a>
        </div>
      </div>

      {d.tagline && <p className="import__tagline">“{d.tagline}”</p>}

      {/* The palette as it will actually appear in a video, updating as they tap between
          colours — so the choice is made on the finished result rather than on a swatch. */}
      <div className="import__preview" style={{ background: preview.bg }}>
        <span style={{ color: preview.text }}>Your headline,</span>
        <span style={{ color: preview.accent }}>your colour</span>
      </div>

      {found.colorOptions.length > 0 && (
        <div className="import__colors">
          <span className="import__colors-label">Brand colour</span>
          <div className="import__colors-row">
            {found.colorOptions.map((option) => (
              <button
                key={option.color}
                className={`import__color ${option.color === chosen ? 'is-active' : ''}`}
                style={{ background: option.color }}
                onClick={() => onChoose(option.color)}
                title={option.color}
                aria-label={`Use ${option.color}`}
              >
                {option.color === chosen && <Icon name="check" size={12} />}
              </button>
            ))}
            <button
              className={`import__color import__color--none ${chosen === undefined ? 'is-active' : ''}`}
              onClick={() => onChoose(undefined)}
              title="No brand colour — black and white"
            >
              {chosen === undefined ? <Icon name="check" size={12} /> : '—'}
            </button>
          </div>
        </div>
      )}

      {/*
        Everything else we read, as facts rather than form fields.
        These are the fields that were being scraped and then discarded.
      */}
      <dl className="import__facts">
        {d.description && (
          <div className="import__fact import__fact--wide">
            <dt>About</dt>
            <dd>{d.description}</dd>
          </div>
        )}
        {d.action && (
          <div className="import__fact">
            <dt>Their call to action</dt>
            <dd>{d.action}</dd>
          </div>
        )}
        <div className="import__fact">
          <dt>Site style</dt>
          <dd>{d.mode === 'dark' ? 'Dark' : 'Light'}</dd>
        </div>
      </dl>

      {found.paletteReport.adjusted && chosen === d.color && (
        <p className="import__note">
          <Icon name="sparkle" size={13} />
          <span>{found.paletteReport.reason}</span>
        </p>
      )}

      {error && <p className="import__error">{error}</p>}

      <div className="import__actions">
        <button className="btn btn--outline" onClick={onBack} disabled={saving}>
          Another site
        </button>
        <button className="btn btn--primary" onClick={onSave} disabled={saving}>
          {saving ? (
            <>
              <span className="btn__spinner" />
              Saving
            </>
          ) : (
            'Use this brand'
          )}
        </button>
      </div>
    </>
  );
};
