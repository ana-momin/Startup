import { useMemo, useState } from 'react';
import { specSeconds } from '@motion/planner';
import { Icon } from '@/components/Icon';
import { VideoThumb } from '@/components/VideoThumb';
import type { Brand, Video } from '@/lib/api';
import './projects.css';

type Props = {
  videos: Video[];
  brands: Brand[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
};

type Sort = 'recent' | 'name' | 'longest';

/**
 * Everything you have made.
 *
 * Rebuilt around a real thumbnail: a still frame of the actual video, drawn by the same
 * engine that renders it. A list of grey rectangles is useless the moment somebody has
 * more than about five videos — and recognising your own work by looking at it is the
 * entire job of this screen.
 */
export const Projects = ({ videos, brands, onOpen, onDelete, onNew }: Props) => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [brandFilter, setBrandFilter] = useState<string>('all');

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return videos
      .filter((v) => {
        if (brandFilter !== 'all') {
          const id = v.spec.brandId ?? v.brandId ?? null;
          if (brandFilter === 'none' ? id !== null : id !== brandFilter) return false;
        }
        if (!needle) return true;
        // Searching the prompt too, because people remember what they asked for far
        // more often than they remember what it ended up being called.
        return (
          v.title.toLowerCase().includes(needle) ||
          v.prompt.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => {
        if (sort === 'name') return a.title.localeCompare(b.title);
        if (sort === 'longest') return specSeconds(b.spec) - specSeconds(a.spec);
        return b.updatedAt - a.updatedAt;
      });
  }, [videos, query, sort, brandFilter]);

  return (
    <div className="projects">
      <header className="projects__head">
        <div className="projects__title">
          <h1>Projects</h1>
          <span>
            {videos.length === 0
              ? 'Nothing here yet'
              : `${shown.length} of ${videos.length} video${videos.length === 1 ? '' : 's'}`}
          </span>
        </div>
        <button className="btn btn--primary" onClick={onNew}>
          <Icon name="plus" size={15} />
          New video
        </button>
      </header>

      {videos.length > 0 && (
        <div className="projects__bar">
          <div className="projects__search">
            <Icon name="search" size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles and prompts…"
              spellCheck={false}
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear">
                <Icon name="close" size={13} />
              </button>
            )}
          </div>

          {brands.length > 0 && (
            <select
              className="projects__select"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
            >
              <option value="all">All brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
              <option value="none">No brand</option>
            </select>
          )}

          <select
            className="projects__select"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            <option value="recent">Recent</option>
            <option value="name">Name</option>
            <option value="longest">Longest</option>
          </select>
        </div>
      )}

      {videos.length === 0 ? (
        <div className="projects__empty">
          <span className="projects__empty-icon">
            <Icon name="video" size={24} />
          </span>
          <h2>No videos yet</h2>
          <p>Everything you make is saved here, ready to reopen and edit.</p>
          <button className="btn btn--primary" onClick={onNew}>
            <Icon name="plus" size={15} />
            Make your first one
          </button>
        </div>
      ) : shown.length === 0 ? (
        <div className="projects__empty">
          <span className="projects__empty-icon">
            <Icon name="search" size={22} />
          </span>
          <h2>Nothing matches</h2>
          <p>Try a different search, or clear the filters.</p>
          <button
            className="btn btn--outline"
            onClick={() => {
              setQuery('');
              setBrandFilter('all');
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="projects__grid">
          {shown.map((video) => (
            <li key={video.id}>
              <button className="card" onClick={() => onOpen(video.id)}>
                <span className="card__thumb">
                  <VideoThumb spec={video.spec} />
                  <span className="card__duration">
                    {specSeconds(video.spec).toFixed(1)}s
                  </span>
                  {video.local && <span className="card__local">local</span>}
                </span>

                <span className="card__body">
                  <span className="card__title">{video.title}</span>
                  <span className="card__meta">
                    <span
                      className="card__dot"
                      style={{ background: video.spec.palette.accent }}
                    />
                    {RATIOS[video.spec.format]} · {video.spec.scenes.length} scenes ·{' '}
                    {when(video.updatedAt)}
                  </span>
                </span>
              </button>

              <button
                className="card__delete"
                onClick={() => onDelete(video.id)}
                aria-label={`Delete ${video.title}`}
                title="Delete"
              >
                <Icon name="trash" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const RATIOS: Record<string, string> = {
  landscape: '16:9',
  vertical: '9:16',
  square: '1:1',
};

/** "3 minutes ago" beats a timestamp nobody can parse at a glance. */
const when = (time: number): string => {
  const seconds = Math.floor((Date.now() - time) / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  // A bad timestamp should not put "Invalid Date" on a card. It has happened.
  const date = new Date(time);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};
