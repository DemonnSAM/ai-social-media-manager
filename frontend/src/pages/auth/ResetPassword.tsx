import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { updatePassword } from '../../lib/auth'
import './Auth.css'
import './ResetPassword.css'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    const { error: updateError } = await updatePassword(password)
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/'), 2000)
    }
  }

  return (
    <div className="auth-page">
      {/* ── Left Panel (same style) ── */}
      <div className="auth-left">
        <div className="auth-logo">
          <div className="auth-logo-icon">✦</div>
          <span>Social AI</span>
        </div>

        <div className="auth-hero-text">
          <h1>
            Reset Your <span className="highlight">Password.</span>
          </h1>
          <p className="auth-hero-subtitle">
            Enter your new password below. Make sure it's strong and unique.
          </p>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-form-heading">
            <h2>Set New Password</h2>
            <p>Choose a strong password for your account.</p>
          </div>

          {success ? (
            <div className="reset-success-message">
              <span className="reset-success-icon">✓</span>
              <p>Password updated successfully! Redirecting…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="auth-error-message">{error}</div>}

              <div className="auth-field">
                <div className="auth-field-label">
                  <label>New Password</label>
                </div>
                <div className="auth-input-wrapper">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="auth-input-toggle"
                    onClick={() => setShowPw(p => !p)}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-field-label">
                  <label>Confirm New Password</label>
                </div>
                <div className="auth-input-wrapper">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="auth-input-toggle"
                    onClick={() => setShowConfirmPw(p => !p)}
                  >
                    {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Updating…' : 'Update Password'}
              </button>

              <div className="auth-switch">
                Remember your password?{' '}
                <a onClick={() => navigate('/auth')}>Back to Login</a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
