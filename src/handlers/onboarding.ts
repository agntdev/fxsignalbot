import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getUser, saveUser } from "../data.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "Choose subscription", data: "sub:choose", order: 10 });

const composer = new Composer<Ctx>();
const pairs = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"];

function subscriptionKeyboard() {
  return inlineKeyboard([
    [inlineButton("Free digest", "sub:free"), inlineButton("Paid signals", "sub:paid")],
    [inlineButton("Back to menu", "menu:main")],
  ]);
}
function riskKeyboard() {
  return inlineKeyboard([
    [inlineButton("0.5% risk", "risk:0.5"), inlineButton("1% risk", "risk:1")],
    [inlineButton("2% risk", "risk:2")],
  ]);
}
function pairKeyboard() {
  return inlineKeyboard([
    [inlineButton("EUR/USD", "pair:EURUSD"), inlineButton("GBP/USD", "pair:GBPUSD")],
    [inlineButton("USD/JPY", "pair:USDJPY"), inlineButton("AUD/USD", "pair:AUDUSD")],
    [inlineButton("Finish setup", "pair:finish")],
  ]);
}

async function persist(ctx: Ctx): Promise<void> {
  const from = ctx.from;
  const choice = ctx.session.onboarding;
  if (!from || !choice?.subscription || !choice.risk || !choice.pairs) return;
  await saveUser({ telegram_id: from.id, chat_id: ctx.chat?.id ?? from.id, subscription_type: choice.subscription,
    risk_percentage: choice.risk, preferred_pairs: choice.pairs, consented_to_paid: choice.subscription === "paid" });
}

composer.callbackQuery("sub:choose", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Choose access for your trading workflow.", { reply_markup: subscriptionKeyboard() });
});

composer.callbackQuery(["sub:free", "sub:paid"], async (ctx) => {
  await ctx.answerCallbackQuery();
  const type = ctx.callbackQuery.data === "sub:paid" ? "paid" : "free";
  ctx.session.onboarding = { subscription: type, pairs: [] };
  const text = type === "paid"
    ? "Paid access requires your consent before signals and on-demand analysis are enabled. Set your risk to continue."
    : "Free access includes the daily digest. Set your risk to continue.";
  await ctx.editMessageText(text, { reply_markup: riskKeyboard() });
});

composer.callbackQuery(/^risk:(0\.5|1|2)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const previous = ctx.session.onboarding ?? { subscription: "free" as const, pairs: [] };
  ctx.session.onboarding = { ...previous, risk: Number(ctx.match[1]) };
  await ctx.editMessageText("Select the pairs you want to follow. Tap pairs to add or remove them.", { reply_markup: pairKeyboard() });
});

composer.callbackQuery(/^pair:(EURUSD|GBPUSD|USDJPY|AUDUSD)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const code = ctx.match[1];
  const pair = pairs.find((value) => value.replace("/", "") === code);
  const setup = ctx.session.onboarding;
  if (!pair || !setup) {
    await ctx.editMessageText("Start your setup again from the subscription menu.", { reply_markup: subscriptionKeyboard() });
    return;
  }
  const selected = setup.pairs ?? [];
  setup.pairs = selected.includes(pair) ? selected.filter((item) => item !== pair) : [...selected, pair];
  await ctx.editMessageText(`Selected pairs: ${setup.pairs.join(", ") || "none"}.\nChoose more or finish setup.`, { reply_markup: pairKeyboard() });
});

composer.callbackQuery("pair:finish", async (ctx) => {
  await ctx.answerCallbackQuery();
  const setup = ctx.session.onboarding;
  if (!setup?.subscription || !setup.risk || !setup.pairs?.length) {
    await ctx.editMessageText("Choose at least one pair before finishing setup.", { reply_markup: pairKeyboard() });
    return;
  }
  try { await persist(ctx); } catch { /* Session still keeps this active setup until storage recovers. */ }
  const access = setup.subscription === "paid" ? "Paid signal access is selected." : "Free daily digest access is selected.";
  await ctx.editMessageText(`${access}\nRisk: ${setup.risk}% per trade.\nPairs: ${setup.pairs.join(", ")}.\nSignals are informational, not investment advice.`, {
    reply_markup: inlineKeyboard([[inlineButton("Request analysis", "analysis:request")], [inlineButton("Back to menu", "menu:main")]]),
  });
});

composer.callbackQuery("payment:failed", async (ctx) => {
  await ctx.answerCallbackQuery();
  const user = ctx.from ? await getUser(ctx.from.id) : undefined;
  if (user) await saveUser({ ...user, subscription_type: "free", consented_to_paid: false });
  await ctx.editMessageText("Your payment didn’t complete. Your account remains on the free daily digest. Choose Paid signals to try again.", { reply_markup: subscriptionKeyboard() });
});

export default composer;
