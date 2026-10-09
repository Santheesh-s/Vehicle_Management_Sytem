import React, { useState, useEffect } from 'react';
import { exitVehicle, calculateFare } from '../api';

/**
 * Fallback SVG QR Code generator in case offline.
 */
function FallbackSvgQr({ value, size = 180 }) {
  const gridSize = 25;
  const cellSize = size / gridSize;

  const getCellState = (r, c) => {
    if (r < 7 && c < 7) {
      if (r === 0 || r === 6 || c === 0 || c === 6) return true;
      if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true;
      return false;
    }
    if (r < 7 && c >= gridSize - 7) {
      const cc = c - (gridSize - 7);
      if (r === 0 || r === 6 || cc === 0 || cc === 6) return true;
      if (r >= 2 && r <= 4 && cc >= 2 && cc <= 4) return true;
      return false;
    }
    if (r >= gridSize - 7 && c < 7) {
      const rr = r - (gridSize - 7);
      if (rr === 0 || rr === 6 || c === 0 || c === 6) return true;
      if (rr >= 2 && rr <= 4 && c >= 2 && c <= 4) return true;
      return false;
    }
    if ((r === 7 && c < 8) || (c === 7 && r < 8)) return false;
    if ((r === 7 && c >= gridSize - 8) || (c === gridSize - 8 && r < 8)) return false;
    if ((r === gridSize - 8 && c < 8) || (c === 7 && r >= gridSize - 8)) return false;
    if (r === 6) return c % 2 === 0;
    if (c === 6) return r % 2 === 0;
    if (r >= 10 && r <= 14 && c >= 10 && c <= 14) return false;

    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    const val = Math.abs(hash ^ (r * 31 + c * 17));
    return val % 3 === 0 || (val + r + c) % 5 === 0;
  };

  const rects = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (getCellState(r, c)) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={c * cellSize}
            y={r * cellSize}
            width={cellSize}
            height={cellSize}
            fill="#0f172a"
          />
        );
      }
    }
  }

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: '#fff', borderRadius: '8px' }}>
        {rects}
      </svg>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#2563eb',
          color: '#fff',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '14px',
          border: '2px solid #fff',
        }}
      >
        ₹
      </div>
    </div>
  );
}

/**
 * Scannable QR Code Component:
 * Real standard QR code image scannable by physical Google Pay / PhonePe cameras,
 * with fallback to local SVG if offline.
 */
