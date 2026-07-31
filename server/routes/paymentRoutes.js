const express = require('express');
const crypto = require('crypto');
const { verifyToken } = require('../middleware/auth');
const { paymentRateLimiter } = require('../middleware/rateLimiter');
const { getPool } = require('../db/connection');
const { getPlan, listPublicPlans } = require('../services/planCatalog');
const { webhookTimestampIsFresh } = require('../services/paymentWebhookPolicy');

const router = express.Router();

// In-memory fallback state for dev / testing when DB is offline
const paymentsMemory = new Map();
const userSubscriptionsMemory = new Map();

router.get('/plans', (req, res) => {
  res.json({
    success: true,
    source: 'server-plan-catalog',
    plans: listPublicPlans()
  });
});

function signatureMatches(rawBody, suppliedSignature, secret) {
  if (!rawBody || !secret || !suppliedSignature) return false;
  const normalized = String(suppliedSignature).replace(/^sha256=/i, '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const suppliedBuffer = Buffer.from(normalized, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return suppliedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function normalizeGatewayStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (['PAID', 'SUCCESS', 'SUCCEEDED', 'COMPLETED'].includes(normalized)) return 'SUCCESS';
  if (['FAILED', 'CANCELLED', 'CANCELED', 'EXPIRED'].includes(normalized)) return 'FAILED';
  return null;
}

/**
 * Helper to generate dynamic VietQR URL
 * VietQR syntax format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact2.png?amount=<AMOUNT>&addInfo=<CONTENT>&accountName=<NAME>
 */
function generateVietQRUrl(bankId, accountNo, amount, content, accountName) {
  const encodedContent = encodeURIComponent(content);
  const encodedName = encodeURIComponent(accountName);
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodedContent}&accountName=${encodedName}`;
}

/**
 * POST /api/v1/payment/create-order
 * Khởi tạo đơn hàng thanh toán nâng cấp gói cước
 */
router.post('/create-order', verifyToken, paymentRateLimiter, async (req, res) => {
  try {
    const { tier, paymentMethod } = req.body;
    const userId = req.user ? req.user.id : 'guest-user';
    const userEmail = req.user ? req.user.email : 'user@lunar.dev';

    const selectedPlan = getPlan(tier);
    if (!selectedPlan || selectedPlan.id === 'FREE') {
      return res.status(400).json({ success: false, error: 'Gói cước không hợp lệ. Chỉ chấp nhận PRO hoặc ENTERPRISE.' });
    }

    const method = paymentMethod === 'CARD' ? 'CARD' : 'VIETQR';
    const amount = selectedPlan.amount;
    const randomId = crypto.randomBytes(6).toString('hex').toUpperCase();
    const orderCode = `LUNAR-${selectedPlan.id}-${randomId}`;
    const transferContent = `LUNAR ${selectedPlan.id} ${randomId}`;
    const bankId = String(process.env.PAYMENT_BANK_ID || '').trim();
    const accountNo = String(process.env.PAYMENT_ACCOUNT_NO || '').trim();
    const accountName = String(process.env.PAYMENT_ACCOUNT_NAME || '').trim();
    if (!bankId || !accountNo || !accountName) {
      return res.status(503).json({ success: false, error: 'Payment beneficiary is not configured.' });
    }

    const qrUrl = generateVietQRUrl(
      bankId,
      accountNo,
      amount,
      transferContent,
      accountName
    );

    const paymentOrder = {
      id: `pay-${Date.now()}`,
      userId,
      userEmail,
      orderCode,
      amount,
      currency: 'VND',
      tierTarget: selectedPlan.id,
      paymentMethod: method,
      transferContent,
      status: 'PENDING',
      qrUrl,
      bankInfo: {
        bankId,
        accountNumber: accountNo,
        accountName
      },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 phút đếm ngược
    };

    const pool = getPool();
    if (!pool && process.env.NODE_ENV === 'production') {
      return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
    }
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO payments (user_id, order_code, amount, tier_target, payment_method, transfer_content, status, qr_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [userId, orderCode, amount, selectedPlan.id, method, transferContent, 'PENDING', qrUrl]
        );
      } catch (dbErr) {
        req.log?.error('Unable to persist payment order.', dbErr, 503);
        return res.status(503).json({ success: false, error: 'Unable to persist payment order.' });
      }
    }
    paymentsMemory.set(orderCode, paymentOrder);

    return res.json({
      success: true,
      message: 'Khởi tạo đơn hàng thanh toán thành công.',
      order: paymentOrder
    });
  } catch (error) {
    req.log?.error('Payment order creation failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi tạo đơn hàng thanh toán.' });
  }
});

/**
 * GET /api/v1/payment/status/:orderCode
 * Kiểm tra trạng thái đơn hàng thanh toán
 */
router.get('/status/:orderCode', verifyToken, async (req, res) => {
  try {
    const { orderCode } = req.params;
    let order = paymentsMemory.get(orderCode);

    const pool = getPool();
    if (pool) {
      try {
        const dbRes = await pool.query(
          `SELECT * FROM payments
           WHERE order_code = $1
             AND ($2 = 'ADMIN' OR user_id = $3)`,
          [orderCode, req.user.role, req.user.id]
        );
        if (dbRes.rows.length > 0) {
          const row = dbRes.rows[0];
          order = {
            userId: row.user_id,
            orderCode: row.order_code,
            amount: row.amount,
            tierTarget: row.tier_target,
            paymentMethod: row.payment_method,
            status: row.status,
            createdAt: row.created_at
          };
        }
      } catch (dbErr) {
        req.log?.warn('PostgreSQL payment lookup fallback activated.', dbErr);
      }
    }

    if (order && req.user.role !== 'ADMIN' && String(order.userId) !== String(req.user.id)) {
      order = null;
    }

    if (!order) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy thông tin đơn hàng.' });
    }

    return res.json({
      success: true,
      orderCode: order.orderCode,
      status: order.status,
      tierTarget: order.tierTarget,
      amount: order.amount
    });
  } catch (error) {
    req.log?.error('Payment status lookup failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Lỗi khi tra cứu trạng thái thanh toán.' });
  }
});

/**
 * POST /api/v1/payment/webhook
 * Provider-neutral payment confirmation endpoint.
 * Signature: HMAC-SHA256(raw request body, PAYMENT_WEBHOOK_SECRET)
 * Header: x-lunar-signature: sha256=<hex digest>
 */
router.post('/webhook', async (req, res) => {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || secret.length < 16) {
    return res.status(503).json({ success: false, error: 'Payment webhook is not configured.' });
  }
  const suppliedSignature = req.get('x-lunar-signature') || req.get('x-webhook-signature');
  if (!signatureMatches(req.rawBody, suppliedSignature, secret)) {
    return res.status(401).json({ success: false, error: 'Invalid payment webhook signature.' });
  }
  if (!webhookTimestampIsFresh(req.body?.timestamp)) {
    return res.status(400).json({
      success: false,
      error: 'Payment webhook timestamp is missing, expired, or in the future.'
    });
  }

  const orderCode = String(req.body?.orderCode || '').trim();
  const eventId = String(req.body?.eventId || req.body?.transactionId || '').trim();
  const providerReference = String(req.body?.transactionId || eventId).trim();
  const status = normalizeGatewayStatus(req.body?.status);
  const amount = Number(req.body?.amount);
  if (!orderCode || !eventId || !providerReference || !status || !Number.isSafeInteger(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'eventId, transactionId, orderCode, amount và trạng thái payment hợp lệ là bắt buộc.'
    });
  }

  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const payloadHash = crypto.createHash('sha256').update(req.rawBody).digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingEvent = await client.query(
      'SELECT status FROM payment_webhook_events WHERE event_id = $1 FOR UPDATE',
      [eventId]
    );
    if (existingEvent.rows[0]) {
      await client.query('COMMIT');
      return res.json({
        success: true,
        idempotent: true,
        orderCode,
        status: existingEvent.rows[0].status
      });
    }

    const paymentResult = await client.query(
      `SELECT id, user_id, amount, tier_target, status
       FROM payments
       WHERE order_code = $1
       FOR UPDATE`,
      [orderCode]
    );
    const payment = paymentResult.rows[0];
    if (!payment) {
      await client.query(
        `INSERT INTO payment_webhook_events (event_id, order_code, payload_hash, status, correlation_id)
         VALUES ($1, $2, $3, 'ORDER_NOT_FOUND', $4)`,
        [eventId, orderCode, payloadHash, req.correlationId]
      );
      await client.query('COMMIT');
      return res.status(404).json({ success: false, error: 'Đơn hàng không tồn tại.' });
    }
    if (Number(payment.amount) !== amount) {
      await client.query(
        `INSERT INTO payment_webhook_events (event_id, order_code, payload_hash, status, correlation_id)
         VALUES ($1, $2, $3, 'AMOUNT_MISMATCH', $4)`,
        [eventId, orderCode, payloadHash, req.correlationId]
      );
      await client.query('COMMIT');
      return res.status(409).json({ success: false, error: 'Số tiền xác nhận không khớp đơn hàng.' });
    }

    if (payment.status === 'SUCCESS') {
      await client.query(
        `INSERT INTO payment_webhook_events (event_id, order_code, payload_hash, status, correlation_id)
         VALUES ($1, $2, $3, 'SUCCESS', $4)`,
        [eventId, orderCode, payloadHash, req.correlationId]
      );
      await client.query('COMMIT');
      return res.json({
        success: true,
        idempotent: true,
        orderCode,
        status: 'SUCCESS'
      });
    }

    await client.query(
      `UPDATE payments
       SET status = $1::varchar,
           provider_reference = $2,
           webhook_payload_hash = $3,
           confirmed_at = CASE WHEN $1::varchar = 'SUCCESS' THEN CURRENT_TIMESTAMP ELSE confirmed_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [status, providerReference, payloadHash, payment.id]
    );
    if (status === 'SUCCESS') {
      await client.query(
        `UPDATE users
         SET tier = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [payment.tier_target, payment.user_id]
      );
      await client.query(
        `INSERT INTO subscriptions (user_id, tier, started_at, auto_renew)
         VALUES ($1, $2, CURRENT_TIMESTAMP, FALSE)`,
        [payment.user_id, payment.tier_target]
      );
    }
    await client.query(
      `INSERT INTO payment_webhook_events (event_id, order_code, payload_hash, status, correlation_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [eventId, orderCode, payloadHash, status, req.correlationId]
    );
    await client.query('COMMIT');
    paymentsMemory.set(orderCode, {
      ...(paymentsMemory.get(orderCode) || {}),
      orderCode,
      userId: payment.user_id,
      tierTarget: payment.tier_target,
      amount,
      status
    });
    if (status === 'SUCCESS') {
      userSubscriptionsMemory.set(payment.user_id, {
        tier: payment.tier_target,
        updatedAt: new Date().toISOString()
      });
    }
    return res.json({
      success: true,
      idempotent: false,
      orderCode,
      status,
      tierGranted: status === 'SUCCESS' ? payment.tier_target : null
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Mã giao dịch gateway đã được dùng cho đơn hàng khác.'
      });
    }
    req.log?.error('Payment webhook processing failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Không thể xử lý xác nhận thanh toán.' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/v1/payment/mock-webhook
 * Webhook mô phỏng xác nhận thanh toán (Mock Engine cho QA Circuit Breaker & Testing)
 */
if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_PAYMENT_MOCK === 'true') {
router.post('/mock-webhook', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ success: false, error: 'Payment mock is disabled.' });
    }

    const { orderCode, simulateSuccess = true } = req.body;

    if (!orderCode) {
      return res.status(400).json({ success: false, error: 'orderCode là bắt buộc.' });
    }

    let order = paymentsMemory.get(orderCode);

    if (!order) {
      const pool = getPool();
      if (pool) {
        const dbRes = await pool.query(`SELECT * FROM payments WHERE order_code = $1`, [orderCode]);
        if (dbRes.rows.length > 0) {
          const row = dbRes.rows[0];
          order = {
            orderCode: row.order_code,
            userId: row.user_id,
            tierTarget: row.tier_target,
            status: row.status
          };
        }
      }
    }

    if (!order) {
      return res.status(404).json({ success: false, error: 'Đơn hàng không tồn tại.' });
    }

    const newStatus = simulateSuccess ? 'SUCCESS' : 'FAILED';
    order.status = newStatus;
    paymentsMemory.set(orderCode, order);

    // Save subscription memory
    if (simulateSuccess) {
      userSubscriptionsMemory.set(order.userId, {
        tier: order.tierTarget,
        updatedAt: new Date().toISOString()
      });

      // Update DB if pool connected
      const pool = getPool();
      if (pool) {
        try {
          await pool.query(
            `UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE order_code = $2`,
            [newStatus, orderCode]
          );
          await pool.query(
            `UPDATE users SET tier = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [order.tierTarget, order.userId]
          );
        } catch (dbErr) {
          req.log?.warn('PostgreSQL payment webhook fallback activated.', dbErr);
        }
      }
    }

    return res.json({
      success: true,
      message: `[MOCK WEBHOOK] Giao dịch ${orderCode} đã cập nhật trạng thái: ${newStatus}`,
      orderCode,
      status: newStatus,
      tierGranted: simulateSuccess ? order.tierTarget : null
    });
  } catch (error) {
    req.log?.error('Mock payment webhook failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Lỗi khi xử lý mock webhook.' });
  }
});
}

/**
 * GET /api/v1/payment/subscription
 * Lấy thông tin gói cước hiện tại của người dùng
 */
router.get('/subscription', verifyToken, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'guest-user';
    let currentTier = req.user ? req.user.tier : 'FREE';

    if (userSubscriptionsMemory.has(userId)) {
      currentTier = userSubscriptionsMemory.get(userId).tier;
    }

    return res.json({
      success: true,
      tier: currentTier,
      userId,
      quotaInfo: {
        scansLimit: currentTier === 'FREE' ? 5 : 'UNLIMITED',
        supportChannel: currentTier === 'FREE' ? 'Help Center' : (currentTier === 'PRO' ? 'Email & Zalo VIP' : '24/7 Dedicated Architect')
      }
    });
  } catch (error) {
    req.log?.error('Subscription lookup failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Lỗi lấy thông tin gói cước.' });
  }
});

module.exports = router;
