import { useState } from 'react';
import { 
  Inbox as InboxIcon, 
  User, 
  Flag, 
  Instagram, 
  Twitter, 
  Linkedin, 
  Search, 
  Filter, 
  MoreVertical, 
  Archive, 
  Info, 
  Smile, 
  Paperclip, 
  Image as ImageIcon,
  PenTool,
  Sparkles
} from 'lucide-react';
import './Inbox.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'me';
  time: string;
}

interface Conversation {
  id: string;
  name: string;
  subject: string;
  snippet: string;
  time: string;
  avatar: string;
  channel: 'ig' | 'x' | 'li';
  active: boolean;
}

const DUMMY_CONVERSATIONS: Conversation[] = [
  { 
    id: '1', 
    name: 'Alex Rivera', 
    subject: 'Subscription Inquiry', 
    snippet: 'Can you help me with my annual plan upgrade?', 
    time: '12m', 
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', 
    channel: 'ig',
    active: true 
  },
  { 
    id: '2', 
    name: 'Sarah Jenkins', 
    subject: 'Feature Request', 
    snippet: 'I would love to see a collaborative drafting...', 
    time: '45m', 
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', 
    channel: 'ig',
    active: false 
  }
];

const DUMMY_MESSAGES: Message[] = [
  { 
    id: '1', 
    sender: 'user', 
    text: 'Hi team! I\'m trying to upgrade to the Premium annual plan, but I keep getting an "Authentication Failed" error during checkout. My current card works on other sites. Can you help?', 
    time: '10:42 AM' 
  },
  { 
    id: '2', 
    sender: 'me', 
    text: 'Hello Alex! I\'m sorry to hear that. Let me look into your account details and current transaction logs. One moment please.', 
    time: '10:45 AM' 
  },
  { 
    id: '3', 
    sender: 'user', 
    text: 'Sure, let me know if you need the specific error code or my account ID. Thanks for the quick response!', 
    time: '10:46 AM' 
  }
];

