# ForexSignalBot — Bot specification

**Archetype:** finance

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

Provides real-time Forex trade signals with probability estimates (up to 95%), customizable risk settings, scheduled market digests, and on-demand pair analysis via Telegram. Paid subscription model with free tier for digest access.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- retail Forex traders
- action-oriented investors

## Success criteria

- Users receive real-time signals with clear execution buttons
- Subscribers access on-demand analysis and risk customization
- Admin chat receives subscription alerts and performance summaries

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open onboarding menu for subscription selection and risk settings
- **Request Analysis** (button, actor: user, callback: analysis:request) — Initiate on-demand currency pair analysis
  - inputs: currency_pair
  - outputs: analysis_report
- **View Active Signals** (button, actor: user, callback: signals:active) — List current open signals with execution options

## Flows

### Onboarding
_Trigger:_ /start

1. Display subscription options (free/paid)
2. Collect risk percentage preference
3. Select preferred currency pairs

_Data touched:_ User

### Signal Delivery
_Trigger:_ New market event

1. Generate timestamped signal message
2. Add execution buttons (Mark Executed/Snooze)
3. Send to subscribed users

_Data touched:_ Signal

### Digest Delivery
_Trigger:_ Daily 8:00 AM UTC

1. Compile open/closed signals summary
2. Add market commentary
3. Send to all users

_Data touched:_ Digest

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram user with subscription status and preferences
  - fields: telegram_id, subscription_type, risk_percentage, preferred_pairs
- **Signal** _(retention: persistent)_ — Trade alert with execution parameters
  - fields: pair, direction, entry_price, stop_loss, take_profit, confidence, timestamp
- **Digest** _(retention: session)_ — Daily market summary
  - fields: open_signals, closed_trades, market_commentary

## Integrations

- **Telegram** (required) — Bot API messaging and notifications
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Manage subscription tiers
- Monitor signal performance metrics
- Adjust default risk percentage
- View admin chat alerts

## Notifications

- Real-time signal alerts with execution buttons
- Daily digest summaries
- Admin alerts for new subscriptions and system status

## Permissions & privacy

- User data encrypted at rest
- Signal data anonymized in analytics
- Subscription consent required for paid features

## Edge cases

- User has no active signals to display
- Analysis request for unsupported currency pair
- Subscription payment failure notification handling

## Required tests

- End-to-end onboarding flow with subscription selection
- Signal delivery with button interactions
- Digest scheduling across time zones
- Admin alert visibility in owner chat

## Assumptions

- Payment processing handled externally via linked platform
- Signal accuracy claims displayed with proper disclaimers
- Market data sourced from external API (not specified)
