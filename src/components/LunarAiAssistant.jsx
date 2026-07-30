import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  ChevronDown,
  LockKeyhole,
  MessageCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  User
} from 'lucide-react';
import { lunarApi } from '../services/lunarApi';

const STARTER_MESSAGE = {
  id: 'starter',
  role: 'assistant',
  content: 'Chào bạn, mình là Lunar AI. Mình có thể hướng dẫn sử dụng website, giải thích kết quả quét và giúp bạn lên thứ tự sửa lỗi an toàn.'
};

const QUICK_PROMPTS = [
  'Tóm tắt rủi ro dự án đang mở',
  'Hướng dẫn quét code',
  'Cách kết nối GitHub',
  'Cách quét repository GitHub'
];

function messageId(role) {
  return `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function LunarAiAssistant({
  currentUser,
  projectContext,
  onOpenAuth
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([STARTER_MESSAGE]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [initializedFor, setInitializedFor] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState({
    mode: 'native',
    provider: 'Lunar Native',
    conversationHistory: false
  });
  const scrollAnchorRef = useRef(null);
  const inputRef = useRef(null);

  const identityKey = currentUser?.id || 'guest';

  useEffect(() => {
    setMessages([STARTER_MESSAGE]);
    setConversationId(null);
    setInitializedFor(null);
    setError('');
  }, [identityKey]);

  useEffect(() => {
    if (!isOpen || initializedFor === identityKey) return undefined;
    let active = true;
    setInitializing(true);

    const statusRequest = lunarApi.getAssistantStatus();
    const historyRequest = currentUser
      ? lunarApi.getAssistantHistory()
      : Promise.resolve({ conversation: null, messages: [] });

    Promise.all([statusRequest, historyRequest])
      .then(([statusResponse, historyResponse]) => {
        if (!active) return;
        setStatus(statusResponse);
        if (historyResponse.messages?.length) {
          setMessages(historyResponse.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content
          })));
          setConversationId(historyResponse.conversation?.id || null);
        }
        setInitializedFor(identityKey);
      })
      .catch(() => {
        if (!active) return;
        setError('Không thể tải lịch sử, nhưng bạn vẫn có thể bắt đầu cuộc trò chuyện mới.');
        setInitializedFor(identityKey);
      })
      .finally(() => {
        if (active) setInitializing(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, initializedFor, identityKey, currentUser]);

  useEffect(() => {
    if (!isOpen) return;
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [isOpen, messages, loading]);

  useEffect(() => {
    if (isOpen && !initializing) {
      window.setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen, initializing]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  const sendMessage = async (text = input) => {
    const cleaned = text.trim();
    if (!cleaned || loading) return;

    const userMessage = {
      id: messageId('user'),
      role: 'user',
      content: cleaned
    };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const response = await lunarApi.sendAssistantMessage({
        message: cleaned,
        conversationId,
        context: projectContext
      });
      setConversationId(response.conversationId || null);
      setStatus((current) => ({
        ...current,
        mode: response.mode,
        provider: response.mode === 'gateway' ? 'AI Gateway' : 'Lunar Native'
      }));
      setMessages((current) => [
        ...current,
        {
          id: messageId('assistant'),
          role: 'assistant',
          content: response.reply
        }
      ]);
    } catch (requestError) {
      setMessages((current) => current.filter((message) => message.id !== userMessage.id));
      setError(requestError.message || 'Trợ lý đang tạm gián đoạn. Vui lòng thử lại.');
      setInput(cleaned);
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = async () => {
    if (loading) return;
    setError('');
    try {
      if (currentUser && conversationId) {
        await lunarApi.clearAssistantHistory(conversationId);
      }
      setConversationId(null);
      setMessages([STARTER_MESSAGE]);
      setInput('');
    } catch (requestError) {
      setError(requestError.message || 'Không thể xóa cuộc trò chuyện.');
    }
  };

  return (
    <div className="lunar-assistant-shell">
      {isOpen && (
        <section
          className="lunar-assistant-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="lunar-assistant-title"
          data-testid="lunar-ai-panel"
        >
          <header className="lunar-assistant-header">
            <div className="lunar-assistant-brand">
              <span className="lunar-assistant-brand-icon" aria-hidden="true">
                <Bot size={20} />
              </span>
              <div>
                <div className="lunar-assistant-title-row">
                  <strong id="lunar-assistant-title">Lunar AI</strong>
                  <span className={`lunar-assistant-status ${status.mode}`}>
                    {status.mode === 'gateway' ? <Sparkles size={11} /> : <ShieldCheck size={11} />}
                    {status.mode === 'gateway' ? 'AI nâng cao' : 'Nội bộ'}
                  </span>
                </div>
                <small>Trợ lý bảo mật phòng thủ</small>
              </div>
            </div>
            <div className="lunar-assistant-header-actions">
              <button
                type="button"
                className="lunar-assistant-icon-button"
                onClick={clearConversation}
                aria-label="Xóa cuộc trò chuyện"
                title="Xóa cuộc trò chuyện"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                className="lunar-assistant-icon-button"
                onClick={() => setIsOpen(false)}
                aria-label="Thu nhỏ trợ lý"
                title="Thu nhỏ"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </header>

          {!currentUser && (
            <div className="lunar-assistant-guest-note">
              <LockKeyhole size={15} />
              <span>Đang dùng trợ lý nội bộ, không gửi dữ liệu sang AI ngoài.</span>
              <button type="button" onClick={onOpenAuth}>Đăng nhập</button>
            </div>
          )}

          <div
            className="lunar-assistant-messages"
            aria-live="polite"
            aria-busy={loading || initializing}
          >
            {initializing ? (
              <div className="lunar-assistant-loading-history">
                <RotateCcw size={16} className="lunar-assistant-spin" />
                Đang tải hội thoại…
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`lunar-assistant-message-row ${message.role}`}
                  >
                    <span className="lunar-assistant-avatar" aria-hidden="true">
                      {message.role === 'assistant' ? <Bot size={15} /> : <User size={15} />}
                    </span>
                    <div className="lunar-assistant-bubble">{message.content}</div>
                  </div>
                ))}

                {messages.length <= 1 && (
                  <div className="lunar-assistant-prompts" aria-label="Câu hỏi gợi ý">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        type="button"
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        disabled={loading}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {loading && (
                  <div className="lunar-assistant-message-row assistant">
                    <span className="lunar-assistant-avatar" aria-hidden="true">
                      <Bot size={15} />
                    </span>
                    <div className="lunar-assistant-typing" aria-label="Lunar AI đang trả lời">
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={scrollAnchorRef} />
          </div>

          {error && (
            <div className="lunar-assistant-error" role="alert">
              {error}
            </div>
          )}

          <form
            className="lunar-assistant-composer"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, 4000))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder="Hỏi Lunar AI về bảo mật…"
              aria-label="Tin nhắn cho Lunar AI"
              disabled={loading || initializing}
            />
            <button
              type="submit"
              aria-label="Gửi tin nhắn"
              disabled={!input.trim() || loading || initializing}
            >
              <Send size={17} />
            </button>
          </form>
          <div className="lunar-assistant-disclaimer">
            Không gửi mật khẩu, token hoặc dữ liệu bí mật.
          </div>
        </section>
      )}

      <button
        type="button"
        className={`lunar-assistant-launcher ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? 'Đóng trợ lý Lunar AI' : 'Mở trợ lý Lunar AI'}
        aria-expanded={isOpen}
      >
        {isOpen ? <ChevronDown size={20} /> : <MessageCircle size={21} />}
        <span>Lunar AI</span>
      </button>
    </div>
  );
}
