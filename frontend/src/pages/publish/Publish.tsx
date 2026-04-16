import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import EmojiPicker from 'emoji-picker-react';
import { getSuggestionConfig } from '../../components/Editor/mentionSuggestion';
import './tiptap.css';
import {
  Plus,
  Instagram,
  Facebook,
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
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useTopbar } from '../../components/Layout';
import API_URL from '../../config/api';
import './Publish.css';

interface SocialAccount {
  id: string;
  platform: string;
  username: string | null;
  profile_picture: string | null;
}

interface SelectablePlatform extends SocialAccount {
  selected: boolean;
}

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'instagram': return <Instagram size={16} />;
    case 'facebook': return <Facebook size={16} />;
    default: return <AlertCircle size={16} />;
  }
}

function getPlatformGradient(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'instagram': return 'linear-gradient(45deg, #f09433, #bc1888)';
    case 'facebook': return '#1877f2';
    default: return '#334155';
  }
}

const Hashtag = Mention.extend({ name: 'hashtag' });

export default function Publish() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setActions } = useTopbar();

  const [platforms, setPlatforms] = useState<SelectablePlatform[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Post states
  const [content, setContent] = useState('');
  const [postHashtags, setPostHashtags] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Mention.configure({
        HTMLAttributes: { class: 'mention-node' },
        suggestion: getSuggestionConfig('mention'),
      }),
      Hashtag.configure({
        HTMLAttributes: { class: 'hashtag-node' },
        suggestion: {
          ...getSuggestionConfig('hashtag'),
          char: '#',
        },
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setContent(editor.getText());
    },
  });

  const getPreviewHtml = useCallback(() => {
    let html = content;
    if (editor) {
      html = editor.getHTML();
    }
    if (postHashtags.trim()) {
      const formattedTags = postHashtags.split(/\s+/).map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
      html += `<p><br><span style="color: #00376b;">${formattedTags}</span></p>`;
    }
    return html;
  }, [content, postHashtags, editor]);

  const onEmojiClick = (emojiObject: any) => {
    if (editor) {
      editor.commands.insertContent(emojiObject.emoji);
    }
    setShowEmojiPicker(false);
  };

  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [scheduledAt, setScheduledAt] = useState<string>(''); // ISO string from datetime-local
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI generation state
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);

  // AI quick-actions state
  const [toneValue, setToneValue] = useState(50);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewritingVariant, setRewritingVariant] = useState<string | null>(null);
  const [isAdapting, setIsAdapting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);
  const [insightsData, setInsightsData] = useState<{
    virality_score: number;
    good: string[];
    bad: string[];
    suggestions: string[];
  } | null>(null);
  const [selectedPlatformAdapt, setSelectedPlatformAdapt] = useState<'instagram' | 'facebook' | 'twitter'>('instagram');
  const [additionalContext, setAdditionalContext] = useState('');
  const [optimizeImprovements, setOptimizeImprovements] = useState<string[]>([]);


  // Drafts state
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Preview state
  const [activePreview, setActivePreview] = useState<'instagram' | 'facebook'>('instagram');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  // Toggle Playback
  const handleTogglePlay = (e: React.MouseEvent<HTMLVideoElement | HTMLButtonElement>) => {
    e.stopPropagation();
    const video = document.getElementById('preview-video-player') as HTMLVideoElement;
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleToggleMute = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  // AI: call generate-caption endpoint with first media file
  const callGenerateCaption = async (): Promise<{ caption: string; hashtags: string } | null> => {
    if (mediaFiles.length === 0) {
      alert('Please upload an image or video first');
      return null;
    }
    const formData = new FormData();
    formData.append('media', mediaFiles[0]);
    try {
      const response = await fetch(`${API_URL}/api/ai/generate-caption`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' },
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate caption');
      }
      return await response.json();
    } catch (err: any) {
      console.error('[AI] generateCaption error:', err);
      alert(err.message || 'Failed to generate caption. Please try again.');
      return null;
    }
  };

  // Converts 0–100 slider to a tone label sent to Gemini
  const getToneLabel = (val: number) => {
    if (val <= 25) return 'formal';
    if (val >= 75) return 'casual';
    return 'balanced';
  };

  // POST /api/ai/rewrite
  const callRewrite = async (variant: string): Promise<string | null> => {
    const caption = editor?.getText() || '';
    if (!caption.trim()) { alert('Please write a caption first'); return null; }
    try {
      const res = await fetch(`${API_URL}/api/ai/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ caption, tone: getToneLabel(toneValue), variant }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const data = await res.json();
      return data.caption;
    } catch (err: any) {
      alert(err.message || 'Failed to rewrite caption');
      return null;
    }
  };

  // POST /api/ai/adapt
  const callAdapt = async (): Promise<string | null> => {
    const caption = editor?.getText() || '';
    if (!caption.trim()) { alert('Please write a caption first'); return null; }
    try {
      const res = await fetch(`${API_URL}/api/ai/adapt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ caption, platform: selectedPlatformAdapt }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const data = await res.json();
      return data.caption;
    } catch (err: any) {
      alert(err.message || 'Failed to adapt caption');
      return null;
    }
  };

  // POST /api/ai/analyze
  const callAnalyze = async () => {
    const caption = editor?.getText() || '';
    if (!caption.trim()) { alert('Please write a caption first'); return; }
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_URL}/api/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ caption, hashtags: postHashtags }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const data = await res.json();
      setInsightsData(data);
      setShowInsightsPanel(true);
    } catch (err: any) {
      alert(err.message || 'Failed to analyze post');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // POST /api/ai/optimize
  const callOptimize = async () => {
    const caption = editor?.getText() || '';
    if (!caption.trim()) { alert('Please write a caption first'); return; }
    setIsOptimizing(true);
    try {
      const res = await fetch(`${API_URL}/api/ai/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ caption, hashtags: postHashtags, context: additionalContext, platform: selectedPlatformAdapt }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const data = await res.json();
      editor?.commands.setContent(data.caption);
      setContent(data.caption);
      setPostHashtags(data.hashtags);
      setOptimizeImprovements(data.improvements || []);

      // Update virality score and pointers if provided
      if (data.virality_score !== undefined) {
        setInsightsData(prev => ({
          ...prev,
          virality_score: data.virality_score,
          good: data.good || [],
          bad: data.bad || [],
          suggestions: data.suggestions || []
        }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to optimize content');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Fetch drafts
  const fetchDrafts = useCallback(async () => {

    if (!user) return;
    setLoadingDrafts(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          status,
          created_at,
          scheduled_at,
          media (
            url,
            type
          ),
          post_targets (
            social_accounts (
              platform,
              username
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (err) {
      console.error('Failed to fetch drafts:', err);
    } finally {
      setLoadingDrafts(false);
    }
  }, [user]);

  // Delete Draft
  const deleteDraft = async (draftId: string) => {
    if (!window.confirm("Are you sure you want to delete this draft?")) return;

    try {
      const response = await fetch(`${API_URL}/api/posts/${draftId}`, {
        method: 'DELETE',
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      if (!response.ok) {
        throw new Error('Failed to delete draft');
      }
      // Re-fetch drafts
      fetchDrafts();
    } catch (err) {
      console.error('Error deleting draft:', err);
      alert('Could not delete draft');
    }
  };

  useEffect(() => {
    if (isDraftsOpen) {
      fetchDrafts();
    }
  }, [isDraftsOpen, fetchDrafts]);

  const loadDraft = async (draft: any) => {
    setContent(draft.content || '');
    if (editor) {
      editor.commands.setContent(draft.content || '');
    }

    if (draft.media && draft.media.length > 0) {
      const files: File[] = [];
      const previews: string[] = [];
      for (const mediaItem of draft.media) {
        previews.push(mediaItem.url);
        try {
          const response = await fetch(mediaItem.url);
          const blob = await response.blob();
          const type = mediaItem.type === 'video' ? 'video/mp4' : 'image/jpeg';
          const ext = mediaItem.type === 'video' ? '.mp4' : '.jpg';
          files.push(new File([blob], `draft-media_${Date.now()}${ext}`, { type: blob.type || type }));
        } catch (err) {
          console.error("Could not load draft media:", err);
        }
      }
      setMediaFiles(files);
      setMediaPreviews(previews);
      setCurrentMediaIndex(0);
    } else {
      setMediaPreviews([]);
      setMediaFiles([]);
    }

    setIsDraftsOpen(false);
  };

  // Load user's connected social accounts from Supabase
  useEffect(() => {
    if (!user) return;

    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      const { data, error } = await supabase
        .from('social_accounts')
        .select('id, platform, username, profile_picture')
        .eq('user_id', user.id);

      if (error) {
        console.error('[Publish] Failed to fetch social accounts:', error.message, error);
      } else if (data) {
        // Default: select all connected accounts
        setPlatforms((data as SocialAccount[]).map((account: SocialAccount) => ({ ...account, selected: true })));
      }
      setLoadingAccounts(false);
    };

    fetchAccounts();
  }, [user]);

  const handleConnectAccount = (platform: 'instagram' | 'facebook') => {
    if (!user) return;
    window.location.href = `${API_URL}/api/auth/meta?user_id=${user.id}&platform=${platform}`;
  };

  const togglePlatform = (id: string) => {
    setPlatforms(platforms.map(p =>
      p.id === id ? { ...p, selected: !p.selected } : p
    ));
  };

  const selectedAccounts = platforms.filter(p => p.selected);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const activeFiles = Array.from(e.target.files);
      const newFiles = [...mediaFiles, ...activeFiles].slice(0, 10);
      setMediaFiles(newFiles);
      setMediaPreviews(newFiles.map(f => URL.createObjectURL(f)));
      setCurrentMediaIndex(0);
    }
  };

  const submitPost = useCallback(async (status: 'draft' | 'scheduled') => {
    if (!user) return;
    if (selectedAccounts.length === 0) {
      setAlertConfig({ title: 'Missing Account', message: 'Please select at least one social account before proceeding.' });
      return;
    }
    if (!content) {
      setAlertConfig({ title: 'Empty Post', message: 'Please add some text to your post before proceeding.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      const plainText = editor ? editor.getText() : content
      const hashtagText = postHashtags.trim()
        ? '\n\n' + postHashtags.split(/\s+/).map(t => t.startsWith('#') ? t : '#' + t).join(' ')
        : ''
      formData.append('content', plainText + hashtagText)
      formData.append('status', status);

      const accountIds = selectedAccounts.map(p => p.id);
      formData.append('social_account_ids', JSON.stringify(accountIds));

      if (status === 'scheduled') {
        if (!scheduledAt) {
          setAlertConfig({ title: 'Missing Schedule', message: 'Please pick a valid date and time to schedule this post.' });
          setIsSubmitting(false);
          return;
        }

        const selectedTime = new Date(scheduledAt).getTime();
        if (selectedTime < Date.now()) {
          setAlertConfig({ title: 'Invalid Schedule', message: 'Schedule time must be in the future.' });
          setIsSubmitting(false);
          return;
        }

        formData.append('scheduled_at', new Date(scheduledAt).toISOString());
      }

      if (mediaFiles.length > 0) {
        mediaFiles.forEach(f => {
          formData.append('media', f);
        });
      }

      const response = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create post');
      }

      // Success
      if (status === 'draft') {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
        if (isDraftsOpen) fetchDrafts();
      } else {
        alert(`Post successfully marked as ${status}!`);
      }

      // Clear the compose post so user has a fresh refreshed page
      editor?.commands.clearContent();
      setContent('');
      setPostHashtags('');
      setMediaFiles([]);
      setMediaPreviews([]);
      setCurrentMediaIndex(0);
      setScheduledAt('');
      setToneValue(50);
      setInsightsData(null);
      setShowInsightsPanel(false);
      setAdditionalContext('');
      setOptimizeImprovements([]);

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, selectedAccounts, getPreviewHtml, mediaFiles, scheduledAt, navigate, editor]);

  const handlePublishNowClick = useCallback(() => {
    if (!user) return;
    if (selectedAccounts.length === 0) {
      setAlertConfig({ title: 'Missing Account', message: 'Please select at least one social account before proceeding.' });
      return;
    }
    if (!content) {
      setAlertConfig({ title: 'Empty Post', message: 'Please add some text to your post before proceeding.' });
      return;
    }
    setShowPublishModal(true);
  }, [user, selectedAccounts.length, content]);

  const confirmPublishNow = useCallback(async () => {
    if (!user) return;
    setShowPublishModal(false);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      const plainText = editor ? editor.getText() : content;
      const hashtagText = postHashtags.trim()
        ? '\n\n' + postHashtags.split(/\s+/).map(t => t.startsWith('#') ? t : '#' + t).join(' ')
        : '';
      formData.append('content', plainText + hashtagText);
      formData.append('social_account_ids', JSON.stringify(selectedAccounts.map(p => p.id)));
      if (mediaFiles.length > 0) {
        mediaFiles.forEach(f => formData.append('media', f));
      }

      const response = await fetch(`${API_URL}/api/posts/publish-now`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish post');
      }

      if (data.success) {
        // Clear compose area
        editor?.commands.clearContent();
        setContent('');
        setPostHashtags('');
        setMediaFiles([]);
        setMediaPreviews([]);
        setCurrentMediaIndex(0);
        setScheduledAt('');
        setToneValue(50);
        setInsightsData(null);
        setShowInsightsPanel(false);
        setAdditionalContext('');
        setOptimizeImprovements([]);

        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          navigate('/');
        }, 1500);
      } else {
        // Partial or full failure
        const errorSummary = (data.errors || [])
          .map((e: { social_account_id: string; error: string }) => `• ${e.error}`)
          .join('\n');
        alert(`${data.message}\n\n${errorSummary}`);
      }
    } catch (err: any) {
      console.error('[publishNow]', err);
      alert(err.message || 'An error occurred while publishing');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, selectedAccounts, content, editor, postHashtags, mediaFiles, navigate]);

  const publishActions = useMemo(() => (
    <>
      <button
        className="btn-outline-ghost"
        onClick={() => setIsDraftsOpen(true)}
      >
        View Drafts
      </button>
      <button
        className="btn-outline-ghost"
        onClick={() => submitPost('draft')}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : 'Save Draft'}
      </button>
      <button
        className="btn-ghost-filled"
        onClick={handlePublishNowClick}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={14} className="spin" style={{ marginRight: 6 }} />
            Publishing...
          </>
        ) : 'Publish Now'}
      </button>
    </>
  ), [isSubmitting, submitPost, handlePublishNowClick]);


  useEffect(() => {
    setActions(publishActions);
    return () => setActions(null);
  }, [publishActions, setActions]);

  const getTimePart24 = () => (scheduledAt && scheduledAt.includes('T')) ? scheduledAt.split('T')[1].substring(0, 5) : '12:00';

  const getHour12 = () => {
    const hh = parseInt(getTimePart24().split(':')[0]);
    if (isNaN(hh)) return '12';
    const h12 = hh % 12 || 12;
    return h12.toString().padStart(2, '0');
  };

  const getMinute = () => {
    const mm = getTimePart24().split(':')[1];
    return mm || '00';
  };

  const getAmPm = () => {
    const hh = parseInt(getTimePart24().split(':')[0]);
    return (hh >= 12 && hh < 24) ? 'PM' : 'AM';
  };

  const updateTime = (h12: string, mm: string, ampm: string) => {
    let h24 = parseInt(h12);
    if (ampm === 'PM' && h24 !== 12) h24 += 12;
    if (ampm === 'AM' && h24 === 12) h24 = 0;
    const time24 = `${h24.toString().padStart(2, '0')}:${mm}`;

    const date = scheduledAt ? scheduledAt.split('T')[0] : new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    setScheduledAt(`${date}T${time24}`);
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
              {loadingAccounts ? (
                <div className="platform-selector__loading">
                  <Loader2 size={18} className="spin" />
                  <span>Loading your accounts…</span>
                </div>
              ) : platforms.length === 0 ? (
                <div className="platform-selector__empty">
                  <AlertCircle size={18} color="#f97316" />
                  <span>No connected accounts.</span>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      onClick={() => handleConnectAccount('instagram')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(45deg,#f09433,#bc1888)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      <Instagram size={14} /> Connect Instagram
                    </button>
                    <button
                      onClick={() => handleConnectAccount('facebook')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1877f2', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      <Facebook size={14} /> Connect Facebook
                    </button>
                  </div>
                </div>
              ) : (
                platforms.map(p => (
                  <div
                    key={p.id}
                    className={`platform-pill ${p.selected ? 'platform-pill--selected' : ''}`}
                    onClick={() => togglePlatform(p.id)}
                  >
                    <div
                      className="platform-pill__icon"
                      style={{ background: getPlatformGradient(p.platform) }}
                    >
                      {getPlatformIcon(p.platform)}
                    </div>
                    <div className="platform-pill__info">
                      <span className="platform-pill__name" style={{ textTransform: 'capitalize' }}>{p.platform}</span>
                      <span className="platform-pill__handle">{p.username ? `@${p.username}` : '—'}</span>
                    </div>
                    <div className={`platform-pill__check ${p.selected ? 'platform-pill__check--active' : ''}`}>
                      {p.selected && <CheckCircle2 size={16} fill="#06b6d4" color="#1e293b" />}
                    </div>
                  </div>
                ))
              )}
            </div>
            {selectedAccounts.length === 1 && selectedAccounts[0].platform === 'facebook' && mediaFiles.length === 0 && (
              <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', background: 'rgba(24, 119, 242, 0.1)', color: '#1877f2', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                Text post — Facebook only
              </div>
            )}
          </div>

          {/* Editor Block */}
          <div className="compose-card editor-card">
            <div className="editor__toolbar">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={`editor__tool-btn ${editor?.isActive('bold') ? 'is-active' : ''}`}
                title="Bold">B</button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={`editor__tool-btn editor__tool-btn--italic ${editor?.isActive('italic') ? 'is-active' : ''}`}
                title="Italic">I</button>
              <button onMouseDown={(e) => e.preventDefault()} className="editor__tool-btn" title="Emoji" onClick={(e) => { e.preventDefault(); setShowEmojiPicker(!showEmojiPicker); }}>😊</button>
              <button onMouseDown={(e) => e.preventDefault()} className="editor__tool-btn" title="Link">🔗</button>
              <div className="editor__toolbar-spacer"></div>
              <button
                className="editor__ai-magic-btn"
                title="AI: Generate caption from media"
                disabled={isGeneratingCaption}
                onClick={async () => {
                  setIsGeneratingCaption(true);
                  try {
                    const result = await callGenerateCaption();
                    if (result) {
                      editor?.commands.setContent(result.caption);
                      setContent(result.caption);
                    }
                  } finally {
                    setIsGeneratingCaption(false);
                  }
                }}
              >
                {isGeneratingCaption
                  ? <Loader2 size={16} className="spin" color="#06b6d4" />
                  : <Zap size={16} color="#06b6d4" />}
              </button>
            </div>

            <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <EditorContent editor={editor} className="editor__textarea" style={{ flex: 1, display: 'flex', flexDirection: 'column' }} />
              {showEmojiPicker && (
                <div style={{ position: 'absolute', top: '40px', left: '10px', zIndex: 100 }}>
                  <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
                </div>
              )}
            </div>
          </div>

          {/* AI Quick Actions Block */}
          <div className="compose-card ai-quick-actions-card">
            <div className="compose-card__header">
              <span className="compose-card__label">✨ AI QUICK ACTIONS</span>
            </div>

            {/* Rewrite variant buttons */}
            <div className="ai-variants-group">
              {(['viral', 'professional', 'funny'] as const).map((variant) => (
                <button
                  key={variant}
                  disabled={isRewriting}
                  className={`ai-variant-btn ${rewritingVariant === variant && isRewriting ? 'ai-variant-btn--active' : ''}`}
                  onClick={async () => {
                    setIsRewriting(true);
                    setRewritingVariant(variant);
                    try {
                      const result = await callRewrite(variant);
                      if (result) { editor?.commands.setContent(result); setContent(result); }
                    } finally { setIsRewriting(false); setRewritingVariant(null); }
                  }}
                >
                  {isRewriting && rewritingVariant === variant
                    ? <Loader2 size={13} className="spin" />
                    : variant === 'viral' ? '🔥' : variant === 'professional' ? '💼' : '😂'}
                  {variant.charAt(0).toUpperCase() + variant.slice(1)}
                </button>
              ))}
            </div>

            {/* Tone slider */}
            <div className="ai-tone-slider-container">
              <div className="ai-tone-header">
                <span className="ai-tone-label">Tone: Formal ←→ Casual</span>
                <span className="ai-tone-value">
                  {getToneLabel(toneValue).charAt(0).toUpperCase() + getToneLabel(toneValue).slice(1)}
                </span>
              </div>
              <input
                type="range" min={0} max={100} value={toneValue}
                onChange={(e) => setToneValue(Number(e.target.value))}
                className="ai-tone-slider"
              />
            </div>

            {/* Platform adaptation row */}
            <div className="ai-adapt-container">
              <span className="ai-adapt-label">ADAPT FOR PLATFORM</span>
              <div className="ai-adapt-actions">
                <div className="ai-platform-toggles">
                  {(['instagram', 'facebook', 'twitter'] as const).map((plat) => (
                    <button
                      key={plat}
                      onClick={() => setSelectedPlatformAdapt(plat)}
                      className={`ai-platform-toggle ${selectedPlatformAdapt === plat ? 'ai-platform-toggle--active' : ''}`}
                    >
                      {plat === 'instagram' ? '📸 Instagram' : plat === 'facebook' ? '👥 Facebook' : '🐦 Twitter'}
                    </button>
                  ))}
                </div>
                <button
                  disabled={isAdapting}
                  onClick={async () => {
                    setIsAdapting(true);
                    try {
                      const result = await callAdapt();
                      if (result) { editor?.commands.setContent(result); setContent(result); }
                    } finally { setIsAdapting(false); }
                  }}
                  className="ai-adapt-btn"
                >
                  {isAdapting ? <Loader2 size={13} className="spin" /> : <Zap size={13} />}
                  Adapt
                </button>
              </div>
            </div>

            {/* Analyze Performance button */}
            <button
              disabled={isAnalyzing}
              onClick={callAnalyze}
              className="ai-analyze-btn"
            >
              {isAnalyzing ? <Loader2 size={15} className="spin" /> : <Zap size={15} color="#06b6d4" />}
              Analyze Performance
            </button>
          </div>

          {/* Hashtags Block */}

          <div className="compose-card hashtag-card" style={{ marginTop: '16px' }}>
            <div className="compose-card__header">
              <span className="compose-card__label">POST HASHTAGS</span>
              <button
                className="editor__ai-magic-btn"
                title="AI: Generate hashtags from media"
                style={{ marginLeft: 'auto' }}
                disabled={isGeneratingHashtags}
                onClick={async () => {
                  setIsGeneratingHashtags(true);
                  try {
                    const result = await callGenerateCaption();
                    if (result) {
                      setPostHashtags(result.hashtags);
                    }
                  } finally {
                    setIsGeneratingHashtags(false);
                  }
                }}
              >
                {isGeneratingHashtags
                  ? <Loader2 size={16} className="spin" color="#06b6d4" />
                  : <Zap size={16} color="#06b6d4" />}
              </button>
            </div>
            <input
              type="text"
              className="editor__textarea"
              style={{ minHeight: '40px', padding: '10px' }}
              placeholder="Add hashtags separated by spaces (e.g. #marketing #ai)"
              value={postHashtags}
              onChange={(e) => setPostHashtags(e.target.value)}
            />
          </div>

          {/* Media Assets Block */}
          <div className="compose-card media-card">
            <div className="compose-card__header">
              <span className="compose-card__label">MEDIA ASSETS</span>
              <span className="media-card__count">{mediaFiles.length} / 10 assets</span>
            </div>

            <div className="media-upload-grid">
              <label className="media-upload-btn" style={{ cursor: 'pointer' }}>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  style={{ display: 'none' }}
                />
                <ImageIcon size={24} />
                <span>{mediaFiles.length > 0 ? 'ADD MORE' : 'IMAGE'}</span>
              </label>
              <label className="media-upload-btn" style={{ cursor: 'pointer' }}>
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleMediaUpload}
                  style={{ display: 'none' }}
                />
                <Video size={24} />
                <span>VIDEO</span>
              </label>
              <button className="media-upload-btn" onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}>
                <Layers size={24} />
                <span>CAROUSEL</span>
              </button>
              <button className="media-upload-btn media-upload-btn--locked" disabled>
                <Lock size={20} />
              </button>
            </div>
            {mediaPreviews.length > 0 && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {mediaPreviews.map((preview, i) => (
                  <div key={i} style={{ position: 'relative', width: 'fit-content' }}>
                    {mediaFiles[i]?.type.startsWith('video') ? (
                      <video src={preview} width={60} height={60} style={{ borderRadius: '8px', objectFit: 'cover' }} />
                    ) : (
                      <img src={preview} alt="Preview" width={60} height={60} style={{ borderRadius: '8px', objectFit: 'cover' }} />
                    )}
                    <button
                      onClick={() => {
                        const newFiles = mediaFiles.filter((_, idx) => idx !== i);
                        const newPreviews = mediaPreviews.filter((_, idx) => idx !== i);
                        setMediaFiles(newFiles);
                        setMediaPreviews(newPreviews);
                        if (currentMediaIndex >= newFiles.length) setCurrentMediaIndex(Math.max(0, newFiles.length - 1));
                      }}
                      style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', width: 16, height: 16, border: 'none', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              <button
                className={`preview__tab ${activePreview === 'instagram' ? 'preview__tab--active' : ''}`}
                onClick={() => setActivePreview('instagram')}
              >
                Instagram
              </button>
              <button
                className={`preview__tab ${activePreview === 'facebook' ? 'preview__tab--active' : ''}`}
                onClick={() => setActivePreview('facebook')}
              >
                Facebook
              </button>
            </div>

            {/* Mock Phone Container for Preview */}
            <div className={`preview__device preview__device--${activePreview}`}>
              {activePreview === 'instagram' ? (
                mediaFiles.length === 1 && mediaFiles[0]?.type.startsWith('video') ? (
                  <div className="preview__post preview__post--reels">
                    <div className="reels__video-container">
                      <video
                        id="preview-video-player"
                        src={mediaPreviews[0] || undefined}
                        autoPlay
                        loop
                        muted={isMuted}
                        playsInline
                        className="post__mock-media post__mock-video"
                        onClick={handleTogglePlay}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                      />
                      <div className="video-controls" style={{ top: 12, right: 12, bottom: 'auto' }}>
                        <button className="video-btn" onClick={handleTogglePlay}>
                          {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
                        </button>
                        <button className="video-btn" onClick={handleToggleMute}>
                          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="reels__right-actions">
                      <div className="reels__action-btn"><Heart size={24} fill="white" /><span>Like</span></div>
                      <div className="reels__action-btn"><MessageCircle size={24} fill="white" /><span>Comment</span></div>
                      <div className="reels__action-btn"><Send size={24} fill="white" /><span>Share</span></div>
                      <div className="reels__action-btn"><MoreHorizontal size={24} color="white" /></div>
                      <div className="reels__audio-track" style={{ width: 24, height: 24, borderRadius: 4, background: '#333', border: '2px solid white', marginTop: 8 }}></div>
                    </div>

                    <div className="reels__overlay">
                      <div className="reels__author-info">
                        <div className="reels__avatar" style={{ background: '#bc1888' }}></div>
                        <span className="reels__author-name">{platforms.find(p => p.platform === 'instagram')?.username ?? 'your_account'}</span>
                        <button className="reels__follow-btn">Follow</button>
                      </div>

                      <div className="reels__caption">
                        {content || postHashtags ? (
                          <span dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} className="preview-html-container" />
                        ) : (
                          'Start composing your masterpiece...'
                        )}
                      </div>

                      <div className="reels__audio-info">
                        <Zap size={12} fill="white" />
                        <span>Original Audio</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="preview__post preview__post--instagram">
                    <div className="post__header">
                      <div className="post__avatar" style={{ background: '#bc1888' }}></div>
                      <div className="post__author-info">
                        <span className="post__author-name">{platforms.find(p => p.platform === 'instagram')?.username ?? 'your_account'}</span>
                        <span className="post__author-location">Original Audio</span>
                      </div>
                      <MoreHorizontal size={16} className="post__more" />
                    </div>

                    {mediaPreviews.length > 0 ? (
                      <div className="post__image-placeholder" style={{ background: '#000', position: 'relative' }}>
                        {mediaFiles[currentMediaIndex]?.type.startsWith('video') ? (
                          <video src={mediaPreviews[currentMediaIndex]} className="post__mock-media" controls={true} />
                        ) : (
                          <img src={mediaPreviews[currentMediaIndex]} alt="Preview" className="post__mock-media post__mock-image" />
                        )}
                        {mediaPreviews.length > 1 && (
                          <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
                            {mediaPreviews.map((_, idx) => (
                              <div key={idx} style={{ width: 6, height: 6, borderRadius: '50%', background: idx === currentMediaIndex ? '#06b6d4' : 'rgba(255,255,255,0.5)' }} />
                            ))}
                          </div>
                        )}
                        {mediaPreviews.length > 1 && (
                          <>
                            {currentMediaIndex > 0 && (
                              <button onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(c => c - 1); }} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{"<"}</button>
                            )}
                            {currentMediaIndex < mediaPreviews.length - 1 && (
                              <button onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(c => c + 1); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{">"}</button>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="post__image-placeholder">
                        <div className="post__no-media">No Media Uploaded</div>
                      </div>
                    )}

                    <div className="post__actions">
                      <Heart size={20} />
                      <MessageCircle size={20} />
                      <Send size={20} />
                    </div>

                    <div className="post__caption" style={{ whiteSpace: 'pre-wrap' }}>
                      <strong>{platforms.find(p => p.platform === 'instagram')?.username ?? 'your_account'}</strong>{' '}
                      {content || postHashtags ? (
                        <span dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} className="preview-html-container" />
                      ) : (
                        'Start composing your masterpiece...'
                      )}
                    </div>
                  </div>
                )
              ) : (
                mediaFiles.length === 1 && mediaFiles[0]?.type.startsWith('video') ? (
                  <div className="preview__post preview__post--reels">
                    <div className="reels__video-container">
                      <video
                        id="preview-video-player"
                        src={mediaPreviews[0] || undefined}
                        autoPlay
                        loop
                        muted={isMuted}
                        playsInline
                        className="post__mock-media post__mock-video"
                        onClick={handleTogglePlay}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                      />
                      <div className="video-controls" style={{ top: 12, right: 12, bottom: 'auto' }}>
                        <button className="video-btn" onClick={handleTogglePlay}>
                          {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
                        </button>
                        <button className="video-btn" onClick={handleToggleMute}>
                          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="reels__right-actions">
                      <div className="reels__action-btn"><Heart size={24} fill="white" /><span>Like</span></div>
                      <div className="reels__action-btn"><MessageCircle size={24} fill="white" /><span>Comment</span></div>
                      <div className="reels__action-btn"><Send size={24} fill="white" /><span>Share</span></div>
                      <div className="reels__action-btn"><MoreHorizontal size={24} color="white" /></div>
                    </div>

                    <div className="reels__overlay">
                      <div className="reels__author-info">
                        <div className="reels__avatar" style={{ background: '#1877f2' }}></div>
                        <span className="reels__author-name">{platforms.find(p => p.platform === 'facebook')?.username ?? 'Your Page'}</span>
                        <button className="reels__follow-btn" style={{ borderColor: 'transparent', background: '#1877f2' }}>Follow</button>
                      </div>

                      <div className="reels__caption">
                        {content || postHashtags ? (
                          <span dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} className="preview-html-container" />
                        ) : (
                          'Start composing your masterpiece...'
                        )}
                      </div>

                      <div className="reels__audio-info">
                        <Zap size={12} fill="white" />
                        <span>Original Audio</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="preview__post preview__post--facebook">
                    <div className="post__header post__header--fb">
                      <div className="post__avatar" style={{ background: '#1877f2' }}></div>
                      <div className="post__author-info">
                        <span className="post__author-name post__author-name--fb">{platforms.find(p => p.platform === 'facebook')?.username ?? 'Your Page'}</span>
                        <span className="post__author-time">Just now · 🌎</span>
                      </div>
                      <MoreHorizontal size={16} className="post__more" />
                    </div>

                    <div className="post__caption post__caption--fb" style={{ whiteSpace: 'pre-wrap', fontSize: mediaPreviews.length === 0 ? '24px' : '15px', padding: mediaPreviews.length === 0 ? '20px 16px' : '0 12px 12px' }}>
                      {content || postHashtags ? (
                        <span dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} className="preview-html-container" />
                      ) : (
                        "What's on your mind?"
                      )}
                    </div>

                    {mediaPreviews.length > 0 && (
                      <div className="post__image-placeholder post__image-placeholder--fb" style={{ background: '#f0f2f5', position: 'relative' }}>
                        {mediaFiles[currentMediaIndex]?.type.startsWith('video') ? (
                          <video src={mediaPreviews[currentMediaIndex]} className="post__mock-media" controls={true} />
                        ) : (
                          <img src={mediaPreviews[currentMediaIndex]} alt="Preview" className="post__mock-media post__mock-image" />
                        )}
                        {mediaPreviews.length > 1 && (
                          <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
                            {mediaPreviews.map((_, idx) => (
                              <div key={idx} style={{ width: 6, height: 6, borderRadius: '50%', background: idx === currentMediaIndex ? '#06b6d4' : 'rgba(255,255,255,0.5)' }} />
                            ))}
                          </div>
                        )}
                        {mediaPreviews.length > 1 && (
                          <>
                            {currentMediaIndex > 0 && (
                              <button onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(c => c - 1); }} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{"<"}</button>
                            )}
                            {currentMediaIndex < mediaPreviews.length - 1 && (
                              <button onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(c => c + 1); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{">"}</button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <div className="post__stats--fb">
                      <div className="post__stats-left"><Heart size={14} fill="#1877f2" color="#1877f2" style={{ marginRight: 4 }} /> 0</div>
                      <div className="post__stats-right">0 comments</div>
                    </div>

                    <div className="post__actions post__actions--fb">
                      <button className="fb-action-btn"><Heart size={18} /> Like</button>
                      <button className="fb-action-btn"><MessageCircle size={18} /> Comment</button>
                      <button className="fb-action-btn"><Send size={18} /> Share</button>
                    </div>
                  </div>
                )
              )}
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
              <span className="insight-panel__score-value text-cyan">
                {showInsightsPanel && insightsData ? `${insightsData.virality_score}%` : '—'}
              </span>
            </div>

            <div className="progress-bar">
              <div
                className="progress-bar__fill progress-bar__fill--cyan"
                style={{ width: showInsightsPanel && insightsData ? `${insightsData.virality_score}%` : '0%', transition: 'width 0.6s ease' }}
              />
            </div>

            {showInsightsPanel && insightsData ? (
              <>
                {/* Good points */}
                {insightsData.good.length > 0 && (
                  <div className="ai-insight-section">
                    <p className="ai-insight-section__title" style={{ color: '#06b6d4' }}>What's working</p>
                    {insightsData.good.map((pt, i) => (
                      <p key={i} className="ai-insight-panel__tip" style={{ color: '#86efac' }}>✓ {pt}</p>
                    ))}
                  </div>
                )}

                {/* Bad points */}
                {insightsData.bad.length > 0 && (
                  <div className="ai-insight-section">
                    <p className="ai-insight-section__title" style={{ color: '#f87171' }}>Areas to improve</p>
                    {insightsData.bad.map((pt, i) => (
                      <p key={i} className="ai-insight-panel__tip" style={{ color: '#f87171' }}>✕ {pt}</p>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {insightsData.suggestions.length > 0 && (
                  <div className="ai-insight-section">
                    <p className="ai-insight-section__title" style={{ color: '#fbbf24' }}>Suggestions</p>
                    {insightsData.suggestions.map((s, i) => (
                      <p key={i} className="ai-insight-panel__tip" style={{ color: '#fbbf24' }}>→ {s}</p>
                    ))}
                  </div>
                )}

                {/* Optimize Content section */}
                <div className="ai-optimize-section">
                  <p className="ai-optimize-label">ADD CONTEXT (optional)</p>
                  <textarea
                    className="ai-optimize-textarea"
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    placeholder="e.g. This is for a product launch targeting Gen Z..."
                    rows={2}
                  />
                  <button
                    className="btn-outline-full ai-optimize-btn"
                    disabled={isOptimizing}
                    onClick={callOptimize}
                  >
                    {isOptimizing ? <Loader2 size={15} className="spin" /> : <Zap size={15} color="#06b6d4" />}
                    Optimize Content
                  </button>
                  {optimizeImprovements.length > 0 && (
                    <div className="ai-improvements-list">
                      {optimizeImprovements.map((imp, i) => (
                        <p key={i} className="ai-improvement-item">• {imp}</p>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="insight-panel__tip">
                  Write a caption and click "Analyze Performance" to get AI-powered insights on your post.
                </p>
                <button className="btn-outline-full" onClick={callAnalyze} disabled={isAnalyzing}>
                  {isAnalyzing ? <Loader2 size={15} className="spin" style={{ display: 'inline' }} /> : null}
                  {isAnalyzing ? ' Analyzing...' : 'Analyze Performance'}
                </button>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Page-Specific Footer */}
      <div className="publish__footer">
        <div className="publish__footer-left" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '12px' }}>
          {scheduledAt ? (
            <>
              <Calendar size={16} color="#06b6d4" />
              <span style={{ fontSize: '14px', color: '#06b6d4', fontWeight: 500 }}>
                Scheduled: {new Date(scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              <button
                onClick={() => setScheduledAt('')}
                className="btn-clear-schedule"
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', marginLeft: '4px', fontSize: '18px', lineHeight: 1 }}
                title="Clear Schedule"
              >
                &times;
              </button>
            </>
          ) : (
            <>
              <Calendar size={16} color="#64748b" />
              <span style={{ fontSize: '14px', color: '#64748b' }}>Not scheduled</span>
            </>
          )}
        </div>

        <div className="publish__footer-center">
          {/* Schedule Post button lives here so it always has fresh state access */}
          <div className="btn-group">
            <button
              className="btn-cyan-split"
              onClick={() => setShowScheduleModal(true)}
              disabled={isSubmitting}
              id="schedule-post-btn"
            >
              <Calendar size={14} style={{ marginRight: '6px' }} />
              Schedule Post
            </button>
          </div>
        </div>

        <div className="publish__footer-right">
          <p className="footer__info">
            Drafting for <strong>{selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''}</strong>. AI active.
          </p>
        </div>
      </div>

      {/* Success Toast */}
      {showToast && (
        <div className="toast-popup">
          <div className="toast-popup__content">
            <CheckCircle2 size={20} color="#10b981" />
            <span>Draft saved successfully!</span>
          </div>
          <div className="toast-popup__actions">
            <button
              className="toast-popup__btn text-cyan"
              onClick={() => { setIsDraftsOpen(true); setShowToast(false); }}
            >
              View Drafts
            </button>
            <button
              className="toast-popup__btn"
              onClick={() => setShowToast(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Drafts Panel */}
      <div className={`drafts-panel ${isDraftsOpen ? 'drafts-panel--open' : ''}`}>
        <div className="drafts-panel__header">
          <h3>Saved Drafts</h3>
          <button className="btn-close" onClick={() => setIsDraftsOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="drafts-panel__content">
          {loadingDrafts ? (
            <div className="drafts-panel__loading">
              <Loader2 size={24} className="spin" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="drafts-panel__empty">
              <p>No drafts found.</p>
            </div>
          ) : (
            drafts.map(draft => (
              <div key={draft.id} className="draft-item" onClick={() => loadDraft(draft)}>
                <div className="draft-item__content">
                  {draft.content ? (
                    <p>{draft.content.length > 60 ? draft.content.substring(0, 60) + '...' : draft.content}</p>
                  ) : (
                    <p className="draft-item__no-text">No text content</p>
                  )}
                  {draft.media && draft.media.length > 0 && (
                    <div className="draft-item__media-badge">
                      {draft.media[0].type === 'video' ? <Video size={14} /> : <ImageIcon size={14} />}
                      <span>Has Media</span>
                    </div>
                  )}
                </div>
                <div className="draft-item__meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>{new Date(draft.created_at).toLocaleDateString()}</span>
                    {draft.post_targets?.length > 0 && (
                      <div className="draft-item__platforms" style={{ marginLeft: '4px' }}>
                        {draft.post_targets.slice(0, 3).map((target: any, i: number) => (
                          <span key={i} className="draft-platform-icon" style={{ marginLeft: '-4px' }}>
                            {getPlatformIcon(target.social_accounts?.platform || '')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDraft(draft.id);
                    }}
                    title="Delete Draft"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Validation Alert Modal */}
      {alertConfig && (
        <div className="schedule-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="schedule-modal">
            <div className="schedule-modal__header">
              <h3>{alertConfig.title}</h3>
              <button className="btn-close" onClick={() => setAlertConfig(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="schedule-modal__content" style={{ marginTop: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={20} color="#f97316" />
                  <span style={{ fontSize: '15px', color: '#f8fafc', fontWeight: 500, lineHeight: 1.4 }}>
                    {alertConfig.message}
                  </span>
                </div>
              </div>
            </div>
            <div className="schedule-modal__actions">
              <button className="btn-cyan-split" onClick={() => setAlertConfig(null)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Now Modal */}
      {showPublishModal && (
        <div className="schedule-modal-overlay">
          <div className="schedule-modal">
            <div className="schedule-modal__header">
              <h3>Publish Post Now</h3>
              <button className="btn-close" onClick={() => setShowPublishModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="schedule-modal__content" style={{ marginTop: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={20} color="#06b6d4" />
                  <span style={{ fontSize: '15px', color: '#f8fafc', fontWeight: 500 }}>
                    Publish this post immediately?
                  </span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0, paddingLeft: '28px', lineHeight: 1.5 }}>
                  Your post will be sent to <strong>{selectedAccounts.length}</strong> selected account(s). This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="schedule-modal__actions">
              <button className="btn-outline-ghost" onClick={() => setShowPublishModal(false)}>Cancel</button>
              <button className="btn-cyan-split" onClick={confirmPublishNow} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 size={14} className="spin" /> : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="schedule-modal-overlay">
          <div className="schedule-modal">
            <div className="schedule-modal__header">
              <h3>Schedule Post</h3>
              <button className="btn-close" onClick={() => setShowScheduleModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="schedule-modal__content">
              <label>Select Date & Time</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px' }}>Date</label>
                  <input
                    type="date"
                    value={scheduledAt ? scheduledAt.split('T')[0] : ''}
                    onChange={(e) => {
                      const date = e.target.value;
                      if (!date) {
                        setScheduledAt('');
                        return;
                      }
                      const time = (scheduledAt && scheduledAt.includes('T')) ? scheduledAt.split('T')[1].substring(0, 5) : '12:00';
                      setScheduledAt(`${date}T${time}`);
                    }}
                    min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px' }}>Time</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <select
                      value={getHour12()}
                      onChange={(e) => updateTime(e.target.value, getMinute(), getAmPm())}
                      style={{ background: '#0f1724', border: '1px solid #334155', color: '#f8fafc', padding: '10px 8px', borderRadius: '8px', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                        <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                    <span style={{ color: '#94a3b8', alignSelf: 'center', fontWeight: 'bold' }}>:</span>
                    <select
                      value={getMinute()}
                      onChange={(e) => updateTime(getHour12(), e.target.value, getAmPm())}
                      style={{ background: '#0f1724', border: '1px solid #334155', color: '#f8fafc', padding: '10px 8px', borderRadius: '8px', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                    >
                      {Array.from({ length: 60 }, (_, i) => i).map(m => (
                        <option key={m} value={m.toString().padStart(2, '0')}>{m.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                    <select
                      value={getAmPm()}
                      onChange={(e) => updateTime(getHour12(), getMinute(), e.target.value)}
                      style={{ background: '#0f1724', border: '1px solid #334155', color: '#f8fafc', padding: '10px 8px', borderRadius: '8px', outline: 'none', marginLeft: '4px', appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>
              <p className="schedule-modal__hint" style={{ marginTop: '8px' }}>
                Posts must be scheduled at least 5 minutes in the future.
              </p>
            </div>
            <div className="schedule-modal__actions">
              <button className="btn-outline-ghost" onClick={() => setShowScheduleModal(false)}>Cancel</button>
              <button className="btn-cyan-split" onClick={() => {
                if (!scheduledAt) {
                  alert("Please select a date and time to schedule.");
                  return;
                }
                const selectedTime = new Date(scheduledAt).getTime();
                if (selectedTime < Date.now()) {
                  alert("Schedule time must be in the future.");
                  return;
                }
                setShowScheduleModal(false);
                submitPost('scheduled');
              }}>
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
