import express from 'express';
import crypto from 'crypto';
import Organization from '../models/Organization.js';
import PLAN_FEATURES from '../config/planFeatures.js';

const router = express.Router();

// Paddle šalje raw body — mora biti prije express.json()
router.post('/paddle', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // 1. Verifikacija signature (Paddle v2 webhooks)
    const signature = req.headers['paddle-signature'];
    if (!signature || !verifyPaddleSignature(req.body, signature)) {
      console.warn('Paddle webhook: invalid signature');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const event = JSON.parse(req.body.toString());
    console.log(`Paddle webhook: ${event.event_type}`);

    switch (event.event_type) {
      case 'subscription.created':
        await handleSubscriptionCreated(event.data);
        break;
      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data);
        break;
      case 'subscription.canceled':
        await handleSubscriptionCanceled(event.data);
        break;
      case 'subscription.past_due':
        await handleSubscriptionPastDue(event.data);
        break;
      case 'transaction.completed':
        await handleTransactionCompleted(event.data);
        break;
      default:
        console.log(`Unhandled Paddle event: ${event.event_type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Paddle webhook error:', err);
    res.status(500).json({ message: 'Webhook processing error' });
  }
});

function verifyPaddleSignature(rawBody, signature) {
  if (!process.env.PADDLE_WEBHOOK_SECRET) return true; // Skip u dev modu

  // Paddle v2: h1=timestamp;hash format
  const parts = signature.split(';');
  const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1];
  const h1 = parts.find(p => p.startsWith('h1='))?.split('=')[1];

  if (!ts || !h1) return false;

  const signed = `${ts}:${rawBody}`;
  const expected = crypto
    .createHmac('sha256', process.env.PADDLE_WEBHOOK_SECRET)
    .update(signed)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(expected));
}

// Plan mapping — povezuje Paddle price ID-ove sa planovima
const PLAN_MAP = {
  // TODO: Unesi prave Paddle price ID-ove za svaki plan
  // 'pri_xxx_starter': 'starter',
  // 'pri_yyy_professional': 'professional',
  // 'pri_zzz_business': 'business',
};

function getPlanFromPriceId(priceId) {
  const planKey = PLAN_MAP[priceId];
  if (!planKey) {
    console.error(`[Webhook] Nepoznat Paddle price ID: ${priceId}`);
    return { plan: 'starter', maxUsers: PLAN_FEATURES.starter.maxWorkers };
  }
  const features = PLAN_FEATURES[planKey];
  return { plan: planKey, maxUsers: features.maxWorkers };
}

async function handleSubscriptionCreated(data) {
  const customData = data.custom_data || {};
  const orgId = customData.organization_id;
  if (!orgId) return;

  const priceId = data.items?.[0]?.price?.id;
  const { plan, maxUsers } = getPlanFromPriceId(priceId);

  await Organization.findByIdAndUpdate(orgId, {
    paddleCustomerId: data.customer_id,
    paddleSubscriptionId: data.id,
    plan,
    planStatus: 'active',
    maxUsers,
    planExpiresAt: null,
  });

  console.log(`Subscription created for org ${orgId}, plan: ${plan}`);
}

async function handleSubscriptionUpdated(data) {
  const org = await Organization.findOne({ paddleSubscriptionId: data.id });
  if (!org) return;

  const priceId = data.items?.[0]?.price?.id;
  const { plan, maxUsers } = getPlanFromPriceId(priceId);

  org.plan = plan;
  org.maxUsers = maxUsers;
  org.planStatus = data.status;
  await org.save();
}

async function handleSubscriptionCanceled(data) {
  const org = await Organization.findOne({ paddleSubscriptionId: data.id });
  if (!org) return;

  org.planStatus = 'canceled';
  // Daj im pristup do kraja billing perioda
  org.planExpiresAt = data.current_billing_period?.ends_at
    ? new Date(data.current_billing_period.ends_at)
    : new Date();
  await org.save();

  console.log(`Subscription canceled for org ${org._id}`);
}

async function handleSubscriptionPastDue(data) {
  const org = await Organization.findOne({ paddleSubscriptionId: data.id });
  if (!org) return;

  org.planStatus = 'past_due';
  await org.save();
}

async function handleTransactionCompleted(data) {
  // Opciono: bilježi plaćanja, šalji email potvrdu
  console.log(`Transaction completed: ${data.id}`);
}

export default router;
