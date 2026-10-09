import React, { useState } from 'react';
import { registerUser } from '../api';

/**
 * AddUserModal Component (Admin only):
 * Form to register a new staff operator or system administrator.
 */
export default function AddUserModal({ isOpen, onClose, onUserCreated, onShowAlert }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('OPERATOR');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      onShowAlert('Username and password are required.', 'danger');
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser({
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim(),
        role,
      });

      if (res.success) {
        onShowAlert(`User ${username} created successfully!`, 'success');
        onUserCreated();
        onClose();
        // Reset
        setUsername('');
        setEmail('');
        setPhone('');
        setPassword('');
      } else {
        onShowAlert(res.message || 'Failed to create user.', 'danger');
      }
    } catch (err) {
      onShowAlert('Error creating user: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="fa-solid fa-user-plus" style={{ color: 'var(--primary)' }}></i>
            Register New Staff / Operator
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. gate_operator_1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="operator@parksys.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role Access *</label>
                <select
                  className="form-control"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="OPERATOR">Gate Operator</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <i className="fa-solid fa-check"></i> {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
