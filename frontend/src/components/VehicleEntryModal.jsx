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

    setLoading(true);
    try {
      const res = await enterVehicle({
        regNumber: regNumber.trim().toUpperCase(),
        vehicleType,
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
      });

      if (res.success && res.data) {
        onShowAlert(`Vehicle ${regNumber.toUpperCase()} parked in Slot ${res.data.parkingSlot.slotNumber}!`, 'success');
        onEntrySuccess(res.data);
        onClose();
        // Reset form
        setRegNumber('');
        setOwnerName('');
        setOwnerPhone('');
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
                <label className="form-label">Owner / Driver Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Santheesh"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 9876543210"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <i className="fa-solid fa-ticket"></i> {loading ? 'Assigning Bay...' : 'Issue Parking Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
