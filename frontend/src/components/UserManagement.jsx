import React, { useState, useEffect } from 'react';
import { fetchUsers, toggleUserStatus, deleteUser } from '../api';

/**
 * UserManagement Component (Admin only):
 * Complete administrator controls:
 * 1. Add new operators
 * 2. Toggle active/disabled status
 * 3. Permanently delete user accounts
 */
export default function UserManagement({ onOpenAddUser, onShowAlert }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetchUsers();
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggle = async (userId) => {
    try {
      const res = await toggleUserStatus(userId);
      if (res.success) {
        onShowAlert(res.message || 'User status updated', 'success');
        loadUsers();
      } else {
        onShowAlert(res.message || 'Failed to toggle status', 'danger');
      }
    } catch (err) {
      onShowAlert('Error updating user: ' + err.message, 'danger');
    }
  };

  const handleDelete = async (userId, username) => {
    if (username === 'admin') {
      onShowAlert('Cannot delete the primary administrator account.', 'danger');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete account "${username}"?`)) {
      return;
    }

    try {
      const res = await deleteUser(userId);
      if (res.success) {
        onShowAlert(`User "${username}" deleted successfully.`, 'success');
        loadUsers();
      } else {
        onShowAlert(res.message || 'Failed to delete user', 'danger');
      }
    } catch (err) {
      onShowAlert('Error deleting user: ' + err.message, 'danger');
    }
  };

  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.active).length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const operatorCount = users.filter((u) => u.role === 'OPERATOR').length;

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <i className="fa-solid fa-users-gear" style={{ color: 'var(--primary)' }}></i>
            Staff &amp; Operator Access Management
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Full admin control: Add new operators, disable inactive staff, or delete accounts.
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={onOpenAddUser}>
          <i className="fa-solid fa-user-plus"></i> Add New Operator
        </button>
      </div>

      {/* User Stats KPI */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon blue">
            <i className="fa-solid fa-users"></i>
          </div>
          <div>
            <div className="stat-value">{totalUsers}</div>
            <div className="stat-label">Total Accounts</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon emerald">
            <i className="fa-solid fa-user-check"></i>
          </div>
          <div>
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">Active Staff</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon indigo">
            <i className="fa-solid fa-user-shield"></i>
          </div>
          <div>
            <div className="stat-value">{adminCount}</div>
            <div className="stat-label">Administrators</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <i className="fa-solid fa-id-badge"></i>
          </div>
          <div>
            <div className="stat-value">{operatorCount}</div>
            <div className="stat-label">Gate Operators</div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Operator</th>
                <th>Email Contact</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="user-avatar" style={{ width: '32px', height: '32px' }}>
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong>{u.username}</strong>
                      </div>
                    </div>
                  </td>
                  <td>{u.email || '-'}</td>
                  <td>{u.phone || '-'}</td>
                  <td>
                    <span className={`badge-tag ${u.role === 'ADMIN' ? 'blue' : 'gray'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge-tag ${u.active ? 'emerald' : 'rose'}`}>
                      {u.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        className={`btn btn-sm ${u.active ? 'btn-outline-danger' : 'btn-outline'}`}
                        onClick={() => handleToggle(u.id)}
                        title={u.active ? 'Disable account' : 'Enable account'}
                      >
                        {u.active ? 'Disable' : 'Enable'}
                      </button>

                      {u.username !== 'admin' && (
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDelete(u.id, u.username)}
                          title={`Permanently delete ${u.username}`}
                          style={{ padding: '5px 8px' }}
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
