import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Instagram, 
  Youtube, 
  Twitter, 
  Image as ImageIcon, 
  Video, 
  Layers, 
  Lock,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Send,
  Calendar,
  Zap,
  CheckCircle2
} from 'lucide-react';
import './Publish.css';

interface Platform {
  id: string;
  name: string;
  handle: string;
  icon: React.ReactNode;
  selected: boolean;
  color: string;
  bgStart: string;
  bgEnd: string;
}

const initialPlatforms: Platform[] = [
  { id: 'ig', name: 'Instagram', handle: '@tech_trends', icon: <Instagram size={16} />, selected: true, color: '#e1306c', bgStart: '#f09433', bgEnd: '#bc1888' },
  { id: 'x', name: 'X (Twitter)', handle: '@social_ai', icon: <Twitter size={16} />, selected: false, color: '#000000', bgStart: '#334155', bgEnd: '#0f1724' },
  { id: 'yt', name: 'YouTube', handle: 'SocialAI Channel', icon: <Youtube size={16} />, selected: true, color: '#ff0000', bgStart: '#ff0000', bgEnd: '#cc0000' },
];

export default function Publish() {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms);
  const [content, setContent] = useState('');

  const togglePlatform = (id: string) => {
    setPlatforms(platforms.map(p => 
      p.id === id ? { ...p, selected: !p.selected } : p
    ));
  };

  return (
    <div className="publish-page" id="publish-page">
      <div className="publish__main-content">
        
        {/* Left Column - Compose Area */}
        <div className="publish__compose-column">
          
          {/* Publish To Block */}
          <div className="compose-card">
            <div className="compose-card__header">
              <span className="compose-card__label">PUBLISH TO</span>
              <button className="btn-add-account" onClick={() => navigate('/accounts')}>
                <Plus size={14} /> Add Account
              </button>
            </div>
            
            <div className="platform-selector">
              {platforms.map(p => (
                <div 
                  key={p.id} 
                  className={`platform-pill ${p.selected ? 'platform-pill--selected' : ''}`}
                  onClick={() => togglePlatform(p.id)}
                >
                  <div 
                    className="platform-pill__icon" 
                    style={{ background: p.id === 'ig' ? `linear-gradient(45deg, ${p.bgStart}, ${p.bgEnd})` : p.bgStart }}
                  >
                    {p.icon}
                  </div>
                  <div className="platform-pill__info">
                    <span className="platform-pill__name">{p.name}</span>
                    <span className="platform-pill__handle">{p.handle}</span>
                  </div>
                  <div className={`platform-pill__check ${p.selected ? 'platform-pill__check--active' : ''}`}>
                     {p.selected && <CheckCircle2 size={16} fill="#06b6d4" color="#1e293b" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Editor Block */}
          <div className="compose-card editor-card">
            <div className="editor__toolbar">
              <button className="editor__tool-btn" title="Bold">B</button>
              <button className="editor__tool-btn editor__tool-btn--italic" title="Italic">I</button>
              <button className="editor__tool-btn" title="Emoji">😊</button>
              <button className="editor__tool-btn" title="Link">🔗</button>
              <div className="editor__toolbar-spacer"></div>
              <button className="editor__ai-magic-btn"><Zap size={16} color="#06b6d4" /></button>
            </div>
            
            <textarea 
              className="editor__textarea" 
              placeholder="What's happening?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Media Assets Block */}
          <div className="compose-card media-card">
            <div className="compose-card__header">
              <span className="compose-card__label">MEDIA ASSETS</span>
              <span className="media-card__count">0 / 4 assets</span>
            </div>
            
            <div className="media-upload-grid">
              <button className="media-upload-btn">
                <ImageIcon size={24} />
                <span>IMAGE</span>
              </button>
              <button className="media-upload-btn">
                <Video size={24} />
                <span>VIDEO</span>
              </button>
              <button className="media-upload-btn">
                <Layers size={24} />
                <span>CAROUSEL</span>
              </button>
              <button className="media-upload-btn media-upload-btn--locked" disabled>
                <Lock size={20} />
              </button>
            </div>
          </div>
          
        </div>

        {/* Right Column - Preview & Insights */}
        <div className="publish__sidebar-column">
          
          {/* Live Preview */}
          <div className="preview-card">
            <div className="compose-card__header">
              <span className="compose-card__label">LIVE POST PREVIEW</span>
            </div>
            
            <div className="preview__tabs">
              <button className="preview__tab preview__tab--active">Instagram</button>
              <button className="preview__tab">X / Twitter</button>
              <button className="preview__tab">YouTube</button>
            </div>
            
            {/* Mock Phone Container for Preview */}
            <div className="preview__device">
              <div className="preview__post">
                 <div className="post__header">
                   <div className="post__avatar"></div>
                   <div className="post__author-info">
                     <span className="post__author-name">tech_trends</span>
                     <span className="post__author-location">Original Audio</span>
                   </div>
                   <MoreHorizontal size={16} className="post__more" />
                 </div>
                 
                 <div className="post__image-placeholder">
                    <img 
                      src="https://images.unsplash.com/photo-1620712948343-00842366dcd8?q=80&w=400&auto=format&fit=crop" 
                      alt="AI Brain Concept" 
                      className="post__mock-image" 
                    />
                 </div>
                 
                 <div className="post__actions">
                   <Heart size={20} />
                   <MessageCircle size={20} />
                   <Send size={20} />
                 </div>
                 
                 <div className="post__caption">
                   <strong>tech_trends</strong> Start composing your masterpiece... <span className="post__hashtag">#AI</span>
                 </div>
              </div>
            </div>
          </div>

          {/* AI Insight */}
          <div className="insight-panel">
            <div className="insight-panel__header">
              <Zap size={16} color="#06b6d4" />
              <span className="insight-panel__title">AI POST INSIGHT</span>
            </div>
            
            <div className="insight-panel__score-row">
              <span className="insight-panel__score-label">Virality Prediction</span>
              <span className="insight-panel__score-value text-cyan">92%</span>
            </div>
            
            <div className="progress-bar">
              <div className="progress-bar__fill progress-bar__fill--cyan" style={{ width: '92%' }}></div>
            </div>
            
            <p className="insight-panel__tip">
              "Adding a carousel of technical diagrams could increase engagement by 14.5% based on your recent audience behavior."
            </p>
            
            <button className="btn-outline-full">Optimize Performance</button>
          </div>

        </div>
      </div>

      {/* Page-Specific Footer */}
      <div className="publish__footer">
        <div className="publish__footer-left">
          <span className="footer__label">SCHEDULE FOR</span>
          <div className="schedule-input">
            <Calendar size={16} color="#06b6d4" />
            <span className="schedule-input__text">Tomorrow, 4:00 PM</span>
            <span className="schedule-input__zone">EST</span>
          </div>
        </div>
        
        <div className="publish__footer-center">
           <span className="footer__label">DRAFT STATUS</span>
           <div className="draft-status">
             <span className="status-dot"></span>
             <span>Auto-saved 2m ago</span>
           </div>
        </div>
        
        <div className="publish__footer-right">
           <p className="footer__info">
             Drafting content for <strong>{platforms.filter(p => p.selected).length} accounts</strong>. AI optimization active.
           </p>
        </div>
      </div>
    </div>
  );
}
