import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { activeSignals, getSignal } from "../data.js";
import { signalText } from "../notifications.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "View Active Signals", data: "signals:active" }) if the toolkit exposes it.

registerMainMenuItem({ label: "View active signals", data: "signals:active", order: 20 });
const composer = new Composer<Ctx>();

composer.callbackQuery("signals:active", async (ctx) => {
  await ctx.answerCallbackQuery();
  const signals = await activeSignals();
  if (!signals.length) {
    await ctx.editMessageText("No active signals right now. Your next verified signal will appear here.", { reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]) });
    return;
  }
  const signal = signals[0];
  await ctx.editMessageText(signalText(signal), { reply_markup: inlineKeyboard([[inlineButton("Mark executed", `signal:done:${signal.id}`), inlineButton("Snooze", `signal:snooze:${signal.id}`)], [inlineButton("Back to menu", "menu:main")]]) });
});

composer.callbackQuery(/^signal:(done|snooze):([A-Za-z0-9_-]+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const action = ctx.match[1];
  const signal = await getSignal(ctx.match[2]);
  if (!signal) {
    await ctx.editMessageText("That signal is no longer available. Open active signals for the latest view.", { reply_markup: inlineKeyboard([[inlineButton("View active signals", "signals:active")]]) });
    return;
  }
  const text = action === "done" ? "Marked as executed. Manage the position with your broker." : "Snoozed. Review active signals again when you’re ready.";
  await ctx.editMessageText(text, { reply_markup: inlineKeyboard([[inlineButton("View active signals", "signals:active")]]) });
});

export default composer;
