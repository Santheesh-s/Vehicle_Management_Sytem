import React, { useState } from 'react';
import { sendReportEmail } from '../api';

/**
 * EmailReportModal Component:
 * Dialog for emailing daily parking revenue audit reports to management.
 */
export default function EmailReportModal({ isOpen, onClose, date, onShowAlert }) {
  const [email, setEmail] = useState('admin@parking.com');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      onShowAlert('Recipient email is required.', 'danger');
      return;
    }

    setLoading(true);
    try {
      const res = await sendReportEmail(date, email.trim());
      if (res.success) {
        onShowAlert(res.message || `Audit report dispatched to ${email}!`, 'success');
        onClose();
      } else {
        onShowAlert(res.message || 'Failed to dispatch email.', 'danger');
      }
    } catch (err) {
      onShowAlert('Error emailing report: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="fa-solid fa-paper-plane" style={{ color: 'var(--primary)' }}></i>
            Dispatch Daily Audit by Email
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Send summary throughput and revenue statistics for <strong>{date}</strong>.
            </p>

            <div className="form-group">
              <label className="form-label">Recipient Email Address *</label>
              <input
                type="email"
                className="form-control"
                placeholder="manager@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <i className="fa-solid fa-envelope"></i> {loading ? 'Sending...' : 'Send Audit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
