import React, { useState, useEffect } from 'react';
import { enterVehicle } from '../api';

/**
 * VehicleEntryModal Component:
 * Form for registering vehicle entry into the parking facility.
 * Allocates optimal bay dynamically and generates entry ticket.
 */
export default function VehicleEntryModal({
  isOpen,
  onClose,
  preselectedSlot,
  onEntrySuccess,
  onShowAlert,
}) {
  const [regNumber, setRegNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('FOUR_WHEELER');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (preselectedSlot) {
      if (typeof preselectedSlot === 'object') {
        setVehicleType(preselectedSlot.vehicleType);
      }
    }
  }, [preselectedSlot]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!regNumber.trim()) {
      onShowAlert('Vehicle registration number is required.', 'danger');
      return;
    }
    if (!ownerPhone.trim()) {
      onShowAlert('Driver mobile number is required.', 'danger');
      return;
    }
    if (!ownerEmail.trim()) {
      onShowAlert('Driver email address is required for parking confirmation & exit receipts.', 'danger');
      return;
    }

    setLoading(true);
    try {
      const res = await enterVehicle({
        regNumber: regNumber.trim().toUpperCase(),
        vehicleType,
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        ownerEmail: ownerEmail.trim(),
      });

      if (res.success && res.data) {
        onShowAlert(`Vehicle ${regNumber.toUpperCase()} parked in Slot ${res.data.parkingSlot.slotNumber}! Check-in email dispatched to ${ownerEmail.trim()}.`, 'success');
        onEntrySuccess(res.data);
        onClose();
        // Reset form
        setRegNumber('');
        setOwnerName('');
        setOwnerPhone('');
        setOwnerEmail('');
      } else {
        onShowAlert(res.message || 'Vehicle check-in failed.', 'danger');
      }
    } catch (err) {
      onShowAlert('Error entering vehicle: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="fa-solid fa-car-on" style={{ color: 'var(--primary)' }}></i>
            Vehicle Entry &amp; Bay Check-In
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.82rem',
                color: '#1e40af',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <i className="fa-solid fa-envelope-circle-check" style={{ fontSize: '1.2rem', color: '#2563eb' }}></i>
              <div>
                <strong>Email Notification Enabled:</strong> Check-in confirmation with assigned bay and exit receipt with amount will be sent directly to the driver's email.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Registration Plate Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. TN 49 AS 6179"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Classification *</label>
              <select
                className="form-control"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              >
                <option value="TWO_WHEELER">Two Wheeler (Motorcycle / Scooter)</option>
                <option value="FOUR_WHEELER">Four Wheeler (Car / Sedan / SUV)</option>
                <option value="TRUCK">Heavy Truck</option>
                <option value="BUS">Bus / Coach</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Driver Mobile Number *</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="e.g. 9876543210"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Driver Email Address *</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="e.g. driver@example.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Owner / Driver Name (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Santheesh"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <i className="fa-solid fa-ticket"></i> {loading ? 'Assigning Bay...' : 'Issue Ticket & Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
