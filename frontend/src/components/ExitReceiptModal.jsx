import React from 'react';

/**
 * ExitReceiptModal Component:
 * Displays printable receipt with duration, payment channel, transaction ID, and final settled tariff.
 */
export default function ExitReceiptModal({ receiptData, onClose }) {
  if (!receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  const getMethodBadge = (method) => {
    switch (method) {
      case 'UPI':
        return { label: 'UPI / QR Payment', icon: 'fa-qrcode', color: '#2563eb', bg: '#eff6ff' };
      case 'CARD':
        return { label: 'Credit / Debit Card', icon: 'fa-credit-card', color: '#059669', bg: '#ecfdf5' };
      case 'FASTAG':
        return { label: 'NETC FASTag RFID', icon: 'fa-bolt', color: '#d97706', bg: '#fffbeb' };
      default:
        return { label: 'Cash Settlement', icon: 'fa-money-bill-wave', color: '#4b5563', bg: '#f1f5f9' };
    }
  };

  const methodInfo = getMethodBadge(receiptData.paymentMethod);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ color: 'var(--success)' }}>
            <i className="fa-solid fa-circle-check"></i>
            Parking Settlement Completed
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="ticket-card" style={{ borderColor: '#86efac' }}>
            <div className="ticket-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '0.5px' }}>
                PARKSYS SETTLEMENT RECEIPT
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Tax Invoice &bull; Gate Pass Cleared
              </p>
            </div>

            <div
              style={{
                textAlign: 'center',
                padding: '14px',
                background: '#f0fdf4',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid #bbf7d0',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                TOTAL AMOUNT PAID
              </span>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#16a34a', lineHeight: 1.1 }}>
                ₹{(receiptData.totalAmount || 0).toFixed(2)}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: methodInfo.bg,
                  color: methodInfo.color,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  marginTop: '6px',
                }}
              >
                <i className={`fa-solid ${methodInfo.icon}`}></i>
                {methodInfo.label}
              </div>
            </div>

            <div className="ticket-row">
              <span className="ticket-label">Vehicle Registration:</span>
              <span className="ticket-val" style={{ letterSpacing: '1px' }}>
                {receiptData.vehicle?.regNumber}
              </span>
            </div>

            <div className="ticket-row">
              <span className="ticket-label">Vehicle Type:</span>
              <span className="ticket-val">{receiptData.vehicle?.vehicleType || 'CAR'}</span>
            </div>

            <div className="ticket-row">
              <span className="ticket-label">Bay Cleared:</span>
              <span className="ticket-val">
                {receiptData.parkingSlot ? receiptData.parkingSlot.slotNumber : '--'}
              </span>
            </div>

            <div className="ticket-row">
              <span className="ticket-label">Duration:</span>
              <span className="ticket-val">{receiptData.durationMinutes || 1} min(s)</span>
            </div>

            <div className="ticket-row">
              <span className="ticket-label">Transaction ID:</span>
              <span className="ticket-val" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {receiptData.transactionId || `TXN-${receiptData.id}`}
              </span>
            </div>

            {receiptData.paymentReference && (
              <div className="ticket-row">
                <span className="ticket-label">Payment Ref:</span>
                <span className="ticket-val" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {receiptData.paymentReference}
                </span>
              </div>
            )}

            <div className="ticket-row">
              <span className="ticket-label">Settled At:</span>
              <span className="ticket-val">
                {receiptData.exitTime
                  ? new Date(receiptData.exitTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                  : new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>

            <div className="barcode-sim">
              * PAID &amp; GATE CLEARED *
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={handlePrint}>
            <i className="fa-solid fa-print"></i> Print Invoice
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
