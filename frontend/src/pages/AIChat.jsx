import { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Send, Sparkles, Bot, User, Loader2, Lightbulb } from 'lucide-react';

export default function AIChat() {
  const { user } = useAuth();
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Webale nnyo! Welcome to CleanConnect Uganda! I'm your AI booking assistant.\n\nI can help you with:\n- Getting instant quotes for cleaning services\n- Booking a verified partner\n- Checking availability\n- Understanding our service guarantee\n\nWhat can I help you with today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    'Get a quote', 'Book a cleaner', 'How does payment work?', 'What is the guarantee?'
  ]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (msg) => {
    const text = msg || input;
    if (!text.trim() || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiAPI.chat({ session_id: sessionId, message: text });
      const data = res.data;
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again."
      }]);
    }
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <Sparkles size={24} className="brand-icon" />
        <div>
          <h2>CleanConnect AI Assistant</h2>
          <p>Your smart booking helper — ask anything</p>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role}`}>
            <div className="chat-avatar">
              {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
            </div>
            <div className="chat-bubble">
              {msg.content.split('\n').map((line, i) => (
                <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-message assistant">
            <div className="chat-avatar"><Bot size={20} /></div>
            <div className="chat-bubble typing">
              <Loader2 size={18} className="spin" /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-suggestions">
        <Lightbulb size={14} />
        {suggestions.map((s, i) => (
          <button key={i} className="suggestion-chip" onClick={() => sendMessage(s)}>
            {s}
          </button>
        ))}
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything about CleanConnect..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
