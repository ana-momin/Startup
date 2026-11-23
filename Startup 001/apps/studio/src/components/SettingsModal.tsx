import { useEffect, useState } from 'react';
import type { FormatName, LengthPreference, Tone } from '@motion/planner';
import { Icon } from './Icon';
import { api, initials } from '@/lib/api';
import { BrandMark } from './BrandMark';
import type { Brand, User } from '@/lib/api';
import type { Preferences } from '@/lib/preferences';
import './settings-modal.css';

type Tab = 'profile' | 'defaults' | 'brands' | 'appearance' | 'account';

type Props = {
  user: User;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  brands: Brand[];
  activeBrandId: string | null;
  onSelectBrand: (id: string | null) => void;
  onManageBrands: () => void;
  preferences: Preferences;
  onPreferences: (next: Preferences) => void;
  onClose: () => void;
  onUpdated: (user: User) => void;
  onSignOut: () => void;
  onDeleted: () => void;
};

/**
 * Settings.
 *
 * Five sections rather than three, and a window with room to breathe. The old one was
 * a small box with two fields in it, which made every setting feel like an
 * afterthought — and a product where preferences look like an afterthought is one
 * nobody bothers configuring.
 *
 * The section that matters most is Defaults: the format, length and look every new
 * video starts from. Setting it once is the difference between choosing three things
 * per video and choosing none.
 */
