import express from 'express';
import Stripe from 'stripe';
import { pool } from '../config/database';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// 1. Onboard service provider to Stripe Connect
router.post('/connect/onboard', async (req, res) => {
  try {
    const { userId, email } = req.body;

    const account = await stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        transfers: { requested: true },
      },
    });

    // Save stripe_account_id to DB
    await pool.query(
      'UPDATE users SET stripe_account_id = $1 WHERE id = $2',
      [account.id, userId]
    );

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/provider/onboard/refresh`,
      return_url: `${process.env.FRONTEND_URL}/provider/onboard/complete`,
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url, accountId: account.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Create payment intent (customer pays for service)
router.post('/payment/create', async (req, res) => {
  try {
    const { amount, providerStripeAccountId } = req.body;
    const platformFee = Math.round(amount * 0.10); // 10% platform fee

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      application_fee_amount: platformFee,
      transfer_data: {
        destination: providerStripeAccountId,
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Check provider onboarding status
router.get('/connect/status/:accountId', async (req, res) => {
  try {
    const account = await stripe.accounts.retrieve(req.params.accountId);
    res.json({
      isComplete: account.details_submitted,
      chargesEnabled: account.charges_enabled,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Stripe webhook
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']!;
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        const pi = event.data.object as Stripe.PaymentIntent;
        await pool.query(
          'UPDATE payments SET status = $1 WHERE stripe_payment_intent_id = $2',
          ['succeeded', pi.id]
        );
        break;
      case 'account.updated':
        const acct = event.data.object as Stripe.Account;
        await pool.query(
          'UPDATE users SET stripe_onboarding_complete = $1 WHERE stripe_account_id = $2',
          [acct.details_submitted, acct.id]
        );
        break;
    }

    res.json({ received: true });
  }
);

export default router;