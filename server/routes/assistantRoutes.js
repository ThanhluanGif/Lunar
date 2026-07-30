const express = require('express');
const { optionalToken, verifyToken } = require('../middleware/auth');
const { assistantRateLimiter } = require('../middleware/rateLimiter');
const { queryDb } = require('../db/connection');
const {
  MAX_MESSAGE_LENGTH,
  MAX_HISTORY_MESSAGES,
  getGatewayConfiguration,
  generateAssistantReply
} = require('../services/aiAssistantService');

const router = express.Router();

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function loadConversation(conversationId, userId) {
  if (!isUuid(conversationId)) return null;
  const result = await queryDb(
    `SELECT id, title, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM assistant_conversations
     WHERE id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
  return result?.rows?.[0] || null;
}

async function createConversation(userId, message) {
  const result = await queryDb(
    `INSERT INTO assistant_conversations (user_id, title)
     VALUES ($1, $2)
     RETURNING id, title, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [userId, message.slice(0, 80)]
  );
  return result?.rows?.[0] || null;
}

async function loadMessages(conversationId, userId, limit = 60) {
  if (!isUuid(conversationId)) return [];
  const result = await queryDb(
    `SELECT id, role, content, provider, model, created_at AS "createdAt"
     FROM (
       SELECT m.id, m.sequence_id, m.role, m.content, m.provider, m.model, m.created_at
       FROM assistant_messages m
       JOIN assistant_conversations c ON c.id = m.conversation_id
       WHERE m.conversation_id = $1 AND c.user_id = $2
       ORDER BY m.sequence_id DESC
       LIMIT $3
     ) recent
     ORDER BY sequence_id ASC`,
    [conversationId, userId, Math.max(1, Math.min(Number(limit) || 60, 100))]
  );
  return result?.rows || [];
}

router.get('/status', optionalToken, (req, res) => {
  const gateway = getGatewayConfiguration();
  const gatewayAvailable = Boolean(req.user && gateway.configured);
  return res.json({
    success: true,
    authenticated: Boolean(req.user),
    mode: gatewayAvailable ? 'gateway' : 'native',
    provider: gatewayAvailable ? 'Vercel AI Gateway' : 'Lunar Native',
    model: gatewayAvailable ? gateway.model : 'lunar-assistant-rules-v1',
    conversationHistory: Boolean(req.user)
  });
});

router.post('/chat', optionalToken, assistantRateLimiter, async (req, res) => {
  try {
    const message = req.body?.message;
    const context = req.body?.context;
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Tin nhắn không được để trống.' });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự.`
      });
    }
    let conversation = null;
    let history = [];

    if (req.user) {
      if (req.body?.conversationId) {
        conversation = await loadConversation(req.body.conversationId, req.user.id);
        if (!conversation) {
          return res.status(404).json({
            success: false,
            error: 'Không tìm thấy hội thoại hoặc bạn không có quyền truy cập.'
          });
        }
      }
      if (!conversation) {
        conversation = await createConversation(req.user.id, String(message || 'Cuộc trò chuyện mới'));
      }
      if (conversation) {
        history = await loadMessages(conversation.id, req.user.id, MAX_HISTORY_MESSAGES);
      }
    }

    const answer = await generateAssistantReply({
      message,
      history,
      context,
      user: req.user
    });

    if (conversation) {
      await queryDb(
        `INSERT INTO assistant_messages
           (conversation_id, user_id, role, content, provider, model, metadata)
         VALUES
           ($1, $2, 'user', $3, NULL, NULL, '{}'::JSONB),
           ($1, $2, 'assistant', $4, $5, $6, $7::JSONB)`,
        [
          conversation.id,
          req.user.id,
          String(message).trim(),
          answer.reply,
          answer.provider,
          answer.model,
          JSON.stringify({ mode: answer.mode, usage: answer.usage, fallback: Boolean(answer.fallback) })
        ]
      );
      await queryDb(
        'UPDATE assistant_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
        [conversation.id, req.user.id]
      );
      await queryDb(
        `INSERT INTO ai_usage_logs
           (user_id, provider, model, operation, input_characters)
         VALUES ($1, $2, $3, 'assistant_chat', $4)`,
        [req.user.id, answer.provider, answer.model, String(message).length]
      );
    }

    return res.json({
      success: true,
      conversationId: conversation?.id || null,
      ...answer
    });
  } catch (error) {
    const invalidInput = ['INVALID_MESSAGE', 'MESSAGE_TOO_LONG'].includes(error.code);
    console.error('Assistant chat failed:', invalidInput ? error.message : error);
    return res.status(invalidInput ? 400 : 500).json({
      success: false,
      error: invalidInput ? error.message : 'Trợ lý đang tạm gián đoạn. Vui lòng thử lại.'
    });
  }
});

router.get('/history', verifyToken, async (req, res) => {
  try {
    let conversation = null;
    if (req.query.conversationId) {
      conversation = await loadConversation(req.query.conversationId, req.user.id);
    } else {
      const result = await queryDb(
        `SELECT id, title, created_at AS "createdAt", updated_at AS "updatedAt"
         FROM assistant_conversations
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [req.user.id]
      );
      conversation = result?.rows?.[0] || null;
    }

    if (!conversation) {
      return res.json({ success: true, conversation: null, messages: [] });
    }

    const messages = await loadMessages(conversation.id, req.user.id);
    return res.json({ success: true, conversation, messages });
  } catch (error) {
    console.error('Assistant history failed:', error);
    return res.status(500).json({ success: false, error: 'Không thể tải lịch sử trợ lý.' });
  }
});

router.delete('/history/:conversationId', verifyToken, async (req, res) => {
  if (!isUuid(req.params.conversationId)) {
    return res.status(400).json({ success: false, error: 'Mã hội thoại không hợp lệ.' });
  }
  try {
    const result = await queryDb(
      'DELETE FROM assistant_conversations WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.conversationId, req.user.id]
    );
    if (!result?.rows?.length) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy hội thoại.' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Assistant history deletion failed:', error);
    return res.status(500).json({ success: false, error: 'Không thể xóa lịch sử trợ lý.' });
  }
});

module.exports = router;