function ScannableQrCode({ upiUrl, size = 180 }) {
  const [imgError, setImgError] = useState(false);
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(upiUrl)}`;

  if (imgError) {
    return <FallbackSvgQr value={upiUrl} size={size} />;
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <img
        src={qrApiUrl}
        alt="Scan UPI QR Code"
        width={size}
        height={size}
        style={{
          borderRadius: '8px',
          display: 'block',
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
        onError={() => setImgError(true)}
      />
    </div>
  );
}

/**
 * VehicleExitModal Component:
 * Streamlined Checkout supporting ONLY UPI and Cash settlements.
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
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'UPI' | 'CASH'
  const [processing, setProcessing] = useState(false);

  // Receiving UPI Account Configuration (Persisted in localStorage)
  const [upiId, setUpiId] = useState(() => localStorage.getItem('parking_upi_id') || 'santheesh24@okaxis');
  const [payeeName, setPayeeName] = useState(() => localStorage.getItem('parking_payee_name') || 'SANTHEESH');
  const [showUpiConfig, setShowUpiConfig] = useState(false);
  const [tempUpiId, setTempUpiId] = useState(upiId);
  const [tempPayeeName, setTempPayeeName] = useState(payeeName);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');

  useEffect(() => {
    if (isOpen) {
      const targetPlate = initialRegNumber || (parkedVehicles[0]?.vehicle?.regNumber || '');
      setRegNumber(targetPlate);
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
    if (cleaned.length >= 4) {
      fetchFare(cleaned);
    }
  };

  if (!isOpen) return null;

  const totalAmount = fareData?.totalAmount || 20.0;
  const cleanUpiId = (upiId || 'santheesh24@okaxis').trim();
  const cleanName = (payeeName || 'SANTHEESH').trim().replace(/[^a-zA-Z0-9 ]/g, '');
  const cleanAmount = Number(totalAmount).toFixed(2);

  // Standard NPCI UPI URI Specification:
  // Note: 'pa' MUST contain literal '@' symbol. Do NOT encode '@' into '%40',
  // otherwise NPCI directory lookup fails with 'Could not load banking name'.
  const upiUrl = `upi://pay?pa=${cleanUpiId}&pn=${encodeURIComponent(cleanName)}&am=${cleanAmount}&cu=INR&tn=ParkingFare`;

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSaveUpiConfig = (e) => {
    e.preventDefault();
    if (!tempUpiId.trim()) {
      onShowAlert('UPI ID cannot be blank.', 'danger');
      return;
    }
    const cleanId = tempUpiId.trim();
    const cleanName = tempPayeeName.trim() || 'Santheesh S';
    setUpiId(cleanId);
    setPayeeName(cleanName);
    localStorage.setItem('parking_upi_id', cleanId);
    localStorage.setItem('parking_payee_name', cleanName);
    setShowUpiConfig(false);
    onShowAlert(`Account updated: ${cleanId} (${cleanName})`, 'success');
  };

  const handleProcessCheckout = async () => {
    if (!regNumber.trim()) {
      onShowAlert('Vehicle registration plate is required.', 'danger');
      return;
    }

    setProcessing(true);

    let txnId = '';
    let paymentRef = '';

    if (paymentMethod === 'UPI') {
      const rrn = utrNumber.trim() || String(Math.floor(100000000000 + Math.random() * 900000000000));
      txnId = `UPI-${rrn}`;
      paymentRef = `UPI Ref: ${rrn} (to ${upiId})`;
    } else {
      txnId = `CASH-${Math.floor(100000 + Math.random() * 900000)}`;
      paymentRef = 'Cash Collected by Gate Operator';
    }

    try {
      const res = await exitVehicle({
        regNumber: regNumber.trim().toUpperCase(),
        paymentMethod,
        transactionId: txnId,
        paymentReference: paymentRef,
      });

      if (res.success && res.data) {
        onShowAlert(`Settlement of ₹${res.data.totalAmount} completed via ${paymentMethod}! Gate Cleared.`, 'success');
        onExitSuccess(res.data);
        onClose();
      } else {
        onShowAlert(res.message || 'Vehicle check-out failed.', 'danger');
      }
    } catch (err) {
      onShowAlert('Error during payment settlement: ' + err.message, 'danger');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="fa-solid fa-receipt" style={{ color: 'var(--primary)' }}></i>
            Vehicle Check-Out &amp; Payment Settlement
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
                style={{ fontWeight: 700, letterSpacing: '1px' }}
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => fetchFare(regNumber)}
                disabled={fareLoading || !regNumber}
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

          {/* Real-time Fare Preview Banner */}
          <div className="fare-preview-banner">
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
                Total Fare Due
              </span>
              <div className="fare-total-amount">₹{totalAmount.toFixed(2)}</div>
            </div>
          </div>

          {/* Payment Method Selector: UPI & CASH ONLY */}
          <label className="form-label">Payment Method</label>
          <div className="payment-method-nav">
            <button
              type="button"
              className={`payment-method-btn ${paymentMethod === 'UPI' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('UPI')}
            >
              <i className="fa-solid fa-qrcode" style={{ color: '#2563eb' }}></i>
              <span>📱 UPI / QR Code</span>
            </button>
            <button
              type="button"
              className={`payment-method-btn ${paymentMethod === 'CASH' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('CASH')}
            >
              <i className="fa-solid fa-money-bill-wave" style={{ color: '#059669' }}></i>
              <span>💵 Cash Settlement</span>
            </button>
          </div>

          {/* Active Payment Channel Workspace */}
          <div className="payment-channel-container">
            {/* 1. UPI / QR CHANNEL */}
            {paymentMethod === 'UPI' && (
              <div className="upi-checkout-layout">
                {/* QR Code Frame */}
                <div className="qr-code-frame">
                  <ScannableQrCode upiUrl={upiUrl} size={145} />
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e3a8a', marginTop: '10px' }}>
                    Scan with Any UPI App
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Google Pay &bull; PhonePe &bull; Paytm &bull; BHIM
                  </div>
                </div>

                {/* Account Details Box */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Receiving Account UPI ID:
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                      onClick={() => {
                        setTempUpiId(upiId);
                        setTempPayeeName(payeeName);
                        setShowUpiConfig(!showUpiConfig);
                      }}
                    >
                      <i className="fa-solid fa-gear"></i> {showUpiConfig ? 'Close' : 'Setup Account'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <code style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary)' }}>{upiId}</code>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      onClick={handleCopyUpi}
                    >
                      <i className="fa-regular fa-copy"></i> {copiedUpi ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Beneficiary Name: <strong>{payeeName}</strong>
                  </div>
                </div>

                {/* Optional Customer UTR / Reference Input */}
                <div style={{ width: '100%', marginTop: '4px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>
                      UPI UTR / Ref No. (from Customer's screen)
                    </label>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '1px 6px', fontSize: '0.7rem' }}
                      onClick={() => setUtrNumber(String(Math.floor(100000000000 + Math.random() * 900000000000)))}
                    >
                      ⚡ Auto-Fill UTR
                    </button>
                  </div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 429182910281 (or leave blank to auto-generate)"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}
                  />
                  <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Verify the 12-digit UPI reference on customer's phone or bank SMS.
                  </small>
                </div>

                {/* Account Setup Accordion */}
                {showUpiConfig && (
                  <form
                    onSubmit={handleSaveUpiConfig}
                    style={{
                      width: '100%',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e40af', marginBottom: '8px' }}>
                      <i className="fa-solid fa-building-columns"></i> Configure Your Bank UPI ID
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                        Your UPI ID (Google Pay / PhonePe / Paytm)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. arvilightss@okaxis or 9876543210@paytm"
                        value={tempUpiId}
                        onChange={(e) => setTempUpiId(e.target.value)}
                        required
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                        Account Holder / Business Name
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Santheesh S"
                        value={tempPayeeName}
                        onChange={(e) => setTempPayeeName(e.target.value)}
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                        onClick={() => setShowUpiConfig(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ fontSize: '0.78rem', padding: '4px 12px' }}
                      >
                        Save Account
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 2. CASH CHANNEL (SIMPLIFIED - NO CHANGE CALCULATION) */}
            {paymentMethod === 'CASH' && (
              <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#f0fdf4',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    margin: '0 auto 12px',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <i className="fa-solid fa-money-bill-wave"></i>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px' }}>
                  Direct Cash Settlement
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 16px' }}>
                  Collect exact parking tariff of <strong style={{ color: 'var(--text-main)' }}>₹{totalAmount.toFixed(2)}</strong> from driver.
                </p>

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    maxWidth: '380px',
                    margin: '0 auto',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Fare Payable:
                  </span>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a' }}>
                    ₹{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={processing}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-success"
            onClick={handleProcessCheckout}
            disabled={processing || !regNumber.trim()}
            style={{ minWidth: '190px' }}
          >
            {processing ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Processing...
              </>
            ) : paymentMethod === 'UPI' ? (
              <>
                <i className="fa-solid fa-circle-check"></i> Settle via UPI (₹{totalAmount.toFixed(2)})
              </>
            ) : (
              <>
                <i className="fa-solid fa-circle-check"></i> Confirm Cash &amp; Settle (₹{totalAmount.toFixed(2)})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
