const MC_SERVER = 'us2';
const MC_LIST_ID = '6fe538f47b';

async function subscribeToMailchimp(member, apiKey) {
  const { firstName, lastName, email, mobile, slot, howHeard } = member;
  await fetch(`https://${MC_SERVER}.api.mailchimp.com/3.0/lists/${MC_LIST_ID}/members`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: email.toLowerCase().trim(),
      status: 'subscribed',
      merge_fields: {
        FNAME: firstName,
        LNAME: lastName,
        PHONE: mobile,
        SLOT: SLOT_LABELS[slot] || slot,
        HOWHEARD: howHeard || '',
      },
      tags: ['Preview Night'],
    }),
  });
}

const SLOTS = [
  'nov4-630','nov4-700','nov4-730',
  'nov11-630','nov11-700','nov11-730',
  'nov13-630','nov13-700','nov13-730',
];
const SLOT_LABELS = {
  'nov4-630':  'Wednesday, Nov 4 at 6:30 pm',
  'nov4-700':  'Wednesday, Nov 4 at 7:00 pm',
  'nov4-730':  'Wednesday, Nov 4 at 7:30 pm',
  'nov11-630': 'Wednesday, Nov 11 at 6:30 pm',
  'nov11-700': 'Wednesday, Nov 11 at 7:00 pm',
  'nov11-730': 'Wednesday, Nov 11 at 7:30 pm',
  'nov13-630': 'Friday, Nov 13 at 6:30 pm',
  'nov13-700': 'Friday, Nov 13 at 7:00 pm',
  'nov13-730': 'Friday, Nov 13 at 7:30 pm',
};
const CAP = 15;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

// GET /api/rsvp — return slot availability
export async function onRequestGet({ env }) {
  const status = {};
  for (const slot of SLOTS) {
    const count = parseInt(await env.RSVP_STORE.get(`slot:${slot}:count`) || '0');
    status[slot] = { count, full: count >= CAP, remaining: Math.max(0, CAP - count) };
  }
  return json(status);
}

// OPTIONS — preflight
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors });
}

// POST /api/rsvp — submit RSVP
export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const { slot, firstName, lastName, email, mobile, guest, howHeard } = body;

  // Validate required fields
  if (!slot || !firstName || !lastName || !email || !mobile) {
    return json({ error: 'Please fill in all required fields.' }, 400);
  }
  if (!SLOTS.includes(slot)) {
    return json({ error: 'Invalid slot selected.' }, 400);
  }

  const guestCount = guest === 'yes' ? 2 : 1;

  // Check slot capacity (optimistic: read-check-write; good enough for low volume)
  const countKey = `slot:${slot}:count`;
  const currentCount = parseInt(await env.RSVP_STORE.get(countKey) || '0');

  if (currentCount + guestCount > CAP) {
    return json({ error: 'full', message: 'Sorry, that slot just filled up. Please choose another time.' }, 409);
  }

  // Increment count
  await env.RSVP_STORE.put(countKey, String(currentCount + guestCount));

  // Append registrant to list
  const listKey = `slot:${slot}:list`;
  const existing = JSON.parse(await env.RSVP_STORE.get(listKey) || '[]');
  existing.push({ firstName, lastName, email, mobile, guest: guest === 'yes', howHeard, ts: Date.now(), spots: guestCount });
  await env.RSVP_STORE.put(listKey, JSON.stringify(existing));

  // Subscribe to Mailchimp (non-blocking — don't fail the RSVP if this errors)
  // API key read from Cloudflare env secret MAILCHIMP_API_KEY
  const mcKey = env.MAILCHIMP_API_KEY;
  if (mcKey) {
    subscribeToMailchimp({ firstName, lastName, email, mobile, slot, howHeard }, mcKey).catch(() => {});
  }

  const slotLabel = SLOT_LABELS[slot];
  return json({
    success: true,
    slot: slotLabel,
    confirmation: `You're on the list for ${slotLabel}. 2990 Midway Drive, Suite A. Park in the shared lot. Founding memberships are open now: rapidcoldplunge.com/pricing.html#signup`,
  });
}
