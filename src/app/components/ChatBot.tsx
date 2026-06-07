import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Bot, User, Minimize2, Copy, Check, Paperclip, FileText, ShieldAlert, ShieldCheck } from 'lucide-react';

/* ─── Types ─── */
interface Source {
  filename: string;
  doc_type: string;
  similarity: number;
  snippet: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  sources?: Source[];
  followUpQuestions?: string[];
  grounded?: boolean;
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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
      <pre className="terminal-font text-[11px] text-[#A5D6FF] p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap"
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

          if (!line.trim()) return;
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

const getDocTypeColor = (type: string) => {
  switch (type) {
    case "playbook": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "threat_intel": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "policy": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "postmortem": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
};

/* ─── Message bubble ─── */
function MessageBubble({ msg, onFollowUpClick }: { msg: Message, onFollowUpClick: (q: string) => void }) {
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
      <div className="max-w-[82%]">
        <div
          className="rounded-xl px-3.5 py-2.5"
          style={isUser ? {
            background: 'rgba(48,54,61,0.6)',
            border: '1px solid rgba(48,54,61,0.8)',
            color: '#F0F6FC',
          } : {
            background: 'rgba(227,0,15,0.06)',
            border: msg.grounded === false ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(227,0,15,0.15)',
            color: '#D1D9E0',
          }}
        >
          {!isUser && msg.grounded !== undefined && !msg.isStreaming && (
             <div className="mb-2 flex items-center">
                 <div
                  className={`flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full ${
                    msg.grounded
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                 >
                   {msg.grounded ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                   {msg.grounded ? "Grounded in KB" : "No exact match found"}
                 </div>
             </div>
          )}

          {isUser
            ? <p className="text-sm leading-relaxed">{msg.content}</p>
            : <MarkdownMessage content={msg.content} />
          }
          {msg.isStreaming && (
            <span className="inline-block w-1.5 h-3.5 ml-1 align-middle bg-[#E3000F] animate-pulse opacity-80" />
          )}
          <p className="text-[#8B949E]/50 text-[9px] mt-1.5 terminal-font text-right">
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Sources */}
        {!isUser && msg.sources && msg.sources.length > 0 && !msg.isStreaming && (
          <div className="mt-2 pl-1">
            <p className="text-[10px] font-semibold text-[#8B949E] mb-1.5 uppercase tracking-widest">Sources</p>
            <div className="space-y-1.5">
              {msg.sources.map((src, idx) => (
                <div key={idx} className="text-xs p-2 rounded-lg" style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(48,54,61,0.5)' }}>
                  <div className="flex items-center gap-2 mb-1 overflow-hidden">
                    <FileText className="w-3 h-3 text-[#8B949E] shrink-0" />
                    <span className="font-medium text-[#F0F6FC] truncate text-[11px]" title={src.filename}>
                      {src.filename}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] border ${getDocTypeColor(src.doc_type)} shrink-0`}>
                      {src.doc_type}
                    </span>
                  </div>
                  <p className="text-[#8B949E] text-[10px] line-clamp-2 italic">"{src.snippet}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up Questions */}
        {!isUser && msg.followUpQuestions && msg.followUpQuestions.length > 0 && !msg.isStreaming && (
          <div className="mt-2 pl-1 flex flex-wrap gap-1.5">
            {msg.followUpQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => onFollowUpClick(q)}
                className="text-[10px] bg-transparent hover:bg-white/5 transition-colors rounded-full px-2.5 py-1 text-[#8B949E] hover:text-[#F0F6FC]"
                style={{ border: '1px solid rgba(48,54,61,0.8)' }}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main ChatBot component ─── */
export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sessionId = "default-session"; // Unique session ID for conversation history

  // Fetch History on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/analyst/history`);
      if (res.ok) {
        const data = await res.json();
        const loadedMessages: Message[] = [];
        [...data].reverse().forEach((item: any) => {
          loadedMessages.push({
            id: `user-${item.id}`,
            role: "user",
            content: item.question,
            timestamp: new Date()
          });
          loadedMessages.push({
            id: `assistant-${item.id}`,
            role: "assistant",
            content: item.answer,
            sources: item.sources,
            grounded: item.grounded,
            followUpQuestions: [],
            timestamp: new Date()
          });
        });
        
        if (loadedMessages.length === 0) {
           loadedMessages.push({
              id: 'welcome',
              role: 'assistant',
              content: `## CyberAI SOC Assistant ready.\n\nI'm your AI-powered analyst for **network intrusion detection** and **insider threat intelligence**.\n\nI can help you:\n- Summarize and correlate active alerts\n- Explain **MITRE ATT&CK** techniques\n- Investigate specific sessions or anomalies\n- Answer questions based on documents you upload\n\n*Select a quick action below, or click the Paperclip to upload threat intel PDFs.*`,
              timestamp: new Date(),
           });
        }
        setMessages(loadedMessages);
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("Uploading...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", "threat_intel"); // default doc type

    try {
      const res = await fetch(`${API_URL}/api/analyst/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadStatus(`✓ ${data.filename} ingested`);
      } else {
        setUploadStatus(`✗ Error: ${data.detail || "Upload failed"}`);
      }
    } catch (err) {
      setUploadStatus("✗ Network Error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setUploadStatus(""), 5000);
    }
  };

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

    const assistantMsgId = `ai-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      isStreaming: true,
      timestamp: new Date()
    }]);

    try {
      const url = new URL(`${API_URL}/api/analyst/chat/stream`);
      url.searchParams.append("question", trimmed);
      url.searchParams.append("session_id", sessionId);
      
      const eventSource = new EventSource(url.toString());
      
      let currentContent = "";
      
      eventSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        
        if (data.type === "token") {
          currentContent += data.content;
          setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: currentContent } : m));
        }
        
        if (data.type === "sources") {
          setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
            ...m,
            sources: data.sources,
            followUpQuestions: data.follow_up_questions,
            grounded: data.sources.length > 0 || data.follow_up_questions.length > 0 ? true : false
          } : m));
        }
        
        if (data.type === "done") {
          eventSource.close();
          setLoading(false);
          setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, isStreaming: false } : m));
          if (!open) setHasUnread(true);
        }
      };
      
      eventSource.onerror = () => {
        eventSource.close();
        setLoading(false);
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: currentContent || "An error occurred.", isStreaming: false } : m));
      };
    } catch (e) {
      console.error(e);
      setLoading(false);
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: "An error occurred.", isStreaming: false } : m));
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
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-24 right-6 z-40 flex flex-col rounded-2xl overflow-hidden"
            style={{
              width: 420,
              height: 600,
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
                <p className="text-[#8B949E] text-[10px] mt-0.5">RAG Intelligence Engine</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] text-emerald-400"
                  style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-green" />
                  Online
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
              {messages.map(msg => <MessageBubble key={msg.id} msg={msg} onFollowUpClick={send} />)}

              {loading && !messages.find(m => m.isStreaming) && (
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
              <div
                className="flex items-end gap-2 rounded-xl px-2 py-2 transition-all duration-200"
                style={{ background: 'rgba(13,17,23,0.7)', border: '1px solid rgba(48,54,61,0.8)' }}
                onFocusCapture={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(227,0,15,0.35)';
                }}
                onBlurCapture={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(48,54,61,0.8)';
                }}
              >
                {/* Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || loading}
                  className="p-2 text-[#8B949E] hover:text-[#F0F6FC] transition-colors disabled:opacity-50 relative"
                  title="Upload Document to Knowledge Base"
                >
                  <Paperclip className="w-4 h-4" />
                  {uploadStatus && (
                    <span className="absolute -top-6 left-0 text-[9px] whitespace-nowrap text-emerald-400 font-mono bg-black/80 px-2 py-0.5 rounded">
                      {uploadStatus}
                    </span>
                  )}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUpload}
                  accept=".pdf,.txt,.md"
                  className="hidden"
                />

                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask about threats, alerts, or uploaded docs…"
                  rows={1}
                  disabled={loading}
                  className="flex-1 bg-transparent text-[#F0F6FC] text-[13px] placeholder-[#8B949E]/60 outline-none resize-none leading-relaxed disabled:opacity-50 mt-1"
                  style={{ maxHeight: 80, minHeight: 24 }}
                  onInput={e => {
                    const t = e.currentTarget;
                    t.style.height = 'auto';
                    t.style.height = `${Math.min(t.scrollHeight, 80)}px`;
                  }}
                />
                
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || loading}
                  className="p-1.5 rounded-lg shrink-0 transition-all duration-200 disabled:opacity-30 mb-0.5 mr-0.5"
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
                AI can make mistakes. Verify critical actions.
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
