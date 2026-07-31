import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  ChevronDown,
  CheckCircle2,
  LockKeyhole,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  ExternalLink
} from 'lucide-react';
import { lunarApi } from '../services/lunarApi';

const STARTER_MESSAGE = {
  id: 'starter',
  role: 'assistant',
  content: 'Chào bạn, mình là Lunar AI. Mình có thể hướng dẫn sử dụng website, giải thích kết quả quét, giúp bạn sửa lỗi an toàn, hoặc chuyển thông tin liên hệ tới Email (nluan5517@gmail.com) & Zalo (0969822591).'
};

const QUICK_PROMPTS = [
  'Tóm tắt rủi ro dự án đang mở',
  'Hướng dẫn quét code',
  'Liên hệ Email nluan5517@gmail.com',
  'Kênh hỗ trợ Zalo / SĐT 0969822591'
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
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'contact_form'
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

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: '',
    subject: 'Cần hỗ trợ từ Lunar.dev',
    message: ''
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState('');
  const [contactError, setContactError] = useState('');

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
    if (currentUser) {
      setContactForm((prev) => ({
        ...prev,
        name: prev.name || currentUser.name || '',
        email: prev.email || currentUser.email || ''
      }));
    }
  }, [currentUser]);

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
    if (!isOpen || activeTab !== 'chat') return;
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [isOpen, messages, loading, activeTab]);

  useEffect(() => {
    if (isOpen && !initializing && activeTab === 'chat') {
      window.setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen, initializing, activeTab]);

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

    if (activeTab !== 'chat') {
      setActiveTab('chat');
    }

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

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.message.trim()) {
      setContactError('Vui lòng nhập nội dung hỗ trợ.');
      return;
    }
    setContactSubmitting(true);
    setContactError('');
    setContactSuccess('');

    try {
      const res = await lunarApi.sendSupportContact({
        name: contactForm.name,
        email: contactForm.email,
        phone: contactForm.phone,
        subject: contactForm.subject,
        message: contactForm.message
      });
      setContactSuccess(res.message || 'Gửi yêu cầu thành công tới nluan5517@gmail.com!');
      setContactForm((prev) => ({ ...prev, message: '' }));
    } catch (err) {
      setContactError(err.message || 'Không thể gửi email lúc này. Vui lòng nhắn qua Zalo 0969822591.');
    } finally {
      setContactSubmitting(false);
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
                <small>Trợ lý bảo mật & Hỗ trợ</small>
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

          {/* Quick Contact Action Bar */}
          <div className="lunar-assistant-quick-contacts">
            <button
              type="button"
              className={`lunar-assistant-contact-badge ${activeTab === 'chat' ? 'zalo' : ''}`}
              onClick={() => setActiveTab('chat')}
              style={{ background: activeTab === 'chat' ? '#2563eb' : '#1e293b', color: '#fff' }}
            >
              <MessageSquare size={13} />
              Chat AI
            </button>
            <button
              type="button"
              className={`lunar-assistant-contact-badge mail`}
              onClick={() => setActiveTab(activeTab === 'contact_form' ? 'chat' : 'contact_form')}
            >
              <Mail size={13} />
              Form Mail
            </button>
            <a
              href="https://zalo.me/0969822591"
              target="_blank"
              rel="noopener noreferrer"
              className="lunar-assistant-contact-badge zalo"
              title="Chat Zalo 0969822591"
            >
              <MessageCircle size={13} />
              Zalo
              <ExternalLink size={10} />
            </a>
            <a
              href="tel:0969822591"
              className="lunar-assistant-contact-badge phone"
              title="Gọi hotline 0969822591"
            >
              <Phone size={13} />
              0969822591
            </a>
          </div>

          {!currentUser && (
            <div className="lunar-assistant-guest-note">
              <LockKeyhole size={15} />
              <span>Đang dùng trợ lý nội bộ, không gửi dữ liệu sang AI ngoài.</span>
              <button type="button" onClick={onOpenAuth}>Đăng nhập</button>
            </div>
          )}

          {activeTab === 'contact_form' ? (
            <div className="lunar-assistant-contact-form-panel">
              <h4>
                <Mail size={16} style={{ color: '#c084fc' }} />
                Gửi Mail Hỗ Trợ tới nluan5517@gmail.com
              </h4>
              <p style={{ fontSize: '0.73rem', color: '#94a3b8', margin: 0 }}>
                Nhập thông tin bên dưới để gửi email trực tiếp cho chuyên gia tư vấn bảo mật của Lunar.
              </p>

              {contactSuccess && (
                <div className="lunar-assistant-contact-success">
                  <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={15} />
                    {contactSuccess}
                  </span>
                  <span>Hotline / Zalo hỗ trợ tức thì: <strong>0969822591</strong></span>
                </div>
              )}

              {contactError && (
                <div className="lunar-assistant-error">
                  {contactError}
                </div>
              )}

              <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="lunar-assistant-form-group">
                  <label htmlFor="contact-name">Họ & Tên</label>
                  <input
                    id="contact-name"
                    type="text"
                    placeholder="Nhập họ tên của bạn"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  />
                </div>
                <div className="lunar-assistant-form-group">
                  <label htmlFor="contact-email">Email / Số điện thoại</label>
                  <input
                    id="contact-email"
                    type="text"
                    placeholder="Nhập email hoặc SĐT để phản hồi"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  />
                </div>
                <div className="lunar-assistant-form-group">
                  <label htmlFor="contact-subject">Chủ đề cần tư vấn</label>
                  <input
                    id="contact-subject"
                    type="text"
                    placeholder="Ví dụ: Tư vấn vá lỗi SAST / Báo giá gói Enterprise"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  />
                </div>
                <div className="lunar-assistant-form-group">
                  <label htmlFor="contact-message">Nội dung chi tiết</label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    placeholder="Mô tả nội dung hoặc câu hỏi bạn cần hỗ trợ..."
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="lunar-assistant-form-submit"
                  disabled={contactSubmitting}
                >
                  {contactSubmitting ? <RotateCcw size={15} className="lunar-assistant-spin" /> : <Send size={15} />}
                  {contactSubmitting ? 'Đang gửi mail...' : 'Gửi tới nluan5517@gmail.com'}
                </button>
              </form>
            </div>
          ) : (
            <>
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
                        <div className="lunar-assistant-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                          {message.content}
                        </div>
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
                  placeholder="Hỏi AI hoặc gõ 'liên hệ' để lấy SĐT / Zalo / Mail…"
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
                Không gửi mật khẩu hay token. Email hỗ trợ: <strong>nluan5517@gmail.com</strong>
              </div>
            </>
          )}
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
