// ChatWidget — the site-wide AI assistant. Replaces what used to be a
// floating "Order on WhatsApp" shortcut with a floating chat button that
// opens a small conversation panel. Mounted once in PublicLayout (see
// App.jsx), so it appears on every public page — but never inside
// /admin/* routes.
//
// The assistant itself is powered by /api/chat (Groq), which is
// deliberately restricted (via its system prompt, built fresh from the
// live product catalog + contact info) to only answer questions about
// HimShakti Foods. This component just handles the conversation UI: it
// keeps the message list in memory (resets on a full page reload — no
// server-side session, matching every other stateless piece of this app)
// and sends the trimmed history to the backend on every new message.
// Bot replies are rendered as Markdown (bold, links, line breaks) since
// the assistant is instructed to format that way.

import { useState, useRef, useEffect, useId } from 'react';
import ReactMarkdown from 'react-markdown';
import { api } from '../admin/apiClient';
import { useContactInfo } from '../context/ContactContext';

// Shown immediately when the panel first opens — a real UI message, not
// something the model actually said, so it's excluded from what gets
// sent back to /api/chat (see the `id !== GREETING.id` filter below).
const GREETING = {
  id: 'greeting',
  role: 'assistant',
  content: "Namaste! 🙏 Welcome to HimShakti Foods.\nHow can I help you today?",
};

// A friendly robot face — antenna, rounded head, two round "ear"
// side-bumps, and simple dot eyes — reads clearly as "AI assistant"
// rather than a generic chat bubble. Drawn as a single-color
// stroke/fill icon (currentColor) to match ChatWidget's other icons.
function BotIcon({ size = 24 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      {/* antenna */}
      <path d="M12 2v2.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="1.5" r="1.15" fill="currentColor" />
      {/* side "ears" */}
      <path
        d="M4 10.3H2.6a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1H4M20 10.3h1.4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* head */}
      <rect x="4" y="5.8" width="16" height="12" rx="4.2" stroke="currentColor" strokeWidth="1.8" />
      {/* eyes */}
      <circle cx="9" cy="12" r="1.3" fill="currentColor" />
      <circle cx="15" cy="12" r="1.3" fill="currentColor" />
    </svg>
  );
}

function CloseIcon({ size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M3 11.5L20 4l-6.5 17-3-7-7.5-2.5Z" fill="currentColor" />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="w-1.5 h-1.5 rounded-full bg-ink-3/50 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-ink-3/50 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-ink-3/50 animate-bounce" />
    </div>
  );
}

export default function ChatWidget() {
  const { contact } = useContactInfo();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  // True whenever a reply has arrived while the panel was closed — shows
  // a blinking red dot on the launcher button until it's opened again.
  const [hasUnread, setHasUnread] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const panelId = useId();

  // `handleSend` is async, so by the time a reply comes back, `open`
  // (captured in that closure) may be stale — a ref always reflects the
  // CURRENT open/closed state at the moment the reply actually arrives.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
    if (open) setHasUnread(false); // opening the chat always clears the dot
  }, [open]);

  // Auto-scroll to the newest message whenever the conversation grows,
  // the typing indicator appears/disappears, or the panel is opened
  // (opening un-mounts→mounts the message list fresh, which otherwise
  // starts scrolled to the top instead of showing the latest messages).
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, sending, open]);

  // Focus the input the moment the panel opens, and let Escape close it.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const waFallback = contact?.whatsappNumber
    ? `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent('Namaste HimShakti!')}`
    : null;

  const handleSend = async (overrideText = null) => {
    const text = typeof overrideText === 'string' ? overrideText : input.trim();
    if (!text || sending) return;

    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: text };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    if (typeof overrideText !== 'string') setInput('');
    setSending(true);

    try {
      // Never send the canned greeting back — it isn't something the
      // model actually said, just a UI convenience.
      const payload = nextMessages
        .filter((m) => m.id !== GREETING.id)
        .map(({ role, content }) => ({ role, content }));

      const data = await api.sendChatMessage(payload);
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: data?.reply || '' }]);
      // The reply arrived while the panel was closed (e.g. the person
      // asked something, then closed the chat while waiting) — flag it.
      if (!openRef.current) setHasUnread(true);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          isError: true,
          content: err.message || 'Something went wrong. Please try WhatsApp.',
        },
      ]);
      if (!openRef.current) setHasUnread(true);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ── Chat panel ──────────────────────────────────────────── */}
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="HimShakti chat assistant"
          className="fixed z-50 bottom-24 right-4 left-4 sm:left-auto sm:right-6
            sm:w-[368px] h-[min(70vh,520px)] bg-white rounded-xl2 shadow-2xl
            border border-forest/10 flex flex-col overflow-hidden animate-modal-in"
        >
          {/* Header */}
          <div className="bg-forest px-5 py-4 flex items-center justify-between shrink-0">
            <div>
              <p className="font-serif text-white text-[1.05rem] leading-tight">HimShakti Assistant</p>
              <p className="text-gold/70 text-[11px] font-medium mt-0.5">Products · Ordering · Delivery</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-mist">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap break-words
                    ${
                      m.role === 'user'
                        ? 'bg-forest text-white rounded-br-md'
                        : m.isError
                        ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-md'
                        : 'bg-white text-ink border border-forest/8 rounded-bl-md'
                    }`}
                >
                  <ReactMarkdown
                    components={{
                      a: ({ node, ...props }) => (
                        <a
                          {...props}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`font-bold underline underline-offset-2 ${
                            m.role === 'user' ? 'text-white' : 'text-forest hover:text-wa-dk'
                          }`}
                        />
                      ),
                      p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>

                  {m.isError && waFallback && (
                    <a
                      href={waFallback}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-2 text-[12.5px] font-bold text-wa-dk underline underline-offset-2"
                    >
                      Message us on WhatsApp →
                    </a>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white border border-forest/8 rounded-2xl rounded-bl-md">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>

          {/* Input row */}
          <div className="border-t border-forest/8 bg-white p-3 flex items-end gap-2 shrink-0 animate-fade-in">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about products, orders, delivery…"
              maxLength={500}
              className="flex-1 resize-none max-h-24 px-3.5 py-2.5 rounded-xl bg-mist border border-forest/12
                text-[13.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-amber/25 focus:border-amber"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sending}
              aria-label="Send message"
              className="w-10 h-10 shrink-0 rounded-full bg-amber hover:bg-amber-lt text-white flex items-center
                justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      {/* ── Floating launcher button ────────────────────────────── */}
      {/* The `fixed` viewport anchor lives on this OUTER wrapper only.
          The button itself just needs `relative` (so the unread badge's
          `absolute` positioning has something to anchor to) — putting
          both `fixed` and `relative` on the SAME element is a real bug:
          they're the same CSS property, and whichever utility Tailwind
          happens to output later in its stylesheet silently wins,
          regardless of class order in JSX. Here that meant `relative`
          was overriding `fixed`, so the button rendered in normal page
          flow (right after the Footer) instead of floating — exactly
          the "stuck at the bottom-left, half cut off" bug. */}
      <div className="fixed bottom-5 right-4 z-50">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
          aria-expanded={open}
          aria-controls={panelId}
          className="relative w-14 h-14 rounded-full bg-amber hover:bg-amber-lt
            text-white shadow-xl shadow-amber/30 flex items-center justify-center
            transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          {open ? <CloseIcon size={22} /> : <BotIcon size={32} />}

          {/* Unread indicator — a new reply arrived while the panel was closed */}
          {hasUnread && !open && (
            <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-600 border-2 border-white" />
            </span>
          )}
        </button>
      </div>
    </>
  );
}