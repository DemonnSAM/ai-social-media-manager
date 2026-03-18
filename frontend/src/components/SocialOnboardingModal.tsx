import { useState, useEffect } from 'react';
import { Facebook, Instagram, ShieldAlert, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './SocialOnboardingModal.css';

interface SocialOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SocialOnboardingModal({ isOpen, onClose }: SocialOnboardingModalProps) {
  const { session } = useAuth();
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);

  // Close modal on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConnect = async (platform: 'instagram' | 'facebook') => {
    try {
      setLoadingPlatform(platform);

      const user = session?.user; // Use session.user from useAuth
      if (!user) {
        throw new Error('You must be logged in to connect social accounts.');
      }

      // We redirect directly to our custom Express backend endpoint for Meta OAuth.
      // We pass the user_id and platform so the backend can attach the accounts to this user.
      const backendUrl = `http://localhost:5000/api/auth/meta?user_id=${user.id}&platform=${platform}`;
      window.location.href = backendUrl;

    } catch (err: any) {
      console.error('Error connecting to meta:', err.message);
      setLoadingPlatform(null);
    }
  };

  return (
    <div className="onboarding-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="onboarding-modal" onClick={(e) => e.stopPropagation()}>

        {/* Beta Banner */}
        <div className="onboarding-banner">
          <ShieldAlert size={16} />
          <span><strong>Beta Version:</strong> Currently only Meta platforms (Instagram & Facebook) are supported.</span>
        </div>

        {/* Header */}
        <div className="onboarding-header">
          <h2 className="onboarding-title">Connect Your Social Accounts</h2>
          <p className="onboarding-subtitle">
            To start publishing content and viewing analytics, connect at least one social media account.
          </p>
        </div>

        {/* Content Body */}
        <div className="onboarding-body">
          <div className="connection-cards">

            {/* Instagram Card */}
            <button
              className="connection-card connection-card--ig"
              onClick={() => handleConnect('instagram')}
              disabled={loadingPlatform !== null}
            >
              <div className="connection-card__icon-wrap ig-gradient">
                <Instagram size={28} color="#fff" />
              </div>
              <div className="connection-card__content">
                <h3>Connect Instagram Business</h3>
                <p>Access insights, publish posts, and manage your Instagram content.</p>
              </div>
              <div className="connection-card__action">
                {loadingPlatform === 'instagram' ? <div className="spinner" /> : <ArrowRight size={20} />}
              </div>
            </button>

            {/* Facebook Card */}
            <button
              className="connection-card connection-card--fb"
              onClick={() => handleConnect('facebook')}
              disabled={loadingPlatform !== null}
            >
              <div className="connection-card__icon-wrap fb-blue">
                <Facebook size={28} color="#fff" fill="#fff" />
              </div>
              <div className="connection-card__content">
                <h3>Connect Facebook Page</h3>
                <p>Manage and publish posts to your Facebook pages.</p>
              </div>
              <div className="connection-card__action">
                {loadingPlatform === 'facebook' ? <div className="spinner" /> : <ArrowRight size={20} />}
              </div>
            </button>

          </div>

          <div className="onboarding-helper-text">
            <span>ℹ️</span> Instagram accounts must be Professional or Business accounts connected to a Facebook Page.
          </div>
        </div>

        {/* Footer */}
        <div className="onboarding-footer">
          <a href="#" className="onboarding-link" onClick={(e) => e.preventDefault()}>
            Learn how account connection works
          </a>
          <button className="onboarding-skip-btn" onClick={onClose}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
