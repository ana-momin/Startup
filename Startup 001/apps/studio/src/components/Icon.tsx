type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
};

/**
 * Inline SVG icons.
 *
 * Drawn as paths rather than pulled from an icon library: no extra dependency, no
 * licence to check, and they inherit text colour automatically so they always match
 * whatever they sit next to.
 */

const paths = {
  plus: 'M12 5v14M5 12h14',
  // Undo and redo: an arrow curving back over a loop, mirrored.
  undo: 'M4 8h10a5 5 0 010 10h-6M4 8l4-4M4 8l4 4',
  redo: 'M20 8H10a5 5 0 000 10h6M20 8l-4-4M20 8l-4 4',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
  play: 'M6 4l14 8-14 8V4z',
  download: 'M12 3v12M7 10l5 5 5-5M4 20h16',
  image: 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 14l9 5 9-5',
  /* A droplet reads as "colour" instantly at small sizes. */
  palette: 'M12 3.4c0 0-6.3 6.6-6.3 10.8a6.3 6.3 0 1012.6 0C18.3 10 12 3.4 12 3.4z',
  type: 'M4 6V4h16v2M12 4v16M9 20h6',
  check: 'M4 12l5 5L20 6',
  refresh: 'M3 12a9 9 0 0115.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 01-15.5 6.3L3 16M3 21v-5h5',
  close: 'M6 6l12 12M18 6L6 18',
  moon: 'M20.5 14.8A8.5 8.5 0 019.2 3.5a8.5 8.5 0 1011.3 11.3z',
  panel: 'M3 5h18v14H3zM9.5 5v14',
  search: 'M10.5 3a7.5 7.5 0 105.4 12.8A7.5 7.5 0 0010.5 3zM21 21l-5.1-5.2',
  /*
   * New video: a pencil over a page corner.
   *
   * The bare pencil meant "edit", which is what it is used for elsewhere in the app —
   * so the first item in the navigation and the rename button were the same glyph doing
   * two different jobs. The open corner reads as "start one" rather than "change one",
   * and it matches the compose icon people already know from mail and chat apps.
   */
  edit: 'M4 20h16M5.5 4H12M5.5 4v9.5M16.6 3.4a1.9 1.9 0 012.7 2.7L11.4 14l-3.6.9.9-3.6 7.9-7.9z',
  library: 'M4 5h3.5v14H4zM10.2 5h3.5v14h-3.5zM16.5 5H20v14h-3.5z',
  // Projects: a stack of frames rather than an office folder. What is in there is
  // videos, and a folder is the icon for files on a disk.
  folder: 'M3 8.5A2.5 2.5 0 015.5 6h13A2.5 2.5 0 0121 8.5v7a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 15.5zM6 3.5h12M10 11l4 2.5-4 2.5z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7.2V12l3.2 2',
  chevronRight: 'M9.5 6l6 6-6 6',
  logout: 'M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20.5a7.5 7.5 0 0115 0',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
  chart: 'M4 20h16M7 20v-7M12 20V6M17 20v-4',
  // A window: the product on screen.
  screen: 'M3 5h18v11H3zM3 9h18M9 20h6',
  quote: 'M9 7H5.5A1.5 1.5 0 004 8.5V12h5V7zM19 7h-3.5A1.5 1.5 0 0014 8.5V12h5V7zM9 12c0 3-1.6 4.6-4 5M19 12c0 3-1.6 4.6-4 5',
  flag: 'M5 21V4M5 4h11l-2 3 2 3H5',
  settings: 'M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1v.2a2 2 0 11-4 0v-.1a1.6 1.6 0 00-2.7-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00-1.1-2.7H3.5a2 2 0 110-4h.1A1.6 1.6 0 004.8 7.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 002.7-1.1V3.9a2 2 0 114 0V4a1.6 1.6 0 002.7 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 001.1 2.7h.2a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1.1z',
  drag: 'M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01',
  copy: 'M9 9h10v10a2 2 0 01-2 2H9a2 2 0 01-2-2V11a2 2 0 012-2zM15 5H7a2 2 0 00-2 2v8',
  reframe: 'M4 7V5a1 1 0 011-1h2M17 4h2a1 1 0 011 1v2M20 17v2a1 1 0 01-1 1h-2M7 20H5a1 1 0 01-1-1v-2M8 9h8v6H8z',
} as const;

export type IconName =
  | keyof typeof paths
  | 'sparkle'
  | 'logo'
  | 'sun'
  | 'brand'
  | 'video';

export const Icon = ({ name, size = 18, strokeWidth = 1.8 }: IconProps) => {
  /**
   * Brand kits: three overlapping swatch cards.
   *
   * The droplet meant "a colour"; a brand kit is a *set* of decisions — colour, logo,
   * voice. Overlapping cards is the visual language design tools already use for a
   * palette, so it needs no explaining at 17px.
   */
  if (name === 'brand') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      >
        <rect x="3" y="7" width="11" height="14" rx="2.5" />
        <path d="M7.5 4.5h9A2.5 2.5 0 0 1 19 7v11" opacity="0.55" />
        <path d="M11 2.5h6.5A3.5 3.5 0 0 1 21 6v9" opacity="0.3" />
      </svg>
    );
  }

  /** A film frame: sprocket holes down both sides. Reads as "video" instantly. */
  if (name === 'video') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <path d="M8 4v16M16 4v16" />
        <path d="M3 12h5M16 12h5" opacity="0.5" />
      </svg>
    );
  }

  // A sun is a circle plus rays — more than one path, so it gets its own markup.
  if (name === 'sun') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="4" />
        {Array.from({ length: 8 }, (_, i) => (
          <line
            key={i}
            x1="12"
            y1="2.5"
            x2="12"
            y2="5"
            transform={`rotate(${i * 45} 12 12)`}
          />
        ))}
      </svg>
    );
  }

  // Two icons are filled shapes rather than strokes, so they get their own markup.
  if (name === 'sparkle') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z" />
        <path d="M19 14l.9 2.6L22.5 18l-2.6.9L19 21.5l-.9-2.6L15.5 18l2.6-.9L19 14z" opacity=".6" />
      </svg>
    );
  }

  if (name === 'logo') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Eight rays: a shutter opening. Simple enough to read at 20px. */}
        {Array.from({ length: 8 }, (_, i) => (
          <rect
            key={i}
            x="11.1"
            y="1.6"
            width="1.8"
            height="7"
            rx="0.9"
            fill="currentColor"
            opacity={0.45 + (i % 4) * 0.18}
            transform={`rotate(${i * 45} 12 12)`}
          />
        ))}
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === 'play' ? 'currentColor' : 'none'}
      stroke={name === 'play' ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
};
