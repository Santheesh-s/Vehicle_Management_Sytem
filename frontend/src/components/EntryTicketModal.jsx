import React from 'react';

/**
 * EntryTicketModal Component:
 * Displays an aesthetic printable parking slip upon vehicle check-in.
 */
export default function EntryTicketModal({ ticketData, onClose }) {
  if (!ticketData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ color: 'var(--success)' }}>
            <i className="fa-solid fa-circle-check"></i>
            Parking Ticket Issued
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="ticket-card">
            <div className="ticket-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>PARKSYS PARKING PASS</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Automated Bay Allocation</p>
            </div>

            <div
              style={{
                textAlign: 'center',
                padding: '12px',
                background: '#eff6ff',
                borderRadius: '8px',
                marginBottom: '16px',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 700 }}>
                ASSIGNED BAY
              </span>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                {ticketData.parkingSlot ? ticketData.parkingSlot.slotNumber : '--'}
              </div>
            </div>

            <div className="ticket-row">
              <span className="ticket-label">Vehicle Plate:</span>
              <span className="ticket-val">{ticketData.vehicle.regNumber}</span>
            </div>

            <div className="ticket-row">
              <span className="ticket-label">Classification:</span>
              <span className="ticket-val">{ticketData.vehicle.vehicleType.replace('_', ' ')}</span>
            </div>

            <div className="ticket-row">
              <span className="ticket-label">Driver / Owner:</span>
              <span className="ticket-val">{ticketData.vehicle.ownerName || 'Guest'}</span>
            </div>

            <div className="ticket-row">
              <span className="ticket-label">Check-in Time:</span>
              <span className="ticket-val">
                {new Date(ticketData.entryTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>

            <div className="barcode-sim">
              ||||| | |||| ||| ||||||| |
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {ticketData.vehicle.regNumber}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={handlePrint}>
            <i className="fa-solid fa-print"></i> Print Slip
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
