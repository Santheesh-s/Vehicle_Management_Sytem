import React, { useEffect } from 'react';

/**
 * AlertToast Component:
 * Clean, lightweight notification toast for user feedback.
 */
export default function AlertToast({ alert, onClose }) {
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [alert, onClose]);

  if (!alert) return null;

  return (
    <div className={`alert-toast ${alert.type}`}>
      <i
        className={`fa-solid ${
          alert.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'
        }`}
        style={{ fontSize: '1.1rem' }}
      ></i>
      <span>{alert.message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          marginLeft: '8px',
          fontWeight: 'bold',
        }}
      >
        &times;
      </button>
    </div>
  );
}
