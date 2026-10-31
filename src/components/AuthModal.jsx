import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Modal } from './Modal';
import { IconShield, IconAlertCircle, IconCheck, IconEye } from './Icons';
import { authApi } from '../services/apiService';

export const AuthModal = ({ isOpen, onClose, initialMode = 'login', onAuthSuccess }) => {
  const { t, language, showToast, refreshUserData } = useApp();
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setLoading(false);
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage(t.common?.requiredFields || 'Please fill in all required fields.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMessage(t.auth?.nameRequired || 'Full name is required.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage(t.auth?.passwordTooShort || 'Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage(t.auth?.passwordMismatch || 'Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      let result;
      if (mode === 'register') {
        result = await authApi.register({
          name: name.trim(),
          email: email.trim(),
          password,
          language
        });
        showToast(t.auth?.registerSuccess || 'Account created successfully!');
      } else {
        result = await authApi.login({
          email: email.trim(),
          password
        });
        showToast(t.auth?.loginSuccess || 'Signed in successfully!');
      }

      resetForm();
      if (refreshUserData) {
        await refreshUserData();
      }
      if (onAuthSuccess) {
        onAuthSuccess(result.user);
      }
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title={mode === 'login' ? (t.auth?.signIn || 'Sign In') : (t.auth?.signUp || 'Create Account')}
      maxWidth="460px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Tab Switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            backgroundColor: 'var(--bg-subtle)',
            padding: '4px',
            borderRadius: '10px'
          }}
        >
          <button
            type="button"
            className={`pill-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => handleModeSwitch('login')}
            style={{ fontWeight: 700 }}
          >
            {t.auth?.signIn || 'Sign In'}
          </button>
          <button
            type="button"
            className={`pill-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => handleModeSwitch('register')}
            style={{ fontWeight: 700 }}
          >
            {t.auth?.signUp || 'Create Account'}
          </button>
        </div>

        {/* Security Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            backgroundColor: '#eff6ff',
            borderRadius: '10px',
            border: '1px solid #bfdbfe',
            fontSize: '0.82rem',
            color: '#1e40af'
          }}
        >
          <IconShield size={16} color="#2563eb" />
          <span>
            {mode === 'login'
              ? (t.auth?.loginSecurityNote || 'Your medical records are encrypted and protected by strict multi-tenant access control.')
              : (t.auth?.registerSecurityNote || 'Passwords are encrypted on the server with unique cryptographic salts.')}
          </span>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              borderRadius: '10px',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <IconAlertCircle size={16} color="#dc2626" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {mode === 'register' && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                {t.auth?.name || 'Full Name'} *
              </label>
              <input
                type="text"
                className="form-control"
                placeholder={t.auth?.namePlaceholder || 'e.g., Rajesh Sharma'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              {t.auth?.email || 'Email Address'} *
            </label>
            <input
              type="email"
              className="form-control"
              placeholder="patient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus={mode === 'login'}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                {t.auth?.password || 'Password'} *
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-600)',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  padding: 0
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              placeholder={mode === 'register' ? 'Minimum 6 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ marginTop: '6px' }}
            />
          </div>

          {mode === 'register' && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                {t.auth?.confirmPassword || 'Confirm Password'} *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '6px', fontWeight: 800, padding: '12px' }}
          >
            {loading ? (t.common?.loading || 'Processing...') : mode === 'login' ? (t.auth?.signIn || 'Sign In') : (t.auth?.signUp || 'Create Account')}
          </button>
        </form>

        {/* Footer Link */}
        <div style={{ textAlign: 'center', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
          {mode === 'login' ? (
            <span>
              {t.auth?.dontHaveAccount || "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => handleModeSwitch('register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-600)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {t.auth?.signUp || 'Create Account'}
              </button>
            </span>
          ) : (
            <span>
              {t.auth?.alreadyHaveAccount || 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => handleModeSwitch('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-600)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {t.auth?.signIn || 'Sign In'}
              </button>
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
};
