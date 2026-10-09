import React, { useState, useEffect } from 'react';
import { loginUser, requestOtp, verifyOtp } from '../api';

/**
 * LoginModal Component:
 * Clean, enterprise-style authentication dialog:
 * - Uses Email and Password with JWT token generation
 * - Clears credentials upon opening/logout
 * - Clean OTP password reset flow (no demo codes displayed)
 * - Sign In only (no public registration, no demo buttons)
 */
export default function LoginModal({ isOpen, onClose, onLoginSuccess, onShowAlert }) {
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP states
  const [otpTarget, setOtpTarget] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpNewPassword, setOtpNewPassword] = useState('');
  const [otpStep, setOtpStep] = useState(1);

  // Clear all credentials every time the modal is opened
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setIsOtpMode(false);
      setOtpStep(1);
      setOtpTarget('');
      setOtpCode('');
      setOtpNewPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Sign In Handler with JWT storage
  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      onShowAlert('Please enter both email and password.', 'danger');
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser(email.trim(), password.trim());
      if (res.success && res.data) {
        const user = res.data.user || res.data;
        const token = res.data.token;

        if (token) {
          localStorage.setItem('token', token);
        }
        localStorage.setItem('currentUser', JSON.stringify(user));

        // Clear local input fields
        setEmail('');
        setPassword('');

        onLoginSuccess(user);
        onShowAlert(`Welcome back, ${user.username || user.email}! Authenticated via JWT.`, 'success');
        onClose();
      } else {
        onShowAlert(res.message || 'Invalid email or password', 'danger');
      }
    } catch (err) {
      onShowAlert('Error during sign in: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // OTP Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!otpTarget.trim()) {
      onShowAlert('Enter your registered email address or phone number.', 'danger');
      return;
    }

    setLoading(true);
    try {
      const res = await requestOtp(otpTarget.trim());
      if (res.success) {
        setOtpStep(2);
        onShowAlert('OTP sent successfully. Please check your email or phone.', 'success');
      } else {
        onShowAlert(res.message || 'Failed to send OTP', 'danger');
      }
    } catch (err) {
      onShowAlert('OTP request error: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // OTP Step 2: Verify & Reset
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim() || !otpNewPassword.trim()) {
      onShowAlert('Enter both the OTP code and your new password.', 'danger');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp({
        target: otpTarget.trim(),
        otpCode: otpCode.trim(),
        newPassword: otpNewPassword.trim(),
      });

      if (res.success) {
        onShowAlert('Password reset successfully! You can now sign in.', 'success');
        setIsOtpMode(false);
        setOtpStep(1);
        setOtpCode('');
        setOtpNewPassword('');
      } else {
        onShowAlert(res.message || 'OTP verification failed', 'danger');
      }
    } catch (err) {
      onShowAlert('OTP verification error: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="fa-solid fa-shield-halved" style={{ color: 'var(--primary)' }}></i>
            {isOtpMode ? 'Reset Password via OTP' : 'Operator & Admin Sign In'}
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* STANDARD SIGN IN */}
          {!isOtpMode ? (
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@parksys.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                    onClick={() => {
                      setIsOtpMode(true);
                      setOtpStep(1);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  style={{ marginTop: '6px' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '12px' }}
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In with JWT'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-lock" style={{ marginRight: '4px' }}></i>
                Secured with JWT (JSON Web Token) Header Authentication
              </div>
            </form>
          ) : (
            /* OTP PASSWORD RESET FLOW (NO DEMO BANNERS) */
            <div>
              {otpStep === 1 ? (
                <form onSubmit={handleRequestOtp}>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Enter your registered email address or phone number to receive a 6-digit verification OTP.
                  </p>
                  <div className="form-group">
                    <label className="form-label">Registered Email or Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. admin@parksys.com or 9876543210"
                      value={otpTarget}
                      onChange={(e) => setOtpTarget(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setIsOtpMode(false)}
                      style={{ flex: 1 }}
                    >
                      Back to Sign In
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      disabled={loading}
                    >
                      {loading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Enter the 6-digit verification code sent to <strong>{otpTarget}</strong> and set your new password.
                  </p>

                  <div className="form-group">
                    <label className="form-label">6-Digit OTP Code</label>
                    <input
                      type="text"
                      maxLength="6"
                      className="form-control"
                      placeholder="••••••"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      required
                      style={{ letterSpacing: '4px', fontSize: '1.2rem', fontWeight: 700, textAlign: 'center' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter new password"
                      value={otpNewPassword}
                      onChange={(e) => setOtpNewPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setOtpStep(1)}
                      style={{ flex: 1 }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ flex: 2 }}
                      disabled={loading}
                    >
                      {loading ? 'Verifying...' : 'Verify & Set Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
