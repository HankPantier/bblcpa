import { initBotId } from 'botid/client/core'

// Vercel BotID — invisible bot detection for the built-in contact form route.
// Runs a client-side challenge whose solution is attached to POSTs to the
// protected path; the route verifies it server-side via checkBotId(). Inert in
// local dev (always classifies isBot:false) and on non-Vercel hosts, so it's
// safe to ship enabled by default. Basic mode is free; Deep Analysis is an
// opt-in dashboard toggle (Vercel → Firewall → Rules).
initBotId({
  protect: [{ path: '/api/contact', method: 'POST' }],
})
