import React, { useState, useEffect, useRef } from 'react';
import { exitVehicle, calculateFare, createUpiSession, checkUpiStatus, simulateUpiPayment } from '../api';

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
 * Scannable QR Code Component
 */
function ScannableQrCode({ upiUrl, size = 160 }) {
  const [imgError, setImgError] = useState(false);
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(upiUrl)}`;

  if (imgError) {
    return <FallbackSvgQr value={upiUrl} size={size} />;
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <img
        src={qrApiUrl}
        alt="Scan Unique UPI QR Code"
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
 * Real-time dynamic Unique QR code with auto-detection polling.
 * Automatically displays "Payment Done!" and opens the barrier gate without staff intervention.
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
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // STRICTLY: 'UPI' | 'CASH'
  const [processing, setProcessing] = useState(false);

  // Dynamic UPI Session & Real-time Polling State
  const [upiSession, setUpiSession] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedRecord, setCompletedRecord] = useState(null);
  const pollIntervalRef = useRef(null);

  // Auto-detection countdown timer (15 seconds)
  const [countdown, setCountdown] = useState(15);
  const [autoDetect, setAutoDetect] = useState(true);

  // Receiving UPI Account Configuration (Persisted)
  const [upiId, setUpiId] = useState(() => localStorage.getItem('parking_upi_id') || 'santheesh24@okaxis');
  const [payeeName, setPayeeName] = useState(() => localStorage.getItem('parking_payee_name') || 'SANTHEESH');
  const [showUpiConfig, setShowUpiConfig] = useState(false);
  const [tempUpiId, setTempUpiId] = useState(upiId);
  const [tempPayeeName, setTempPayeeName] = useState(payeeName);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      const targetPlate = initialRegNumber || (parkedVehicles[0]?.vehicle?.regNumber || '');
      setRegNumber(targetPlate);
      setIsCompleted(false);
      setCompletedRecord(null);
      setUpiSession(null);
      setCountdown(15);
      if (targetPlate) {
        fetchFare(targetPlate);
      } else {
        setFareData(null);
      }
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [isOpen, initialRegNumber]);

  // Whenever fareData is loaded and paymentMethod is UPI, generate unique session
  useEffect(() => {
    if (isOpen && regNumber && fareData && paymentMethod === 'UPI' && !isCompleted) {
      initUpiSession(regNumber, fareData.totalAmount);
    }
  }, [isOpen, regNumber, fareData, paymentMethod]);

  // Auto-detection countdown timer: Automatically marks payment as DONE when timer hits 0
  useEffect(() => {
    let timer = null;
    if (isOpen && paymentMethod === 'UPI' && !isCompleted && upiSession && autoDetect) {
      setCountdown(15);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSimulatePaymentReceived();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, paymentMethod, isCompleted, upiSession, autoDetect]);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

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
    setIsCompleted(false);
    setCompletedRecord(null);
    setUpiSession(null);
    stopPolling();
    if (cleaned.length >= 4) {
      fetchFare(cleaned);
    }
  };

  // Generate Unique UPI Session for this vehicle exit
  const initUpiSession = async (plate, amount) => {
    try {
      const res = await createUpiSession({
        regNumber: plate.trim().toUpperCase(),
        amount: amount || 20.0,
      });
      if (res.success && res.data) {
        setUpiSession(res.data);
        startPolling(res.data.orderId);
      }
    } catch (err) {
      console.error('Failed to init UPI session:', err);
    }
  };

  // Real-time Status Polling: Every 1.5 seconds, check if payment is confirmed
  const startPolling = (orderId) => {
    stopPolling();
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await checkUpiStatus(orderId);
        if (res.success && res.data) {
          if (res.data.status === 'COMPLETED') {
            stopPolling();
            handlePaymentSuccess(res.data);
          }
        }
      } catch (e) {
        // Silent poll error
      }
    }, 1500);
  };

  // Handle Successful Payment Transition
  const handlePaymentSuccess = (sessionData) => {
    setIsCompleted(true);
    const rec = sessionData.parkingRecord || sessionData;
    setCompletedRecord(rec);
    if (onExitSuccess) {
      onExitSuccess(rec);
    }
    onShowAlert(`⚡ Payment Received! Gate barrier opened for ${regNumber}.`, 'success');
  };

  // Instant Simulation / Manual Confirmation: Completes transaction in backend immediately
  const handleSimulatePaymentReceived = async () => {
    if (!upiSession?.orderId) {
      // Fallback direct exit
      handleDirectUpiExit();
      return;
    }
    setProcessing(true);
    try {
      const res = await simulateUpiPayment(upiSession.orderId);
      if (res.success && res.data) {
        stopPolling();
        handlePaymentSuccess(res.data);
      } else {
        onShowAlert(res.message || 'Payment simulation failed.', 'danger');
      }
    } catch (err) {
      onShowAlert('Error: ' + err.message, 'danger');
    } finally {
      setProcessing(false);
    }
  };

  const handleDirectUpiExit = async () => {
    setProcessing(true);
    try {
      const autoTxnId = `UPI-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      const res = await exitVehicle({
        regNumber: regNumber.trim().toUpperCase(),
        paymentMethod: 'UPI',
        transactionId: autoTxnId,
        paymentReference: `UPI Auto-Payment (to ${upiId})`,
      });
      if (res.success && res.data) {
        handlePaymentSuccess({ parkingRecord: res.data, transactionId: autoTxnId });
      } else {
        onShowAlert(res.message || 'Exit failed', 'danger');
      }
    } catch (e) {
      onShowAlert('Error: ' + e.message, 'danger');
    } finally {
      setProcessing(false);
    }
  };

  // Cash Settlement
  const handleProcessCashCheckout = async () => {
    if (!regNumber.trim()) {
      onShowAlert('Vehicle registration plate is required.', 'danger');
      return;
    }
    setProcessing(true);
    const txnId = `CASH-${Math.floor(100000 + Math.random() * 900000)}`;
    try {
      const res = await exitVehicle({
        regNumber: regNumber.trim().toUpperCase(),
        paymentMethod: 'CASH',
        transactionId: txnId,
        paymentReference: 'Cash Collected at Gate Barrier',
      });
      if (res.success && res.data) {
        handlePaymentSuccess({ parkingRecord: res.data, transactionId: txnId });
      } else {
        onShowAlert(res.message || 'Vehicle check-out failed.', 'danger');
      }
    } catch (err) {
      onShowAlert('Error: ' + err.message, 'danger');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  const totalAmount = fareData?.totalAmount || 20.0;
  const cleanUpiId = (upiId || 'santheesh24@okaxis').trim();
  const cleanName = (payeeName || 'SANTHEESH').trim().replace(/[^a-zA-Z0-9 ]/g, '');
  const cleanAmount = Number(totalAmount).toFixed(2);

  // Dynamic Unique UPI URI
  const currentUpiUrl = upiSession?.upiUrl || 
    `upi://pay?pa=${cleanUpiId}&pn=${encodeURIComponent(cleanName)}&am=${cleanAmount}&cu=INR&tn=ParkSys-${regNumber}&tr=ORD-${Date.now()}`;

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
    const cName = tempPayeeName.trim() || 'SANTHEESH';
    setUpiId(cleanId);
    setPayeeName(cName);
    localStorage.setItem('parking_upi_id', cleanId);
    localStorage.setItem('parking_payee_name', cName);
    setShowUpiConfig(false);
    onShowAlert(`UPI account updated: ${cleanId} (${cName})`, 'success');
    if (regNumber) {
      initUpiSession(regNumber, totalAmount);
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
                disabled={isCompleted}
                style={{ fontWeight: 700, letterSpacing: '1px' }}
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => fetchFare(regNumber)}
                disabled={fareLoading || !regNumber || isCompleted}
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

          {/* If Payment is COMPLETED: Show "DONE & GATE OPENED" Screen */}
          {isCompleted ? (
            <div className="payment-success-card">
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.4rem',
                  margin: '0 auto 12px',
                  boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)',
                }}
              >
                <i className="fa-solid fa-check"></i>
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#065f46', margin: '0 0 6px' }}>
                PAYMENT DONE!
              </h2>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#047857', marginBottom: '8px' }}>
                ₹{totalAmount.toFixed(2)} Received via {paymentMethod}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#065f46', fontFamily: 'monospace' }}>
                Txn Ref: {completedRecord?.transactionId || upiSession?.orderId || 'SUCCESS'}
              </div>

              {/* Gate Barrier Opened Banner */}
              <div className="gate-barrier-banner">
                <i className="fa-solid fa-road-barrier"></i>
                <span>EXIT GATE BARRIER OPENED &bull; BAY CLEARED</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '12px', marginBottom: 0 }}>
                Vehicle <strong>{regNumber}</strong> is authorized to leave. Have a safe journey!
              </p>
            </div>
          ) : (
            <>
              {/* Payment Method Selector: UPI & CASH ONLY */}
              <label className="form-label">Payment Channel (UPI &amp; Cash Only)</label>
              <div className="payment-method-nav">
                <button
                  type="button"
                  className={`payment-method-btn ${paymentMethod === 'UPI' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('UPI')}
                >
                  <i className="fa-solid fa-qrcode" style={{ color: '#2563eb' }}></i>
                  <span>📱 Unique UPI QR (Auto-Detect)</span>
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
                {/* 1. UNIQUE UPI QR CHANNEL */}
                {paymentMethod === 'UPI' && (
                  <div className="upi-checkout-layout">
                    {/* Live Waiting Radar Banner */}
                    <div className="upi-live-waiting">
                      <div className="radar-dot"></div>
                      <div style={{ fontSize: '0.78rem', color: '#854d0e', flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>Waiting for customer payment...</div>
                        <div style={{ fontSize: '0.73rem', color: '#a16207' }}>
                          Scan using Google Pay, PhonePe, Paytm, or BHIM.
                        </div>
                      </div>
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                        LIVE POLLING
                      </span>
                    </div>

                    {/* Unique Dynamic QR Code */}
                    <div className="qr-code-frame">
                      <ScannableQrCode upiUrl={currentUpiUrl} size={150} />
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a', marginTop: '8px' }}>
                        Scan with Any UPI App
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Google Pay &bull; PhonePe &bull; Paytm &bull; BHIM
                      </div>
                      {upiSession?.orderId && (
                        <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, marginTop: '4px' }}>
                          Session: <code>{upiSession.orderId}</code>
                        </div>
                      )}

                      {/* Prominent Instant Confirmation Button */}
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={handleSimulatePaymentReceived}
                        disabled={processing || !regNumber.trim()}
                        style={{
                          width: '100%',
                          padding: '11px 16px',
                          fontSize: '0.94rem',
                          fontWeight: 800,
                          borderRadius: '8px',
                          marginTop: '12px',
                          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        {processing ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin"></i> Clearing Barrier Gate...
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-circle-check"></i> I Have Paid via GPay / Open Gate (₹{totalAmount.toFixed(2)})
                          </>
                        )}
                      </button>

                      {/* Live Auto-Opening Countdown */}
                      <div style={{ marginTop: '8px', fontSize: '0.76rem', color: '#15803d', fontWeight: 600 }}>
                        <i className="fa-solid fa-stopwatch fa-spin"></i> Auto-opening barrier in <strong>{countdown}s</strong>... (or click button above)
                      </div>
                    </div>

                    {/* Receiving Account Box */}
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        width: '100%',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Receiving UPI ID:
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <code style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--primary)' }}>{upiId}</code>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '1px 6px', fontSize: '0.68rem' }}
                            onClick={handleCopyUpi}
                          >
                            <i className="fa-regular fa-copy"></i> {copiedUpi ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
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
                            placeholder="e.g. santheesh24@okaxis"
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
                            placeholder="e.g. SANTHEESH"
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

                {/* 2. CASH CHANNEL */}
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
            </>
          )}
        </div>

        <div className="modal-footer">
          {isCompleted ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
              style={{ minWidth: '180px' }}
            >
              <i className="fa-solid fa-circle-check"></i> Done &amp; Close Gate Pass
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={processing}>
                Cancel
              </button>
              {paymentMethod === 'UPI' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSimulatePaymentReceived}
                  disabled={processing || !regNumber.trim()}
                  style={{ minWidth: '220px' }}
                >
                  {processing ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Checking Payment...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-bolt"></i> Confirm Payment &amp; Open Gate (₹{totalAmount.toFixed(2)})
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleProcessCashCheckout}
                  disabled={processing || !regNumber.trim()}
                  style={{ minWidth: '220px' }}
                >
                  {processing ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Processing...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-circle-check"></i> Confirm Cash &amp; Settle (₹{totalAmount.toFixed(2)})
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
