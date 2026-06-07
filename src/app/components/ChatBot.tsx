import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Bot, User, Minimize2, Copy, Check, Paperclip } from 'lucide-react';

/* ─── Types ─── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: { filename: string; doc_type: string; similarity: number; snippet: string }[];
}

/* ─── Quick-action suggestion chips ─── */
const QUICK_ACTIONS = [
  'Summarize recent SSH attacks',
  'Analyze the latest anomaly',
  'List top MITRE techniques',
  'What are the active threats?',
  'Explain ZERO_DAY signatures',
  'Show high-confidence alerts',
];

/* ─── Markdown renderer (no external lib) ─── */

function renderInline(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${key}-b${i}`} className="text-[#F0F6FC] font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={`${key}-c${i}`}
          className="terminal-font text-[11px] px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(13,17,23,0.7)', color: '#E3000F', border: '1px solid rgba(227,0,15,0.2)' }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={`${key}-i${i}`}>{part.slice(1, -1)}</em>;
    }
    return <span key={`${key}-t${i}`}>{part}</span>;
  });
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="rounded-lg overflow-hidden my-2" style={{ border: '1px solid rgba(48,54,61,0.7)' }}>
      <div className="flex items-center justify-between px-3 py-1.5"
        style={{ background: 'rgba(13,17,23,0.8)', borderBottom: '1px solid rgba(48,54,61,0.5)' }}>
        <span className="text-[#8B949E] text-[10px] terminal-font">{lang || 'code'}</span>
        <button onClick={copy} className="text-[#8B949E] hover:text-[#F0F6FC] transition-colors">
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
      <pre className="terminal-font text-[11px] text-[#A5D6FF] p-3 overflow-x-auto leading-relaxed"
        style={{ background: 'rgba(9,12,16,0.6)', margin: 0 }}>
        {code.trimEnd()}
      </pre>
    </div>
  );
}

function MarkdownMessage({ content }: { content: string }) {
  const segments = content.split(/(```[\w]*\n[\s\S]*?```)/g);

  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {segments.map((seg, si) => {
        if (seg.startsWith('```')) {
          const langMatch = seg.match(/^```(\w*)/);
          const lang = langMatch?.[1] ?? '';
          const code = seg.replace(/^```\w*\n?/, '').replace(/```$/, '');
          return <CodeBlock key={si} code={code} lang={lang} />;
        }

        // Process line by line
        const lines = seg.split('\n');
        const nodes: React.ReactNode[] = [];
        let listItems: string[] = [];

        const flushList = (idx: number) => {
          if (listItems.length === 0) return;
          nodes.push(
            <ul key={`list-${si}-${idx}`} className="space-y-0.5 ml-1">
              {listItems.map((item, li) => (
                <li key={li} className="flex items-start gap-2">
                  <span className="text-[#E3000F] shrink-0 mt-0.5">›</span>
                  <span>{renderInline(item, `${si}-li-${li}`)}</span>
                </li>
              ))}
            </ul>
          );
          listItems = [];
        };

        lines.forEach((line, li) => {
          if (line.startsWith('- ') || line.startsWith('* ')) {
            listItems.push(line.slice(2));
            return;
          }
          flushList(li);

          if (!line.trim()) {
            // skip blank lines (spacing handled by space-y)
            return;
          }
          if (line.startsWith('### ')) {
            nodes.push(<p key={`${si}-h3-${li}`} className="text-[#F0F6FC] font-semibold mt-2">{line.slice(4)}</p>);
          } else if (line.startsWith('## ')) {
            nodes.push(<p key={`${si}-h2-${li}`} className="text-[#F0F6FC] font-bold mt-3 text-[13px]">{line.slice(3)}</p>);
          } else {
            nodes.push(<p key={`${si}-p-${li}`}>{renderInline(line, `${si}-${li}`)}</p>);
          }
        });
        flushList(lines.length);

        return <div key={si}>{nodes}</div>;
      })}
    </div>
  );
}

/* ─── Typing dots ─── */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'rgba(227,0,15,0.6)' }}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.14 }}
        />
      ))}
    </div>
  );
}

/* ─── Message bubble ─── */
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5"
        style={isUser
          ? { background: 'rgba(48,54,61,0.8)', border: '1px solid rgba(48,54,61,0.9)' }
          : { background: 'rgba(227,0,15,0.12)', border: '1px solid rgba(227,0,15,0.25)' }
        }
      >
        {isUser
          ? <User className="w-3.5 h-3.5 text-[#8B949E]" />
          : <Bot className="w-3.5 h-3.5 text-[#E3000F]" />
        }
      </div>

      {/* Bubble */}
      <div
        className="max-w-[82%] rounded-xl px-3.5 py-2.5"
        style={isUser ? {
          background: 'rgba(48,54,61,0.6)',
          border: '1px solid rgba(48,54,61,0.8)',
          color: '#F0F6FC',
        } : {
          background: 'rgba(227,0,15,0.06)',
          border: '1px solid rgba(227,0,15,0.15)',
          color: '#D1D9E0',
        }}
      >
        {isUser
          ? <p className="text-sm leading-relaxed">{msg.content}</p>
          : <MarkdownMessage content={msg.content} />
        }

        {!isUser && msg.sources && msg.sources.length > 0 && (
          <div className="mt-3 pt-2 border-t border-[#30363D]/50 space-y-1.5">
            <div className="text-[10px] text-[#8B949E] uppercase font-semibold mb-1">Retrieved Sources</div>
            {msg.sources.map((src, i) => (
              <div key={i} className="text-[11px] p-2 rounded bg-[#0D1117] border border-[#30363D] text-[#C9D1D9]">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[#58A6FF] font-medium break-all">{src.filename}</span>
                  <span className="text-[#8B949E] text-[9px] uppercase px-1 py-0.5 rounded bg-[#21262D]">{src.doc_type}</span>
                  <span className="text-[#3FB950] text-[9px]">{(src.similarity * 100).toFixed(1)}% match</span>
                </div>
                <div className="text-[#8B949E] italic text-[10px] line-clamp-3 leading-snug break-words">{src.snippet}</div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[#8B949E]/50 text-[9px] mt-1.5 terminal-font">
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Welcome message ─── */
const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: `## CyberAI SOC Assistant ready.

I'm your AI-powered analyst for **network intrusion detection** and **insider threat intelligence**.

I can help you:
- Summarize and correlate active alerts
- Explain **MITRE ATT&CK** techniques
- Investigate specific sessions or anomalies
- Generate \`incident reports\` in seconds

*Select a quick action below or type your question.*`,
  timestamp: new Date(),
};

/* ─── Placeholder response when backend not yet wired ─── */
function buildPlaceholder(query: string): Message {
  return {
    id: `ai-${Date.now()}`,
    role: 'assistant',
    content: `## Backend endpoint not yet connected

Your question **"${query}"** has been received. To enable live AI responses, wire this interface to your LangChain endpoint:

\`\`\`ts
POST /api/chat/message
{ "message": "${query}", "session_id": "<uuid>" }
\`\`\`

Expected response shape:
\`\`\`json
{ "reply": "markdown string", "sources": [] }
\`\`\`

Once connected, responses will stream back with full **incident context**, MITRE mappings, and recommended actions.`,
    timestamp: new Date(),
  };
}

/* ─── Main ChatBot component ─── */
export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setLoading(true);

    const aiMsgId = `ai-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }]);

    try {
      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${BASE}/api/analyst/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed })
      });

      if (!res.ok) throw new Error('API Error');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullContent = '';

      while (reader && !done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'token') {
                  fullContent += data.content;
                  setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: fullContent } : m));
                } else if (data.type === 'sources') {
                  setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, sources: data.sources } : m));
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: 'Sorry, I encountered an error connecting to the analyst backend.' } : m));
    } finally {
      setLoading(false);
      setHasUnread(prev => true); // If they closed it during streaming
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(`Uploading ${file.name}...`);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', 'general');

    try {
      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${BASE}/api/analyst/upload`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      setUploadStatus(`Uploaded ${file.name} successfully!`);
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      setUploadStatus(`Error uploading ${file.name}`);
      setTimeout(() => setUploadStatus(null), 3000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-24 right-6 z-40 flex flex-col rounded-2xl overflow-hidden"
            style={{
              width: 390,
              height: 560,
              background: 'rgba(18,22,29,0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(227,0,15,0.18)',
              boxShadow: '0 0 40px rgba(227,0,15,0.12), 0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-3.5 flex items-center gap-3 shrink-0"
              style={{ borderBottom: '1px solid rgba(48,54,61,0.7)', background: 'rgba(13,17,23,0.6)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(227,0,15,0.12)', border: '1px solid rgba(227,0,15,0.3)' }}
              >
                <Sparkles className="w-4 h-4 text-[#E3000F]" style={{ filter: 'drop-shadow(0 0 6px rgba(227,0,15,0.8))' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#F0F6FC] font-semibold text-sm leading-none">CyberAI Assistant</p>
                <p className="text-[#8B949E] text-[10px] mt-0.5">SOC Intelligence Agent</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] text-emerald-400"
                  style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-green" />
                  Ready
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-[#8B949E] hover:text-[#F0F6FC] hover:bg-white/5 transition-colors ml-1"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}

              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: 'rgba(227,0,15,0.12)', border: '1px solid rgba(227,0,15,0.25)' }}>
                    <Bot className="w-3.5 h-3.5 text-[#E3000F]" />
                  </div>
                  <div className="rounded-xl px-3.5 py-2.5"
                    style={{ background: 'rgba(227,0,15,0.06)', border: '1px solid rgba(227,0,15,0.15)' }}>
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick-action chips */}
            <div
              className="px-3 pt-2.5 pb-2 flex gap-1.5 overflow-x-auto shrink-0"
              style={{ borderTop: '1px solid rgba(48,54,61,0.5)' }}
            >
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action}
                  onClick={() => send(action)}
                  disabled={loading}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all duration-200 disabled:opacity-40"
                  style={{
                    background: 'rgba(22,27,34,0.8)',
                    border: '1px solid rgba(48,54,61,0.8)',
                    color: '#8B949E',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(227,0,15,0.35)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#F0F6FC';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(48,54,61,0.8)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#8B949E';
                  }}
                >
                  {action}
                </button>
              ))}
            </div>

            {/* Input bar */}
            <div className="px-3 pb-3 shrink-0">
              {uploadStatus && (
                <div className="text-[10px] text-[#8B949E] mb-2 px-1 font-mono flex items-center justify-between">
                  <span>{uploadStatus}</span>
                  {isUploading && <span className="animate-pulse">...</span>}
                </div>
              )}
              <div
                className="flex items-end gap-2 rounded-xl px-3 py-2.5 transition-all duration-200"
                style={{ background: 'rgba(13,17,23,0.7)', border: '1px solid rgba(48,54,61,0.8)' }}
                onFocusCapture={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(227,0,15,0.35)';
                }}
                onBlurCapture={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(48,54,61,0.8)';
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask about threats, alerts, or incidents…"
                  rows={1}
                  disabled={loading}
                  className="flex-1 bg-transparent text-[#F0F6FC] text-sm placeholder-[#8B949E]/60 outline-none resize-none leading-relaxed disabled:opacity-50"
                  style={{ maxHeight: 80, minHeight: 20 }}
                  onInput={e => {
                    const t = e.currentTarget;
                    t.style.height = 'auto';
                    t.style.height = `${Math.min(t.scrollHeight, 80)}px`;
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || loading}
                  className="p-1.5 rounded-lg shrink-0 transition-all duration-200 disabled:opacity-30 mr-1"
                  style={{ background: 'transparent', border: '1px solid rgba(48,54,61,0.8)', color: '#8B949E' }}
                  title="Upload Document to Knowledge Base"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUpload}
                  accept=".pdf,.txt,.md"
                  className="hidden"
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || loading}
                  className="p-1.5 rounded-lg shrink-0 transition-all duration-200 disabled:opacity-30"
                  style={{ background: 'rgba(227,0,15,0.85)' }}
                  onMouseEnter={e => {
                    if (!loading && input.trim()) {
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(227,0,15,0.5)';
                    }
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                  }}
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <p className="text-[#8B949E]/40 text-[9px] text-center mt-1.5">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB ── */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: open
            ? 'rgba(30,35,42,0.95)'
            : 'linear-gradient(135deg, #E3000F 0%, #a00009 100%)',
          border: '1px solid rgba(227,0,15,0.4)',
          boxShadow: open
            ? '0 0 20px rgba(227,0,15,0.2)'
            : '0 0 24px rgba(227,0,15,0.5), 0 4px 20px rgba(0,0,0,0.4)',
        }}
        aria-label="Toggle AI Assistant"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-5 h-5 text-[#F0F6FC]" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Unread badge */}
        <AnimatePresence>
          {hasUnread && !open && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center text-[#E3000F] text-[9px] font-bold"
            >
              1
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
