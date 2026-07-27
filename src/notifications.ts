import type { Api } from "grammy";
import { activeSignals, subscribedUsers, type Signal } from "./data.js";
import { now } from "./clock.js";
import { inlineButton, inlineKeyboard } from "./toolkit/index.js";

function price(value: number): string { return value.toFixed(5); }

export function signalText(signal: Signal): string {
  const time = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(signal.timestamp));
  return `${signal.pair} ${signal.direction.toUpperCase()} signal\nEntry ${price(signal.entry_price)} · Stop ${price(signal.stop_loss)} · Target ${price(signal.take_profit)}\nConfidence ${signal.confidence}% · ${time} UTC\nSignals are informational, not investment advice.`;
}

/** Called by a verified market-event worker after it has persisted a real signal. */
export async function deliverSignal(api: Api, signal: Signal): Promise<void> {
  for (const user of await subscribedUsers()) {
    if (user.preferred_pairs.length > 0 && !user.preferred_pairs.includes(signal.pair)) continue;
    try {
      await api.sendMessage(user.chat_id, signalText(signal), { reply_markup: inlineKeyboard([
        [inlineButton("Mark executed", `signal:done:${signal.id}`), inlineButton("Snooze", `signal:snooze:${signal.id}`)],
      ]) });
    } catch { /* Users may block the bot; continue delivering to everyone else. */ }
  }
}

/** Called by the platform's 08:00 UTC scheduler. */
export async function deliverDailyDigest(api: Api): Promise<void> {
  const open = await activeSignals();
  const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(now());
  const text = `Daily market digest · ${day} UTC\nOpen signals: ${open.length}\nClosed trades: 0\nMarket commentary is unavailable until a verified market-data feed is connected.\nSignals are informational, not investment advice.`;
  for (const user of await subscribedUsers()) {
    try { await api.sendMessage(user.chat_id, text); } catch { /* blocked or unavailable chat */ }
  }
}
