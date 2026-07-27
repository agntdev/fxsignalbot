import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { activeSignals, setDefaultRisk, userCount } from "../data.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "Owner controls", data: "owner:home", order: 50 });
const composer = new Composer<Ctx>();

function isOwner(ctx: Ctx): boolean {
  // The blueprint provides no owner identity or required deployment setting.
  // Never guess that a Telegram user is an owner.
  void ctx;
  return false;
}

function controls() {
  return inlineKeyboard([
    [inlineButton("View performance", "owner:metrics")],
    [inlineButton("Set default risk", "owner:risk")],
    [inlineButton("Manage tiers", "owner:tiers")],
    [inlineButton("Back to menu", "menu:main")],
  ]);
}

async function guard(ctx: Ctx): Promise<boolean> {
  if (isOwner(ctx)) return true;
  await ctx.editMessageText("Owner controls aren’t configured for this bot yet.", { reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]) });
  return false;
}

composer.callbackQuery("owner:home", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await guard(ctx))) return;
  await ctx.editMessageText("Manage subscription settings and review signal performance.", { reply_markup: controls() });
});

composer.callbackQuery("owner:metrics", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await guard(ctx))) return;
  const [users, signals] = await Promise.all([userCount(), activeSignals()]);
  await ctx.editMessageText(`Performance summary\nSubscribed users: ${users}\nOpen signals: ${signals.length}\nClosed trades: 0\nOnly verified signal outcomes should be used for performance reporting.`, { reply_markup: controls() });
});

composer.callbackQuery("owner:risk", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await guard(ctx))) return;
  await ctx.editMessageText("Choose the default risk for new users.", { reply_markup: inlineKeyboard([
    [inlineButton("0.5% risk", "owner:risk:0.5"), inlineButton("1% risk", "owner:risk:1")],
    [inlineButton("2% risk", "owner:risk:2")],
    [inlineButton("Back", "owner:home")],
  ]) });
});

composer.callbackQuery("owner:tiers", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await guard(ctx))) return;
  await ctx.editMessageText("Free users receive daily digests. Paid signals and analysis are confirmed by the linked payment platform.", { reply_markup: controls() });
});

composer.callbackQuery(/^owner:risk:(0\.5|1|2)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await guard(ctx))) return;
  const risk = Number(ctx.match[1]);
  const saved = await setDefaultRisk(risk);
  await ctx.editMessageText(saved ? `Default risk is now ${risk}% per trade.` : "Couldn’t save the default risk because persistent storage isn’t configured.", { reply_markup: controls() });
});

export default composer;
