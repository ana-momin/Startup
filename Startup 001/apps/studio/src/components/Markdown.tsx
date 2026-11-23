import type { ReactNode } from 'react';

/**
 * The small part of Markdown an assistant actually uses.
 *
 * Written rather than installed, for three reasons. A renderer is a dependency to licence
 * check and keep updated for something we need about eighty lines of. Every off-the-shelf
 * one is far larger than this because it implements the whole spec — tables, footnotes,
 * reference links, HTML passthrough — none of which a chat reply contains. And most of
 * them render by setting innerHTML, which turns model output into a script-injection
 * surface; this builds React elements, so a reply containing `<img onerror=...>` is text
 * on the screen and nothing else. There is no HTML path at all, by construction.
 *
 * What it supports, because this is what the assistant is told to use: paragraphs,
 * bulleted lists, numbered lists, headings, bold, italic and inline code. Anything else
 * passes through as the characters that were typed, which is the right failure: a stray
 * underscore shows up as an underscore rather than eating half a sentence.
 */

type Props = {
  text: string;
  className?: string;
  /**
   * Something to put at the very end of the last block — the typing caret.
   *
   * It has to go INSIDE the final paragraph rather than after the whole thing, or block
   * layout drops it onto a line of its own and a reply that is still arriving looks like
   * a reply that has finished with a stray mark under it.
   */
  trailing?: ReactNode;
};

export const Markdown = ({ text, className, trailing }: Props) => (
  <div className={className}>{blocks(text, trailing)}</div>
);

/* ---------- blocks ---------- */

const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*(#{1,4})\s+(.*)$/;

const blocks = (text: string, trailing?: ReactNode): ReactNode[] => {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];

  // A run of consecutive list items becomes one list. Collected rather than emitted per
  // line, because six separate one-item lists is not a list, it is six paragraphs with
  // dots in front of them.
  let bullets: string[] = [];
  let numbers: string[] = [];
  let para: string[] = [];

  const flushBullets = () => {
    if (bullets.length === 0) return;
    out.push(
      <ul key={`u${out.length}`} className="md__list">
        {bullets.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  const flushNumbers = () => {
    if (numbers.length === 0) return;
    out.push(
      <ol key={`o${out.length}`} className="md__list md__list--ordered">
        {numbers.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </ol>,
    );
    numbers = [];
  };

  const flushPara = () => {
    if (para.length === 0) return;
    // Lines inside a paragraph are joined with spaces, the way Markdown does: a hard
    // wrap in the source is not a line break the reader asked for.
    out.push(
      <p key={`p${out.length}`} className="md__p">
        {inline(para.join(' '))}
      </p>,
    );
    para = [];
  };

  const flushAll = () => {
    flushPara();
    flushBullets();
    flushNumbers();
  };

  for (const line of lines) {
    if (line.trim() === '') {
      flushAll();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushAll();
      // Always an h4 whatever the hash count. These sit inside a chat bubble, where a
      // real h1 would be larger than everything around it and read as a page title.
      out.push(
        <h4 key={`h${out.length}`} className="md__h">
          {inline(heading[2])}
        </h4>,
      );
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      flushPara();
      flushNumbers();
      bullets.push(bullet[1]);
      continue;
    }

    const numbered = NUMBERED.exec(line);
    if (numbered) {
      flushPara();
      flushBullets();
      numbers.push(numbered[1]);
      continue;
    }

    flushBullets();
    flushNumbers();
    para.push(line.trim());
  }

  flushAll();

  /*
   * The caret joins the last block rather than following it.
   *
   * If nothing was rendered at all — the reveal has not produced a whole word yet — it
   * still needs somewhere to live, so it gets a paragraph of its own.
   */
  if (trailing) {
    const last = out[out.length - 1];
    if (last && typeof last === 'object' && 'props' in last) {
      const el = last as { type: unknown; key: string | null; props: { className?: string; children?: ReactNode } };
      const Tag = el.type as 'p';
      out[out.length - 1] = (
        <Tag key={el.key ?? 'last'} className={el.props.className}>
          {el.props.children}
          {trailing}
        </Tag>
      );
    } else {
      out.push(<p key="caret" className="md__p">{trailing}</p>);
    }
  }

  return out;
};

/* ---------- inline ---------- */

/*
 * Bold, italic and code, in one pass.
 *
 * One regex with alternatives rather than three sequential passes, because sequential
 * passes re-scan text the earlier ones produced — so a literal asterisk inside a code
 * span gets treated as emphasis by the next pass. Matching left to right in a single
 * sweep means whatever claims a character first keeps it.
 */
const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|`[^`\n]+`)/g;

const inline = (text: string): ReactNode[] => {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of text.matchAll(INLINE)) {
    const at = match.index ?? 0;
    if (at > last) out.push(text.slice(last, at));

    const token = match[0];
    if (token.startsWith('**') || token.startsWith('__')) {
      out.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      out.push(
        <code key={key++} className="md__code">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      out.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }

    last = at + token.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
};
