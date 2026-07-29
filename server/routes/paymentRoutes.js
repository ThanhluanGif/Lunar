const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { getPool } = require('../db/connection');

const router = express.Router();

// In-memory fallback state for dev / testing when DB is offline
const paymentsMemory = new Map();
const userSubscriptionsMemory = new Map();

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
router.post('/create-order', verifyToken, async (req, res) => {
  try {
    const { tier, paymentMethod } = req.body;
    const userId = req.user ? req.user.id : 'guest-user';
    const userEmail = req.user ? req.user.email : 'user@lunar.dev';

    if (!['PRO', 'ENTERPRISE'].includes(tier)) {
      return res.status(400).json({ success: false, error: 'Gói cước không hợp lệ. Chỉ chấp nhận PRO hoặc ENTERPRISE.' });
    }

    const method = paymentMethod === 'CARD' ? 'CARD' : 'VIETQR';
    const amount = tier === 'PRO' ? 290000 : 1500000;
    const randomId = Math.floor(100000 + Math.random() * 900000);
    const orderCode = `LUNAR-${tier}-${randomId}`;
    const transferContent = `LUNAR ${tier} ${randomId}`;

    const qrUrl = generateVietQRUrl(
      'MB',
      '0988888888',
      amount,
      transferContent,
      'LUNAR SECURITY CORP'
    );

    const paymentOrder = {
      id: `pay-${Date.now()}`,
      userId,
      userEmail,
      orderCode,
      amount,
      currency: 'VND',
      tierTarget: tier,
      paymentMethod: method,
      transferContent,
      status: 'PENDING',
      qrUrl,
      bankInfo: {
        bankName: 'Ngân hàng TMCP Quân Đội (MBBank)',
        accountNumber: '0988888888',
        accountName: 'LUNAR SECURITY CORP'
      },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 phút đếm ngược
    };

    // Save to memory
    paymentsMemory.set(orderCode, paymentOrder);

    // Save to PostgreSQL if pool available
    const pool = getPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO payments (user_id, order_code, amount, tier_target, payment_method, transfer_content, status, qr_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [userId, orderCode, amount, tier, method, transferContent, 'PENDING', qrUrl]
        );
      } catch (dbErr) {
        console.warn('⚠️ Postgres insert payment fallback to memory:', dbErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Khởi tạo đơn hàng thanh toán thành công.',
      order: paymentOrder
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
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
        console.warn('⚠️ Postgres select payment fallback to memory:', dbErr.message);
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
    console.error('Error fetching payment status:', error);
    return res.status(500).json({ success: false, error: 'Lỗi khi tra cứu trạng thái thanh toán.' });
  }
});

/**
 * POST /api/v1/payment/mock-webhook
 * Webhook mô phỏng xác nhận thanh toán (Mock Engine cho QA Circuit Breaker & Testing)
 */
router.post('/mock-webhook', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
      if (!webhookSecret) {
        return res.status(503).json({ success: false, error: 'Payment webhook is not configured.' });
      }
      if (req.get('x-webhook-secret') !== webhookSecret) {
        return res.status(401).json({ success: false, error: 'Invalid payment webhook signature.' });
      }
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
          console.warn('⚠️ Postgres update payment webhook fallback:', dbErr.message);
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
    console.error('Error handling mock webhook:', error);
    return res.status(500).json({ success: false, error: 'Lỗi khi xử lý mock webhook.' });
  }
});

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
        supportChannel: currentTier === 'FREE' ? 'Community Forum' : (currentTier === 'PRO' ? 'Email & Zalo VIP' : '24/7 Dedicated Architect')
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return res.status(500).json({ success: false, error: 'Lỗi lấy thông tin gói cước.' });
  }
});

module.exports = router;
