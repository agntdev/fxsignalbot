/**
 * Durable Forex domain records. Redis is deliberately accessed through explicit
 * record and index keys; this module never enumerates the keyspace. The toolkit
 * already uses REDIS_URL for persistent session storage, so it is also the one
 * deployment setting used for durable bot records.
 */
export type SubscriptionType = "free" | "paid";

export interface ForexUser {
  telegram_id: number;
  subscription_type: SubscriptionType;
  risk_percentage: number;
  preferred_pairs: string[];
  consented_to_paid: boolean;
  chat_id: number;
}

export interface Signal {
  id: string;
  pair: string;
  direction: "buy" | "sell";
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  confidence: number;
  timestamp: string;
  status: "open" | "closed";
}

interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
}

let redisPromise: Promise<RedisLike | undefined> | undefined;

async function redis(): Promise<RedisLike | undefined> {
  if (typeof process === "undefined" || !process.env.REDIS_URL) return undefined;
  redisPromise ??= (async () => {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    // Loaded only in the Node deployment that has configured Redis.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const module: any = require("ioredis");
    const Redis = module.default ?? module.Redis ?? module;
    return new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false }) as RedisLike;
  })();
  return redisPromise;
}

async function read<T>(key: string): Promise<T | undefined> {
  const client = await redis();
  if (!client) return undefined;
  const raw = await client.get(key);
  if (!raw) return undefined;
  try { return JSON.parse(raw) as T; } catch { return undefined; }
}

async function write(key: string, value: unknown): Promise<boolean> {
  const client = await redis();
  if (!client) return false;
  await client.set(key, JSON.stringify(value));
  return true;
}

export async function getUser(id: number): Promise<ForexUser | undefined> {
  return read<ForexUser>(`forex:user:${id}`);
}

export async function saveUser(user: ForexUser): Promise<boolean> {
  const saved = await write(`forex:user:${user.telegram_id}`, user);
  if (!saved) return false;
  const ids = (await read<number[]>("forex:users")) ?? [];
  if (!ids.includes(user.telegram_id)) await write("forex:users", [...ids, user.telegram_id]);
  return true;
}

export async function activeSignals(): Promise<Signal[]> {
  const ids = (await read<string[]>("forex:signals")) ?? [];
  const records = await Promise.all(ids.map((id) => read<Signal>(`forex:signal:${id}`)));
  return records.filter((signal): signal is Signal => Boolean(signal && signal.status === "open"));
}

export async function getSignal(id: string): Promise<Signal | undefined> {
  return read<Signal>(`forex:signal:${id}`);
}

export async function saveSignal(signal: Signal): Promise<boolean> {
  const saved = await write(`forex:signal:${signal.id}`, signal);
  if (!saved) return false;
  const ids = (await read<string[]>("forex:signals")) ?? [];
  if (!ids.includes(signal.id)) await write("forex:signals", [...ids, signal.id]);
  return true;
}

export async function subscribedUsers(): Promise<ForexUser[]> {
  const ids = (await read<number[]>("forex:users")) ?? [];
  const records = await Promise.all(ids.map(getUser));
  return records.filter((user): user is ForexUser => Boolean(user));
}

export async function userCount(): Promise<number> {
  return ((await read<number[]>("forex:users")) ?? []).length;
}

export async function setDefaultRisk(risk: number): Promise<boolean> {
  return write("forex:settings", { defaultRisk: risk });
}