export const SettingsModal = ({
  user,
  theme,
  onToggleTheme,
  brands,
  activeBrandId,
  onSelectBrand,
  onManageBrands,
  preferences,
  onPreferences,
  onClose,
  onUpdated,
  onSignOut,
  onDeleted,
}: Props) => {
  const [tab, setTab] = useState<Tab>('profile');
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    if (!name.trim() || name.trim() === user.name) return;
    setSaving(true);
    setError(null);
    try {
      onUpdated(await api.updateProfile(name.trim()));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await api.deleteAccount();
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the account.');
      setSaving(false);
    }
  };

  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    onPreferences({ ...preferences, [key]: value });

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="settings"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="settings__head">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="settings__body">
          <nav className="settings__tabs">
            {TABS.map(({ id, label, icon }) => (
              <button
                key={id}
                className={`settings__tab ${tab === id ? 'is-active' : ''}`}
                onClick={() => setTab(id)}
              >
                <Icon name={icon} size={15} />
                {label}
              </button>
            ))}
          </nav>

          <div className="settings__panel">
            {/* ---------------- Profile ---------------- */}
            {tab === 'profile' && (
              <>
                <Section title="You">
                  <div className="settings__identity">
                    <span className="avatar avatar--large">{initials(user)}</span>
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                  </div>
                </Section>

                <Field label="Display name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && save()}
                    maxLength={60}
                  />
                </Field>

                <Field
                  label="Email"
                  hint="Changing your email needs a confirmation link, which arrives with real email sending."
                >
                  <input value={user.email} disabled />
                </Field>

                <div className="settings__actions">
                  <button
                    className="btn btn--primary"
                    onClick={save}
                    disabled={saving || !name.trim() || name.trim() === user.name}
                  >
                    {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
                  </button>
                </div>
              </>
            )}

            {/* ---------------- Video defaults ---------------- */}
            {tab === 'defaults' && (
              <>
                <Section
                  title="New videos"
                  note="What every new video starts from. You can still change any of it per video."
                />

                <Field label="Shape">
                  <div className="chooser">
                    {FORMATS.map((f) => (
                      <button
                        key={f.id}
                        className={`chooser__item ${preferences.format === f.id ? 'is-active' : ''}`}
                        onClick={() => set('format', f.id)}
                      >
                        <span className={`chooser__shape chooser__shape--${f.id}`} />
                        <strong>{f.label}</strong>
                        <em>{f.ratio}</em>
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Length">
                  <div className="chooser chooser--row">
                    {LENGTHS.map((l) => (
                      <button
                        key={l.id}
                        className={`chooser__item ${preferences.length === l.id ? 'is-active' : ''}`}
                        onClick={() => set('length', l.id)}
                      >
                        <strong>{l.label}</strong>
                        <em>{l.hint}</em>
                      </button>
                    ))}
                  </div>
                </Field>

                <Field
                  label="Look"
                  hint="Leave on Automatic to let each video choose what suits it."
                >
                  <div className="chooser chooser--wrap">
                    <button
                      className={`chooser__item ${!preferences.tone ? 'is-active' : ''}`}
                      onClick={() => set('tone', undefined)}
                    >
                      <strong>Automatic</strong>
                      <em>Per video</em>
                    </button>
                    {TONES.map((t) => (
                      <button
                        key={t.id}
                        className={`chooser__item ${preferences.tone === t.id ? 'is-active' : ''}`}
                        onClick={() => set('tone', t.id)}
                      >
                        <strong>{t.label}</strong>
                        <em>{t.hint}</em>
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {/* ---------------- Brands ---------------- */}
            {tab === 'brands' && (
              <>
                <Section
                  title="Brand kits"
                  note="The brand new videos are made in. Everything else about a kit is edited on the Brands page."
                />

                {brands.length === 0 ? (
                  <div className="settings__empty">
                    <Icon name="brand" size={22} />
                    <p>No brand kits yet.</p>
                    <button className="btn btn--outline" onClick={onManageBrands}>
                      Create one
                    </button>
                  </div>
                ) : (
                  <>
                    <ul className="brand-list">
                      {brands.map((brand) => (
                        <li key={brand.id}>
                          <button
                            className={`brand-list__item ${brand.id === activeBrandId ? 'is-active' : ''}`}
                            onClick={() => onSelectBrand(brand.id)}
                          >
                            <BrandMark
                              name={brand.name}
                              logoId={brand.logoId}
                              color={brand.palette.accent}
                              mode={brand.mode}
                              size={30}
                            />
                            <span className="brand-list__body">
                              <strong>{brand.name}</strong>
                              <em>{brand.color ?? 'Monochrome'}</em>
                            </span>
                            {brand.id === activeBrandId && <Icon name="check" size={15} />}
                          </button>
                        </li>
                      ))}
                      <li>
                        <button
                          className={`brand-list__item ${!activeBrandId ? 'is-active' : ''}`}
                          onClick={() => onSelectBrand(null)}
                        >
                          <span className="brand-list__thumb brand-list__thumb--none" />
                          <span className="brand-list__body">
                            <strong>No brand</strong>
                            <em>Let each video choose its own colours</em>
                          </span>
                          {!activeBrandId && <Icon name="check" size={15} />}
                        </button>
                      </li>
                    </ul>

                    <div className="settings__actions">
                      <button className="btn btn--outline" onClick={onManageBrands}>
                        Manage brand kits
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ---------------- Appearance ---------------- */}
            {tab === 'appearance' && (
              <>
                <Section title="Appearance" note="How the app itself looks." />

                <Field label="Theme">
                  <div className="chooser chooser--row">
                    {(['light', 'dark'] as const).map((option) => (
                      <button
                        key={option}
                        className={`chooser__item ${theme === option ? 'is-active' : ''}`}
                        onClick={() => theme !== option && onToggleTheme()}
                      >
                        <Icon name={option === 'dark' ? 'moon' : 'sun'} size={16} />
                        <strong>{option === 'dark' ? 'Dark' : 'Light'}</strong>
                      </button>
                    ))}
                  </div>
                </Field>

                <Field
                  label="Motion"
                  hint="Turn this off and the interface stops animating. The videos are unaffected."
                >
                  <Toggle
                    on={!preferences.reduceMotion}
                    onChange={(on) => set('reduceMotion', !on)}
                    label={preferences.reduceMotion ? 'Reduced' : 'Full'}
                  />
                </Field>

                <Field
                  label="Autoplay previews"
                  hint="Whether a video starts playing as soon as you open it."
                >
                  <Toggle
                    on={preferences.autoplay}
                    onChange={(on) => set('autoplay', on)}
                    label={preferences.autoplay ? 'On' : 'Off'}
                  />
                </Field>
              </>
            )}

            {/* ---------------- Account ---------------- */}
            {tab === 'account' && (
              <>
                <Section title="Plan" />
                <div className="settings__plan">
                  <div>
                    <strong>{user.plan === 'free' ? 'Free' : user.plan}</strong>
                    <span>Unlimited videos while we are in early access.</span>
                  </div>
                </div>

                <Section title="Session" />
                <div className="settings__actions settings__actions--start">
                  <button className="btn btn--outline" onClick={onSignOut}>
                    <Icon name="logout" size={15} />
                    Sign out
                  </button>
                </div>

                <div className="danger">
                  <div className="danger__head">
                    <strong>Delete account</strong>
                    <span>
                      Removes your account and every video in it. This cannot be undone.
                    </span>
                  </div>

                  {confirmingDelete ? (
                    <div className="danger__confirm">
                      <button
                        className="btn btn--outline"
                        onClick={() => setConfirmingDelete(false)}
                      >
                        Keep my account
                      </button>
                      <button className="btn danger__go" onClick={remove} disabled={saving}>
                        {saving ? 'Deleting…' : 'Delete everything'}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn danger__trigger"
                      onClick={() => setConfirmingDelete(true)}
                    >
                      Delete account
                    </button>
                  )}
                </div>
              </>
            )}

            {error && <p className="settings__error">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- small pieces ---------- */

const Section = ({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children?: React.ReactNode;
}) => (
  <div className="settings__section">
    <h3>{title}</h3>
    {note && <p>{note}</p>}
    {children}
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
  <label className="settings__field">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

/** A switch, because two mutually exclusive buttons for an on/off is overkill. */
const Toggle = ({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) => (
  <button
    className={`toggle ${on ? 'is-on' : ''}`}
    onClick={() => onChange(!on)}
    role="switch"
    aria-checked={on}
    type="button"
  >
    <span className="toggle__track">
      <span className="toggle__knob" />
    </span>
    <span className="toggle__label">{label}</span>
  </button>
);

/* ---------- options ---------- */

const TABS = [
  { id: 'profile' as const, label: 'Profile', icon: 'user' as const },
  { id: 'defaults' as const, label: 'Video defaults', icon: 'video' as const },
  { id: 'brands' as const, label: 'Brand kits', icon: 'brand' as const },
  { id: 'appearance' as const, label: 'Appearance', icon: 'palette' as const },
  { id: 'account' as const, label: 'Account', icon: 'settings' as const },
];

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

const TONES: { id: Tone; label: string; hint: string }[] = [
  { id: 'clean', label: 'Clean', hint: 'Calm, centred' },
  { id: 'bold', label: 'Bold', hint: 'Heavy, hard cuts' },
  { id: 'editorial', label: 'Editorial', hint: 'Left, considered' },
  { id: 'kinetic', label: 'Kinetic', hint: 'Big and fast' },
];
