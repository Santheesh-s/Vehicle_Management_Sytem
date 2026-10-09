import React from 'react';

/**
 * Navbar component:
 * Displays brand logo, live free spots pill with pulsing status dot,
 * navigation tabs, and authentication state (Sign In / Logout).
 */
export default function Navbar({
  currentUser,
  viewMode,
  setViewMode,
  portalTab,
  setPortalTab,
  availableCount,
  onOpenLogin,
  onLogout
}) {
  return (
    <header className="navbar">
      <div className="nav-inner">
        {/* Brand */}
        <div className="brand" onClick={() => setViewMode('public')}>
          <div className="brand-icon">
            <i className="fa-solid fa-square-parking"></i>
          </div>
          <div className="brand-text">
            Park<span>Sys</span> <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>VMS</span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="nav-center">
          <button
            className={`nav-link-btn ${viewMode === 'public' ? 'active' : ''}`}
            onClick={() => setViewMode('public')}
          >
            <i className="fa-solid fa-house"></i> Public Live Map
          </button>

          {currentUser ? (
            <button
              className={`nav-link-btn ${viewMode === 'portal' ? 'active' : ''}`}
              onClick={() => setViewMode('portal')}
            >
              <i className="fa-solid fa-gauge-high"></i> Operator Portal
            </button>
          ) : null}
        </nav>

        {/* Right Nav: Live Status & Auth */}
        <div className="nav-right">
          <div className="live-badge" title="Live status automatically updated">
            <span className="pulse-dot"></span>
            <span>{availableCount} Free Spots</span>
          </div>

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="user-profile-chip">
                <div className="user-avatar">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
                <span className="user-name">{currentUser.username}</span>
                <span className="user-role-badge">{currentUser.role}</span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={onLogout} title="Sign Out">
                <i className="fa-solid fa-right-from-bracket"></i> Logout
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={onOpenLogin}>
              <i className="fa-solid fa-right-to-bracket"></i> Operator Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
