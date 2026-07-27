import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getUser } from "../data.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "Request Analysis", data: "analysis:request" }) if the toolkit exposes it.

registerMainMenuItem({ label: "Request analysis", data: "analysis:request", order: 30 });

const composer = new Composer<Ctx>();
const supported = new Set(["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"]);

composer.callbackQuery("analysis:request", async (ctx) => {
  await ctx.answerCallbackQuery();
  const stored = ctx.from ? await getUser(ctx.from.id) : undefined;
  const paid = stored?.subscription_type === "paid" || ctx.session.onboarding?.subscription === "paid";
  if (!paid) {
    await ctx.editMessageText("On-demand analysis is available with Paid signals. Choose a subscription to continue.", {
      reply_markup: inlineKeyboard([[inlineButton("Choose subscription", "sub:choose")], [inlineButton("Back to menu", "menu:main")]]),
    });
    return;
  }
  ctx.session.analysisAwaitingPair = true;
  await ctx.editMessageText("Send a currency pair, for example EUR/USD.", {
    reply_markup: inlineKeyboard([[inlineButton("EUR/USD", "analysis:pair:EURUSD"), inlineButton("GBP/USD", "analysis:pair:GBPUSD")], [inlineButton("Back to menu", "menu:main")]]),
  });
});

async function report(ctx: Ctx, pair: string): Promise<void> {
  ctx.session.analysisAwaitingPair = false;
  if (!supported.has(pair)) {
    await ctx.reply("That pair isn’t supported. Try EUR/USD, GBP/USD, USD/JPY, or AUD/USD.");
    return;
  }
  await ctx.reply(`${pair} analysis isn’t available yet because a verified market-data feed hasn’t been connected. Try again after the feed is configured.\n\nSignals are informational, not investment advice.`);
}

composer.callbackQuery(/^analysis:pair:(EURUSD|GBPUSD|USDJPY|AUDUSD)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await report(ctx, ctx.match[1].replace(/(EUR|GBP|USD|AUD)(USD|JPY)/, "$1/$2"));
});

composer.on("message:text", async (ctx, next) => {
  if (!ctx.session.analysisAwaitingPair) return next();
  await report(ctx, ctx.message.text.trim().toUpperCase().replace(/\s+/g, "" ).replace(/^(EUR|GBP|USD|AUD)(USD|JPY)$/, "$1/$2"));
});

export default composer;
