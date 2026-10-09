import React, { useState } from 'react';
import { addParkingSlot } from '../api';

/**
 * AddSlotModal Component:
 * Allows system administrators to expand the parking capacity by adding new bays.
 * Connected directly to backend POST /api/parking/slots.
 */
export default function AddSlotModal({ isOpen, onClose, onSlotAdded, onShowAlert }) {
  const [slotNumber, setSlotNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('FOUR_WHEELER');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!slotNumber.trim()) {
      onShowAlert('Slot number is required (e.g. A61, B31).', 'danger');
      return;
    }

    setLoading(true);
    try {
      const res = await addParkingSlot({
        slotNumber: slotNumber.trim().toUpperCase(),
        vehicleType: vehicleType,
      });

      if (res.success && res.data) {
        onShowAlert(`Slot ${res.data.slotNumber} added successfully!`, 'success');
        setSlotNumber('');
        onSlotAdded(res.data);
        onClose();
      } else {
        onShowAlert(res.message || 'Failed to add slot', 'danger');
      }
    } catch (err) {
      onShowAlert('Error adding slot: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="fa-solid fa-square-plus" style={{ color: 'var(--primary)' }}></i>
            Add New Parking Bay
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Slot Code / Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. A61, B31, C61"
                value={slotNumber}
                onChange={(e) => setSlotNumber(e.target.value.toUpperCase())}
                required
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Unique identifier for the parking bay.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Designated Vehicle Type</label>
              <select
                className="form-control"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              >
                <option value="TWO_WHEELER">Two Wheeler (Motorcycle / Scooter)</option>
                <option value="FOUR_WHEELER">Four Wheeler (Car / SUV)</option>
                <option value="TRUCK">Heavy Truck</option>
                <option value="BUS">Bus / Coach</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Add Slot'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
