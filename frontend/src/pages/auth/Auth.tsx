import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { signIn, signUp, resetPassword, signInWithGoogle } from '../../lib/auth'
import './Auth.css'
import '../auth/ResetPassword.css' // for .auth-error-message / .auth-success-message

type Tab = 'login' | 'signup'

interface PasswordStrength {
  level: 'weak' | 'medium' | 'good' | 'strong'
  segments: number
  hint: string
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { level: 'weak', segments: 1, hint: 'Use symbols & numbers' }
  if (score === 2) return { level: 'medium', segments: 2, hint: 'Add uppercase letters' }
  if (score === 3) return { level: 'good', segments: 3, hint: 'Use symbols & numbers' }
  return { level: 'strong', segments: 4, hint: 'Great password!' }
}

export default function Auth() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('login')

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)
  const [remember, setRemember] = useState(false)

  // Signup state
  const [fullName, setFullName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showSignupPw, setShowSignupPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  // Forgot password state
  const [showForgotPw, setShowForgotPw] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')

  // Shared UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const signupStrength = getPasswordStrength(signupPassword)
  const confirmStrength = getPasswordStrength(confirmPassword)

  // ── Login handler ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    const { error: loginError } = await signIn(loginEmail, loginPassword)
    setLoading(false)

    if (loginError) {
      setError(loginError.message)
    } else {
      navigate('/')
    }
  }

  // ── Signup handler ──
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: signupError } = await signUp(signupEmail, signupPassword, fullName)
    setLoading(false)

    if (signupError) {
      setError(signupError.message)
    } else {
      setSuccessMsg('Account created! Check your email to verify your address, then log in.')
    }
  }

  // ── Forgot password handler ──
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    const { error: resetError } = await resetPassword(forgotEmail)
    setLoading(false)

    if (resetError) {
      setError(resetError.message)
    } else {
      setSuccessMsg('Password reset email sent! Check your inbox.')
    }
  }

  // ── Google OAuth handler ──
  const handleGoogleLogin = async () => {
    setError('')
    const { error: oauthError } = await signInWithGoogle()
    if (oauthError) {
      setError(oauthError.message)
    }
  }

  const renderStrengthBar = (strength: PasswordStrength) => (
    <>
      <div className="auth-strength-bar">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`auth-strength-segment ${i <= strength.segments ? `filled-${strength.level}` : ''}`}
          />
        ))}
      </div>
      <div className="auth-strength-info">
        <span className={`auth-strength-label ${strength.level}`}>
          Strength: {strength.level}
        </span>
        <span className="auth-strength-hint">{strength.hint}</span>
      </div>
    </>
  )

  return (
    <div className="auth-page">
      {/* ── Left Panel ── */}
      <div className="auth-left">
        <div className="auth-logo">
          <div className="auth-logo-icon">✦</div>
          <span>Social AI</span>
        </div>

        <div className="auth-hero-text">
          <h1>
            Understand Your Social Media Like{' '}
            <span className="highlight">Never Before.</span>
          </h1>
          <p className="auth-hero-subtitle">
            Get AI-powered insights and competitor analysis to grow your
            presence. Join 10,000+ creators scaling their influence.
          </p>
        </div>

        <div className="auth-stats-area">
          <div className="auth-chart-card">
            <div className="auth-chart-header">
              <span>Engagement Rate</span>
              <span className="auth-chart-badge">+12.4%</span>
            </div>
            <div className="auth-bar-chart">
              <div className="auth-bar light" style={{ height: '35%' }} />
              <div className="auth-bar dark" style={{ height: '40%' }} />
              <div className="auth-bar light" style={{ height: '30%' }} />
              <div className="auth-bar dark" style={{ height: '55%' }} />
              <div className="auth-bar accent" style={{ height: '70%' }} />
              <div className="auth-bar light" style={{ height: '45%' }} />
              <div className="auth-bar dark" style={{ height: '60%' }} />
              <div className="auth-bar accent" style={{ height: '85%' }} />
            </div>
          </div>

          <div className="auth-insight-card">
            <div className="auth-insight-label">
              <span className="auth-insight-dot" />
              AI Insight
            </div>
            <p>
              "Post volume is up, but audience sentiment is shifting towards
              video content. Recommend 2 Reels/week."
            </p>
          </div>
        </div>

        <div className="auth-left-footer">
          <div className="auth-badge">
            <span className="auth-badge-icon">🛡</span> GDPR Compliant
          </div>
          <div className="auth-badge">
            <span className="auth-badge-icon">📈</span> Real-time Analytics
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-form-heading">
            <h2>
              {showForgotPw
                ? 'Reset Password'
                : activeTab === 'login'
                  ? 'Welcome back'
                  : 'Create Account'}
            </h2>
            <p>
              {showForgotPw
                ? 'Enter your email and we\'ll send you a reset link.'
                : activeTab === 'login'
                  ? 'Start optimizing your social growth today.'
                  : 'Start growing your presence today.'}
            </p>
          </div>

          {/* Error / Success messages */}
          {error && <div className="auth-error-message">{error}</div>}
          {successMsg && <div className="auth-success-message">{successMsg}</div>}

          {/* ─── FORGOT PASSWORD INLINE FORM ─── */}
          {showForgotPw ? (
            <form onSubmit={handleForgotPassword}>
              <div className="auth-field">
                <div className="auth-field-label">
                  <label>Email address</label>
                </div>
                <div className="auth-input-wrapper">
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>

              <div className="auth-switch">
                <a onClick={() => { setShowForgotPw(false); setError(''); setSuccessMsg('') }}>
                  ← Back to Login
                </a>
              </div>
            </form>
          ) : (
            <>
              {/* Tabs */}
              <div className="auth-tabs">
                <button
                  className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('login'); setError(''); setSuccessMsg('') }}
                >
                  Login
                </button>
                <button
                  className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('signup'); setError(''); setSuccessMsg('') }}
                >
                  Sign Up
                </button>
              </div>

              {/* ─── LOGIN FORM ─── */}
              {activeTab === 'login' && (
                <form onSubmit={handleLogin}>
                  {/* Social buttons */}
                  <div className="auth-social-buttons">
                    <button type="button" className="auth-social-btn google" title="Google" onClick={handleGoogleLogin}>
                      <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    </button>
                    <button type="button" className="auth-social-btn twitter" title="X">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    </button>
                    <button type="button" className="auth-social-btn linkedin" title="LinkedIn">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                    </button>
                  </div>

                  <div className="auth-divider">
                    <span>or continue with email</span>
                  </div>

                  <div className="auth-field">
                    <div className="auth-field-label">
                      <label>Email address</label>
                    </div>
                    <div className="auth-input-wrapper">
                      <input
                        type="email"
                        placeholder="name@company.com"
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <div className="auth-field-label">
                      <label>Password</label>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setShowForgotPw(true)
                          setError('')
                          setSuccessMsg('')
                        }}
                      >
                        Forgot password?
                      </a>
                    </div>
                    <div className="auth-input-wrapper">
                      <input
                        type={showLoginPw ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="auth-input-toggle"
                        onClick={() => setShowLoginPw(p => !p)}
                      >
                        {showLoginPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="auth-remember">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={remember}
                      onChange={e => setRemember(e.target.checked)}
                    />
                    <label htmlFor="remember">Remember me for 30 days</label>
                  </div>

                  <button type="submit" className="auth-submit-btn" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign In \u00a0→'}
                  </button>

                  <div className="auth-switch">
                    Don't have an account?{' '}
                    <a onClick={() => { setActiveTab('signup'); setError(''); setSuccessMsg('') }}>Sign Up</a>
                  </div>

                  <div className="auth-social-proof">
                    <div className="auth-avatars">
                      <div className="auth-avatar">A</div>
                      <div className="auth-avatar">B</div>
                      <div className="auth-avatar">C</div>
                    </div>
                    <span>Joined by 2k+ teams this month</span>
                  </div>
                </form>
              )}

              {/* ─── SIGNUP FORM ─── */}
              {activeTab === 'signup' && (
                <form onSubmit={handleSignup}>
                  <div className="auth-field">
                    <div className="auth-field-label">
                      <label>Full Name</label>
                    </div>
                    <div className="auth-input-wrapper">
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <div className="auth-field-label">
                      <label>Email Address</label>
                    </div>
                    <div className="auth-input-wrapper">
                      <input
                        type="email"
                        placeholder="name@company.com"
                        value={signupEmail}
                        onChange={e => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <div className="auth-field-label">
                      <label>Password</label>
                    </div>
                    <div className="auth-input-wrapper">
                      <input
                        type={showSignupPw ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={e => setSignupPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="auth-input-toggle"
                        onClick={() => setShowSignupPw(p => !p)}
                      >
                        {showSignupPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {signupPassword && renderStrengthBar(signupStrength)}
                  </div>

                  <div className="auth-field">
                    <div className="auth-field-label">
                      <label>Confirm Password</label>
                    </div>
                    <div className="auth-input-wrapper">
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="auth-input-toggle"
                        onClick={() => setShowConfirmPw(p => !p)}
                      >
                        {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {confirmPassword && renderStrengthBar(confirmStrength)}
                  </div>

                  <button type="submit" className="auth-submit-btn" disabled={loading}>
                    {loading ? 'Creating account…' : 'Create Account'}
                  </button>

                  <div className="auth-divider" style={{ marginTop: '24px' }}>
                    <span>or continue with</span>
                  </div>

                  <div className="auth-social-buttons">
                    <button type="button" className="auth-social-btn google" title="Google" onClick={handleGoogleLogin}>
                      <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    </button>
                    <button type="button" className="auth-social-btn twitter" title="X">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    </button>
                    <button type="button" className="auth-social-btn linkedin" title="LinkedIn">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                    </button>
                  </div>

                  <div className="auth-switch">
                    Already have an account?{' '}
                    <a onClick={() => { setActiveTab('login'); setError(''); setSuccessMsg('') }}>Log In</a>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
