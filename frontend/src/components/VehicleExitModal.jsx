import React, { useState, useEffect } from 'react';
import { exitVehicle, calculateFare } from '../api';

/**
 * VehicleExitModal Component:
 * Clean, streamlined Vehicle Check-Out & Exit Gate Clearance.
 * Completely free of external payment gateways, QR codes, and payment complexities.
 */
export default function VehicleExitModal({
  isOpen,
  onClose,
  initialRegNumber = '',
  parkedVehicles = [],
  onExitSuccess,
  onShowAlert,
}) {
  const [regNumber, setRegNumber] = useState('');
  const [fareData, setFareData] = useState(null);
  const [fareLoading, setFareLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [exitPass, setExitPass] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const targetPlate = initialRegNumber || (parkedVehicles[0]?.vehicle?.regNumber || '');
      setRegNumber(targetPlate);
      setExitPass(null);
      if (targetPlate) {
        fetchFare(targetPlate);
      } else {
        setFareData(null);
      }
    }
  }, [isOpen, initialRegNumber]);

  const fetchFare = async (plate) => {
    if (!plate || !plate.trim()) return;
    setFareLoading(true);
    try {
      const res = await calculateFare(plate.trim().toUpperCase());
      if (res.success && res.data) {
        setFareData(res.data);
      } else {
        setFareData({
          regNumber: plate.trim().toUpperCase(),
          vehicleType: 'CAR',
          slotNumber: 'A-01',
          durationMinutes: 30,
          billableHours: 1,
          totalAmount: 20.0,
        });
      }
    } catch {
      setFareData({
        regNumber: plate.trim().toUpperCase(),
        vehicleType: 'CAR',
        slotNumber: 'A-01',
        durationMinutes: 30,
        billableHours: 1,
        totalAmount: 20.0,
      });
    } finally {
      setFareLoading(false);
    }
  };

  const handleRegChange = (val) => {
    const cleaned = val.toUpperCase();
    setRegNumber(cleaned);
    setExitPass(null);
    if (cleaned.length >= 4) {
      fetchFare(cleaned);
    }
  };

  const handleCheckOutVehicle = async () => {
    if (!regNumber.trim()) {
      onShowAlert('Vehicle registration plate is required.', 'danger');
      return;
    }

    setProcessing(true);
    try {
      const res = await exitVehicle({
        regNumber: regNumber.trim().toUpperCase(),
        paymentMethod: 'CASH',
        transactionId: `EXIT-${Date.now().toString().slice(-6)}`,
        paymentReference: 'Exit Gate Clearance',
      });

      if (res.success && res.data) {
        setExitPass(res.data);
        if (onExitSuccess) {
          onExitSuccess(res.data);
        }
        onShowAlert(`Vehicle ${regNumber} cleared! Gate barrier opened.`, 'success');
      } else {
        onShowAlert(res.message || 'Vehicle check-out failed.', 'danger');
      }
    } catch (err) {
      onShowAlert('Error during vehicle check-out: ' + err.message, 'danger');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  const totalAmount = fareData?.totalAmount || 20.0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="fa-solid fa-road-barrier" style={{ color: 'var(--primary)' }}></i>
            Vehicle Exit &amp; Gate Clearance
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* Registration Input */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Vehicle Plate Number *</span>
              {parkedVehicles.length > 0 && (
                <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>
                  {parkedVehicles.length} vehicle(s) parked
                </span>
              )}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. TN 49 AS 6179"
                value={regNumber}
                onChange={(e) => handleRegChange(e.target.value)}
                list="parked-plates-list"
                required
                disabled={!!exitPass}
                style={{ fontWeight: 700, letterSpacing: '1px' }}
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => fetchFare(regNumber)}
                disabled={fareLoading || !regNumber || !!exitPass}
                title="Refresh Tariff"
              >
                <i className={`fa-solid fa-rotate ${fareLoading ? 'fa-spin' : ''}`}></i>
              </button>
            </div>
            <datalist id="parked-plates-list">
              {parkedVehicles.map((p) => (
                <option key={p.id} value={p.vehicle?.regNumber}>
                  {p.vehicle?.vehicleType} - Bay {p.parkingSlot?.slotNumber}
                </option>
              ))}
            </datalist>
          </div>

          {/* Real-time Fare & Duration Breakdown */}
          <div className="fare-preview-banner" style={{ marginBottom: '16px' }}>
            <div className="fare-details">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                  {fareData?.vehicleType || 'VEHICLE'}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                  Bay {fareData?.slotNumber || '--'}
                </span>
              </div>
              <div className="fare-breakdown-row">
                <span>
                  <i className="fa-regular fa-clock"></i> Duration: {fareData?.durationMinutes || 1} min
                </span>
                <span>
                  <i className="fa-solid fa-calculator"></i> {fareData?.billableHours || 1} Billable Hr(s)
                </span>
              </div>
            </div>
            <div className="fare-total-badge">
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                Tariff Due
              </span>
              <div className="fare-total-amount">₹{totalAmount.toFixed(2)}</div>
            </div>
          </div>

          {/* SUCCESS SCREEN WHEN VEHICLE EXITED */}
          {exitPass ? (
            <div className="payment-success-card">
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.2rem',
                  margin: '0 auto 12px',
                  boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)',
                }}
              >
                <i className="fa-solid fa-check"></i>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#065f46', margin: '0 0 6px' }}>
                GATE CLEARED &bull; VEHICLE CHECKED OUT
              </h2>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#047857', marginBottom: '6px' }}>
                Fare: ₹{Number(exitPass.totalAmount || totalAmount).toFixed(2)}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#065f46', fontFamily: 'monospace' }}>
                Pass ID: {exitPass.transactionId || 'EXIT-DONE'}
              </div>

              <div className="gate-barrier-banner" style={{ marginTop: '14px' }}>
                <i className="fa-solid fa-road-barrier"></i>
                <span>EXIT BARRIER OPENED &bull; BAY RELEASED</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '12px', marginBottom: 0 }}>
                Vehicle <strong>{regNumber}</strong> is authorized to leave. Have a safe journey!
              </p>
            </div>
          ) : (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2rem', color: '#059669', marginBottom: '8px' }}>
                <i className="fa-solid fa-car-side"></i>
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px' }}>
                Ready for Gate Clearance
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                Click below to finalize checkout, release parking bay, and open the exit barrier.
              </p>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleCheckOutVehicle}
                disabled={processing || !regNumber.trim()}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  fontSize: '1rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
                }}
              >
                {processing ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Clearing Vehicle...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-road-barrier"></i> Check-Out Vehicle &amp; Open Gate (₹{totalAmount.toFixed(2)})
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {exitPass ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
              style={{ minWidth: '160px' }}
            >
              <i className="fa-solid fa-circle-check"></i> Done &amp; Close
            </button>
          ) : (
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={processing}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
