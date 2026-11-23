import type { Brief } from './brief.ts';
import { parsePrompt } from './parse.ts';

/**
 * Asking before building.
 *
 * A one-line prompt almost never contains enough to make a good video. The old
 * behaviour was to guess and produce something wrong; this asks two or three short
 * questions first, and only the ones the prompt did not already answer.
 *
 * It works by parsing the prompt, seeing which parts of the Brief came back empty, and
 * asking about exactly those gaps. That is why it can be sharper than a generic chatbot
 * interview: it knows precisely what it is missing.
 *
 * This is the slot a real language model drops into later. The questions it asks would
 * get better; everything around it stays the same.
 */

export type Question = {
  /** Stable key, so an answer can be matched back to the thing it answers. */
  id: QuestionId;
  /** What to show above the options. */
  prompt: string;
  /** Tappable suggestions. Always optional — free text is accepted for every question. */
  options: string[];
  /** Placeholder for the free-text field. */
  placeholder: string;
  /** Answering is never required; skipping falls back to a sensible default. */
  optional: true;
};

export type QuestionId =
  | 'subject'
  | 'audience'
  | 'points'
  | 'action'
  | 'length'
  | 'tone';

export type Answers = Partial<Record<QuestionId, string>>;

/* ---------- what is missing ---------- */

/**
 * Decide what still needs asking.
 *
 * Capped at three. People abandon forms, and a video tool that interrogates you is
 * worse than one that guesses — the point is to ask only where the answer genuinely
 * changes the video.
 */
export const questionsFor = (prompt: string): Question[] => {
  const brief = parsePrompt(prompt);
  const asked: Question[] = [];

  if (!brief.product && isVague(brief)) asked.push(QUESTIONS.subject);
  if (brief.features.length === 0 && !brief.stat && !brief.quote) {
    asked.push(QUESTIONS.points);
  }
  if (asked.length < 3) asked.push(QUESTIONS.audience);
  if (asked.length < 3) asked.push(QUESTIONS.action);

  return asked.slice(0, 3);
};

/** A prompt is vague when it names nothing concrete to talk about. */
const isVague = (brief: Brief): boolean =>
  brief.headline.split(/\s+/).length <= 3 ||
  /^(something|a video|untitled)/i.test(brief.headline);

/* ---------- the questions ---------- */

const QUESTIONS: Record<QuestionId, Question> = {
  subject: {
    id: 'subject',
    prompt: "What's it for?",
    options: ['A product launch', 'A new feature', 'A milestone', 'A sale or offer'],
    placeholder: 'e.g. Pine, a note-taking app',
    optional: true,
  },
  audience: {
    id: 'audience',
    prompt: 'Who is watching?',
    options: ['Customers', 'Investors', 'My team', 'Social media'],
    placeholder: 'e.g. SaaS founders on X',
    optional: true,
  },
  points: {
    id: 'points',
    prompt: 'What should it say? Two or three things.',
    options: [],
    placeholder: 'e.g. offline sync, AI summaries, encrypted',
    optional: true,
  },
  action: {
    id: 'action',
    prompt: 'What should they do after watching?',
    options: ['Sign up', 'Join the waitlist', 'Book a demo', 'Download it', 'Nothing'],
    placeholder: 'e.g. start a free trial',
    optional: true,
  },
  length: {
    id: 'length',
    prompt: 'How long?',
    options: ['Short — under 10s', 'Standard — 15s', 'Longer — 30s'],
    placeholder: '',
    optional: true,
  },
  tone: {
    id: 'tone',
    prompt: 'What should it feel like?',
    options: ['Clean and calm', 'Bold and loud', 'Premium', 'Playful'],
    placeholder: '',
    optional: true,
  },
};

/* ---------- folding answers back in ---------- */

/**
 * Turn the original prompt plus the answers into one richer prompt.
 *
 * Everything funnels back into a single string on purpose: the parser stays the only
 * thing that reads language, so there is exactly one place where understanding happens.
 * When a model replaces the parser, this still works untouched.
 */
export const mergeAnswers = (prompt: string, answers: Answers): string => {
  const parts = [prompt.trim()];

  if (answers.subject) parts.push(`It is about ${clean(answers.subject)}.`);
  if (answers.points) parts.push(`Features: ${clean(answers.points)}.`);
  if (answers.audience) parts.push(`For ${clean(answers.audience)}.`);

  if (answers.action && !/^nothing$/i.test(answers.action.trim())) {
    parts.push(`${clean(answers.action)}.`);
  }

  if (answers.tone) parts.push(`${clean(answers.tone)}.`);
  if (answers.length) parts.push(`${clean(answers.length)}.`);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

/** Strip trailing punctuation so the joined sentence does not end in "..". */
const clean = (value: string): string => value.trim().replace(/[.!?,;]+$/, '');