export default function Inbox() {
  const [activeFolder, setActiveFolder] = useState('all');
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState(DUMMY_CONVERSATIONS[0]);
  const [replyText, setReplyText] = useState('Thank you for ');

  return (
    <div className="inbox-page">
      {/* 1. Left Sidebar - Folders & Channels */}
      <aside className="inbox__sidebar">
        <div className="inbox__section">
          <h3 className="inbox__section-title">FOLDERS</h3>
          <nav className="inbox__nav">
            <div 
              className={`inbox__nav-item ${activeFolder === 'all' ? 'inbox__nav-item--active' : ''}`}
              onClick={() => setActiveFolder('all')}
            >
              <div className="flex-center">
                <InboxIcon size={18} className="inbox__nav-icon" />
                <span>All Messages</span>
              </div>
              <span className="inbox__count">24</span>
            </div>
            <div 
              className={`inbox__nav-item ${activeFolder === 'assigned' ? 'inbox__nav-item--active' : ''}`}
              onClick={() => setActiveFolder('assigned')}
            >
              <div className="flex-center">
                <User size={18} className="inbox__nav-icon" />
                <span>Assigned</span>
              </div>
              <span className="inbox__count">8</span>
            </div>
            <div className="inbox__nav-item">
              <div className="flex-center">
                <Flag size={18} className="inbox__nav-icon" />
                <span>Flagged</span>
              </div>
            </div>
          </nav>
        </div>

        <div className="inbox__section">
          <h3 className="inbox__section-title">CHANNELS</h3>
          <nav className="inbox__nav">
            <div className={`inbox__nav-item ${activeChannel === 'ig' ? 'inbox__nav-item--active' : ''}`} onClick={() => setActiveChannel('ig')}>
              <div className="flex-center">
                <Instagram size={18} className="inbox__channel-icon" />
                <span>Instagram</span>
              </div>
            </div>
            <div className={`inbox__nav-item ${activeChannel === 'x' ? 'inbox__nav-item--active' : ''}`} onClick={() => setActiveChannel('x')}>
              <div className="flex-center">
                <Twitter size={18} className="inbox__channel-icon" />
                <span>Twitter</span>
              </div>
            </div>
            <div className={`inbox__nav-item ${activeChannel === 'li' ? 'inbox__nav-item--active' : ''}`} onClick={() => setActiveChannel('li')}>
              <div className="flex-center">
                <Linkedin size={18} className="inbox__channel-icon" />
                <span>LinkedIn</span>
              </div>
            </div>
          </nav>
        </div>

        <button className="inbox__compose-btn">
          <PenTool size={18} />
          <span>Compose</span>
        </button>
      </aside>

      {/* 2. Conversation List Panel */}
      <div className="inbox__list-panel">
        <div className="inbox__list-header">
          <h2 className="inbox__list-title">Inbox</h2>
          <Filter size={18} color="#64748b" style={{ cursor: 'pointer' }} />
        </div>
        
        <div className="inbox__search-wrap">
          <Search size={16} className="inbox__search-icon" />
          <input type="text" placeholder="Filter conversations..." className="inbox__search-input" />
        </div>

        <div className="inbox__conv-list">
          {DUMMY_CONVERSATIONS.map(conv => (
            <div 
              key={conv.id} 
              className={`inbox__conv-item ${selectedConversation.id === conv.id ? 'inbox__conv-item--active' : ''}`}
              onClick={() => setSelectedConversation(conv)}
            >
              <div className="inbox__avatar-wrap">
                <img src={conv.avatar} alt={conv.name} className="inbox__avatar" />
                <div className={`inbox__channel-badge ${conv.channel === 'ig' ? 'bg-ig' : 'bg-x'}`} style={{ backgroundColor: conv.channel === 'ig' ? '#e1306c' : '#000' }}>
                  {conv.channel === 'ig' ? <Instagram size={10} color="white" /> : <Twitter size={10} color="white" />}
                </div>
              </div>
              <div className="inbox__conv-info">
                <div className="inbox__conv-header">
                  <span className="inbox__conv-name">{conv.name}</span>
                  <span className="inbox__conv-time">{conv.time}</span>
                </div>
                <div className="inbox__conv-subject">{conv.subject}</div>
                <div className="inbox__conv-snippet">{conv.snippet}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Main Chat Detail Area */}
      <div className="inbox__chat-area">
        <header className="chat__header">
          <div className="chat__user-info">
            <img src={selectedConversation.avatar} alt={selectedConversation.name} className="chat__user-avatar" />
            <div className="chat__user-details">
              <span className="chat__user-name">{selectedConversation.name}</span>
              <span className="chat__user-status">Online</span>
            </div>
          </div>
          <div className="chat__actions">
            <button className="chat__action-btn"><Archive size={20} /></button>
            <button className="chat__action-btn"><MoreVertical size={20} /></button>
            <button className="chat__action-btn"><Info size={20} /></button>
          </div>
        </header>

        <div className="chat__messages">
          <div className="chat__date-divider">
            <span className="chat__date-text">FRIDAY, OCTOBER 24</span>
          </div>

          {DUMMY_MESSAGES.map(msg => (
            <div key={msg.id} className={`chat__message ${msg.sender === 'user' ? 'message--incoming' : 'message--outgoing'}`}>
              <div className="message__bubble">
                {msg.text}
                {msg.sender === 'me' && (
                  <div className="message__sender-badge">ME</div>
                )}
              </div>
              <div className="message__meta">{msg.time}</div>
            </div>
          ))}
        </div>

        <footer className="chat__footer">
          <div className="editor__ai-hint">
            <Sparkles size={14} />
            AI IS DRAFTING...
          </div>
          <div className="editor__container">
            <textarea 
              className="editor__textarea" 
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <div className="editor__suggestion" style={{ position: 'absolute', left: '128px', top: '24px', pointerEvents: 'none', opacity: 0.5, fontSize: '14px' }}>
              the details, I've identified the issue and it appears to be...
            </div>
            
            <div className="editor__toolbar">
              <div className="editor__tools">
                <Smile size={18} style={{ cursor: 'pointer' }} />
                <Paperclip size={18} style={{ cursor: 'pointer' }} />
                <ImageIcon size={18} style={{ cursor: 'pointer' }} />
              </div>
              <div className="flex-center" style={{ gap: '16px' }}>
                <span className="editor__hint-text">Tab to complete AI suggestion</span>
                <button className="btn-send">Send</button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
