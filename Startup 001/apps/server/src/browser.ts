import { chromium } from 'playwright';
import type { Browser } from 'playwright';

/**
 * One Chrome, shared by everything that needs it.
 *
 * Two jobs use a browser now — rendering videos and reading a customer's website — and
 * launching Chrome costs about a second. Sharing one warm instance means the second
 * feature was nearly free, which is the quiet payoff of having built the renderer on
 * something general rather than something single-purpose.
 */

let browser: Browser | null = null;

export const getBrowser = async (): Promise<Browser> => {
  // isConnected catches the case where Chrome crashed and left a dead handle behind.
  if (browser?.isConnected()) return browser;

  browser = await chromium.launch({
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  return browser;
};

export const closeBrowser = async (): Promise<void> => {
  await browser?.close().catch(() => {});
  browser = null;
};
