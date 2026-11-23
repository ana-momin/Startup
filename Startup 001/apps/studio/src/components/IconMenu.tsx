import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import './icon-menu.css';

/**
 * One icon, with its options inside it.
 *
 * The house pattern for anything with a handful of choices. The editor used to lay its
 * choices out flat — four tone names in a segmented control, three aspect ratios in
 * another, nine action icons in a strip — which meant the bar above a video was busier
 * than the video, and every new capability made it worse. A control that is not being
 * used should cost one icon, and reading the options is what opening it is for.
 *
 * Deliberately not a `<select>`: these need icons, grouping, current-value ticks and
 * destructive styling, none of which a native dropdown will do.
 */

export type MenuChoice = {
  value: string;
  label: string;
  /** A second line, for options whose name does not explain them. */
  hint?: string;
  icon?: IconName;
  /** Drawn in red, and set apart from what sits above it. */
  danger?: boolean;
  disabled?: boolean;
};

export const IconMenu = ({
  icon,
  label,
  choices,
  active,
  onChoose,
  align = 'right',
  drop = 'down',
}: {
  icon: IconName;
  /** What the icon means, for the tooltip and for screen readers. */
  label: string;
  choices: MenuChoice[];
  /** The one currently in force, if this is a setting rather than a list of actions. */
  active?: string;
  onChoose: (value: string) => void;
  align?: 'left' | 'right';
  /** Which way the menu opens. A control near the foot of the window wants 'up'. */
  drop?: 'down' | 'up';
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Clicking away and Escape both close it. A menu you have to re-click the trigger to
  // dismiss is a menu people leave open.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="imenu" ref={ref}>
      <button
        className={`imenu__trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title={label}
        aria-label={label}
        aria-expanded={open}
      >
        <Icon name={icon} size={15} />
      </button>

      {open && (
        <div className={`menu imenu__menu imenu__menu--${align} imenu__menu--${drop}`}>
          {choices.map((choice) => (
            <button
              key={choice.value}
              className={`menu__item ${choice.danger ? 'is-danger' : ''} ${
                choice.value === active ? 'is-active' : ''
              }`}
              disabled={choice.disabled}
              onClick={() => {
                setOpen(false);
                onChoose(choice.value);
              }}
            >
              {choice.icon && <Icon name={choice.icon} size={14} />}
              <span className="menu__text">
                {choice.label}
                {choice.hint && <em>{choice.hint}</em>}
              </span>
              {choice.value === active && <Icon name="check" size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
