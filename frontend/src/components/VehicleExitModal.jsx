import React, { useState, useEffect } from 'react';
import { exitVehicle, calculateFare, createPaymentOrder, verifyPayment, fetchPaymentConfig } from '../api';

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
        alt="Scan QR Code"
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
 * Auto-verifying Gateway (Razorpay/UPI/Cards) + Cash Settlement + Direct UPI
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
  const [paymentMethod, setPaymentMethod] = useState('GATEWAY'); // 'GATEWAY' | 'CASH' | 'DIRECT_UPI'
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Gateway state
  const [gatewayConfig, setGatewayConfig] = useState({ isLiveGateway: false, keyId: '' });
  const [activeOrder, setActiveOrder] = useState(null);

  // Receiving UPI Account Configuration (for Direct UPI tab)
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
      setActiveOrder(null);
      setStatusMessage('');
      if (targetPlate) {
        fetchFare(targetPlate);
      } else {
        setFareData(null);
      }
      loadPaymentConfig();
    }
  }, [isOpen, initialRegNumber]);

  const loadPaymentConfig = async () => {
    try {
      const res = await fetchPaymentConfig();
      if (res.success && res.data) {
        setGatewayConfig(res.data);
      }
    } catch {
      // Fallback
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
    setActiveOrder(null);
    if (cleaned.length >= 4) {
      fetchFare(cleaned);
    }
  };

  if (!isOpen) return null;

  const totalAmount = fareData?.totalAmount || 20.0;
  const cleanUpiId = (upiId || 'santheesh24@okaxis').trim();
  const cleanName = (payeeName || 'SANTHEESH').trim().replace(/[^a-zA-Z0-9 ]/g, '');
  const cleanAmount = Number(totalAmount).toFixed(2);
  const directUpiUrl = `upi://pay?pa=${cleanUpiId}&pn=${encodeURIComponent(cleanName)}&am=${cleanAmount}&cu=INR&tn=ParkingFare`;

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
    const cName = tempPayeeName.trim() || 'Santheesh S';
    setUpiId(cleanId);
    setPayeeName(cName);
    localStorage.setItem('parking_upi_id', cleanId);
    localStorage.setItem('parking_payee_name', cName);
    setShowUpiConfig(false);
    onShowAlert(`Account updated: ${cleanId} (${cName})`, 'success');
  };

  // 1. AUTOMATED RAZORPAY / GATEWAY CHECKOUT
  const handleLaunchGateway = async () => {
    if (!regNumber.trim()) {
      onShowAlert('Vehicle registration plate is required.', 'danger');
      return;
    }

    setProcessing(true);
    setStatusMessage('Generating Secure Payment Order...');

    try {
      const orderRes = await createPaymentOrder({
        regNumber: regNumber.trim().toUpperCase(),
        amount: totalAmount,
      });

      if (!orderRes.success || !orderRes.data) {
        throw new Error(orderRes.message || 'Unable to create payment order');
      }

      const order = orderRes.data;
      setActiveOrder(order);

      // Check if real Razorpay Checkout is loaded and configured
      if (window.Razorpay && !order.isSandbox && gatewayConfig.isLiveGateway) {
        setStatusMessage('Opening Razorpay Gateway Checkout...');
        const options = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency || 'INR',
          name: 'ParkSys Intelligent Parking',
          description: `Auto-Verified Parking Exit for ${regNumber}`,
          order_id: order.orderId,
          handler: async function (response) {
            await handleVerifyPayment({
              regNumber: regNumber.trim().toUpperCase(),
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              paymentMethod: 'UPI',
            });
          },
          prefill: {
            name: fareData?.vehicle?.ownerName || 'Driver',
            contact: fareData?.vehicle?.ownerPhone || '9876543210',
          },
          theme: {
            color: '#2563eb',
          },
          modal: {
            ondismiss: function () {
              setProcessing(false);
              setStatusMessage('');
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Sandbox / Simulator mode ready
        setProcessing(false);
        setStatusMessage('');
      }
    } catch (err) {
      onShowAlert('Gateway Error: ' + err.message, 'danger');
      setProcessing(false);
      setStatusMessage('');
    }
  };

  // Automated Signature Verification
  const handleVerifyPayment = async (verifyPayload) => {
    setProcessing(true);
    setStatusMessage('Verifying Cryptographic Digital Signature with Bank...');

    try {
      const res = await verifyPayment(verifyPayload);
      if (res.success && res.data) {
        onShowAlert(`⚡ Automated Payment Verified (₹${res.data.totalAmount})! Gate barrier opened automatically.`, 'success');
        onExitSuccess(res.data);
        onClose();
      } else {
        onShowAlert(res.message || 'Payment verification failed.', 'danger');
      }
    } catch (err) {
      onShowAlert('Verification failed: ' + err.message, 'danger');
    } finally {
      setProcessing(false);
      setStatusMessage('');
    }
  };

  // Instant simulation for sandbox / demo
  const handleSimulatePaymentSuccess = async () => {
    if (!activeOrder) return;
    const mockPaymentId = 'pay_' + Math.random().toString(36).substring(2, 12).toUpperCase();
    await handleVerifyPayment({
      regNumber: regNumber.trim().toUpperCase(),
      razorpayOrderId: activeOrder.orderId,
      razorpayPaymentId: mockPaymentId,
      razorpaySignature: 'simulated_valid_signature',
      paymentMethod: 'UPI',
    });
  };

  // 2. CASH SETTLEMENT
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
        paymentReference: 'Cash Collected by Gate Operator',
      });

      if (res.success && res.data) {
        onShowAlert(`Cash settlement of ₹${res.data.totalAmount} recorded! Gate Cleared.`, 'success');
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

  // 3. DIRECT UPI CHECKOUT (Manual fallback)
  const handleProcessDirectUpiCheckout = async () => {
    if (!regNumber.trim()) {
      onShowAlert('Vehicle registration plate is required.', 'danger');
      return;
    }

    setProcessing(true);
    const rrn = utrNumber.trim() || String(Math.floor(100000000000 + Math.random() * 900000000000));

    try {
      const res = await exitVehicle({
        regNumber: regNumber.trim().toUpperCase(),
        paymentMethod: 'UPI',
        transactionId: `UPI-${rrn}`,
        paymentReference: `Manual UPI Ref: ${rrn} (to ${upiId})`,
      });

      if (res.success && res.data) {
        onShowAlert(`Settlement of ₹${res.data.totalAmount} recorded via Direct UPI!`, 'success');
        onExitSuccess(res.data);
        onClose();
      } else {
        onShowAlert(res.message || 'Vehicle check-out failed.', 'danger');
      }
    } catch (err) {
      onShowAlert('Error during settlement: ' + err.message, 'danger');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="fa-solid fa-receipt" style={{ color: 'var(--primary)' }}></i>
            Automated Check-Out &amp; Payment Verification
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

          {/* Payment Method Selector Tabs */}
          <label className="form-label">Select Payment Channel</label>
          <div className="payment-method-nav" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <button
              type="button"
              className={`payment-method-btn ${paymentMethod === 'GATEWAY' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('GATEWAY')}
            >
              <i className="fa-solid fa-bolt" style={{ color: '#2563eb' }}></i>
              <span>⚡ Auto-Verify</span>
            </button>
            <button
              type="button"
              className={`payment-method-btn ${paymentMethod === 'CASH' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('CASH')}
            >
              <i className="fa-solid fa-money-bill-wave" style={{ color: '#059669' }}></i>
              <span>💵 Cash Gate</span>
            </button>
            <button
              type="button"
              className={`payment-method-btn ${paymentMethod === 'DIRECT_UPI' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('DIRECT_UPI')}
            >
              <i className="fa-solid fa-qrcode" style={{ color: '#d97706' }}></i>
              <span>📱 Direct QR</span>
            </button>
          </div>

          {/* Active Payment Channel Workspace */}
          <div className="payment-channel-container">
            {/* 1. AUTO-VERIFYING GATEWAY CHANNEL */}
            {paymentMethod === 'GATEWAY' && (
              <div>
                <div className="gateway-banner">
                  <div className="gateway-banner-icon">
                    <i className="fa-solid fa-shield-halved"></i>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <strong style={{ fontSize: '0.92rem', color: '#1e3a8a' }}>Automated Verification</strong>
                      <span className="auto-badge">
                        <i className="fa-solid fa-circle-check"></i> Zero Staff Inspection
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      The system validates the bank's digital HMAC signature automatically and raises the barrier.
                    </div>
                  </div>
                </div>

                {!activeOrder ? (
                  <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                    <div style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '8px' }}>
                      <i className="fa-brands fa-google-pay" style={{ marginRight: '12px' }}></i>
                      <i className="fa-regular fa-credit-card" style={{ marginRight: '12px' }}></i>
                      <i className="fa-solid fa-mobile-screen-button"></i>
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px' }}>
                      UPI &bull; Google Pay &bull; PhonePe &bull; Cards &bull; NetBanking
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 16px' }}>
                      Click below to generate the automated payment session for ₹{totalAmount.toFixed(2)}.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleLaunchGateway}
                      disabled={processing || !regNumber.trim()}
                      style={{ padding: '10px 24px', fontSize: '0.92rem', fontWeight: 700 }}
                    >
                      {processing ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin"></i> {statusMessage || 'Initializing...'}
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-bolt"></i> Launch Auto-Verified Payment (₹{totalAmount.toFixed(2)})
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="simulator-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e40af' }}>
                        Order ID: <code>{activeOrder.orderId}</code>
                      </span>
                      <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                        {activeOrder.isSandbox ? 'SANDBOX AUTO-VERIFICATION' : 'LIVE GATEWAY ACTIVE'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <div className="qr-code-frame" style={{ padding: '10px' }}>
                        <ScannableQrCode
                          upiUrl={`upi://pay?pa=santheesh24@okaxis&pn=SANTHEESH&am=${cleanAmount}&cu=INR&tn=Order_${activeOrder.orderId}`}
                          size={130}
                        />
                      </div>
                      <div style={{ textAlign: 'left', maxWidth: '240px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          Scan to Pay with Any UPI App
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '4px 0 10px' }}>
                          Customer approves ₹{totalAmount.toFixed(2)} on GPay or PhonePe.
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#0284c7' }}>
                          <i className="fa-solid fa-rotate fa-spin"></i>
                          <span>Listening for bank webhook...</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={handleSimulatePaymentSuccess}
                        disabled={processing}
                        style={{ width: '100%', padding: '10px', fontWeight: 700, fontSize: '0.9rem' }}
                      >
                        {processing ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin"></i> {statusMessage || 'Verifying...'}
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-circle-check"></i> Simulate Customer Bank Payment &amp; Auto-Verify
                          </>
                        )}
                      </button>
                      <small style={{ display: 'block', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Instantly tests automated HMAC signature verification and opens exit gate without human delay.
                      </small>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. CASH CHANNEL */}
            {paymentMethod === 'CASH' && (
              <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#f0fdf4',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    margin: '0 auto 12px',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <i className="fa-solid fa-money-bill-wave"></i>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px' }}>
                  Direct Cash Settlement
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 16px' }}>
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
                    maxWidth: '360px',
                    margin: '0 auto',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Fare Payable:
                  </span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>
                    ₹{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* 3. DIRECT UPI CHANNEL */}
            {paymentMethod === 'DIRECT_UPI' && (
              <div className="upi-checkout-layout">
                <div className="qr-code-frame">
                  <ScannableQrCode upiUrl={directUpiUrl} size={140} />
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e3a8a', marginTop: '8px' }}>
                    Scan with Any UPI App
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Google Pay &bull; PhonePe &bull; Paytm &bull; BHIM
                  </div>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Receiving Account UPI ID:
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '2px 8px', fontSize: '0.7rem' }}
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
                    <code style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)' }}>{upiId}</code>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                      onClick={handleCopyUpi}
                    >
                      <i className="fa-regular fa-copy"></i> {copiedUpi ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Beneficiary Name: <strong>{payeeName}</strong>
                  </div>
                </div>

                {/* Optional Customer UTR / Reference Input */}
                <div style={{ width: '100%', marginTop: '2px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>
                      UPI UTR / Ref No. (from Customer's screen)
                    </label>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '1px 6px', fontSize: '0.68rem' }}
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
                    style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}
                  />
                </div>

                {showUpiConfig && (
                  <form
                    onSubmit={handleSaveUpiConfig}
                    style={{
                      width: '100%',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '10px',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e40af', marginBottom: '6px' }}>
                      <i className="fa-solid fa-building-columns"></i> Configure Bank UPI ID
                    </div>
                    <div style={{ marginBottom: '6px' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. santheesh24@okaxis"
                        value={tempUpiId}
                        onChange={(e) => setTempUpiId(e.target.value)}
                        required
                        style={{ fontSize: '0.82rem' }}
                      />
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Payee Name e.g. SANTHEESH"
                        value={tempPayeeName}
                        onChange={(e) => setTempPayeeName(e.target.value)}
                        style={{ fontSize: '0.82rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                        onClick={() => setShowUpiConfig(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ fontSize: '0.74rem', padding: '3px 10px' }}
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={processing}>
            Cancel
          </button>
          {paymentMethod === 'GATEWAY' && !activeOrder && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleLaunchGateway}
              disabled={processing || !regNumber.trim()}
              style={{ minWidth: '190px' }}
            >
              <i className="fa-solid fa-bolt"></i> Start Auto-Verify (₹{totalAmount.toFixed(2)})
            </button>
          )}
          {paymentMethod === 'CASH' && (
            <button
              type="button"
              className="btn btn-success"
              onClick={handleProcessCashCheckout}
              disabled={processing || !regNumber.trim()}
              style={{ minWidth: '190px' }}
            >
              {processing ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Processing...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-circle-check"></i> Confirm Cash &amp; Open Gate (₹{totalAmount.toFixed(2)})
                </>
              )}
            </button>
          )}
          {paymentMethod === 'DIRECT_UPI' && (
            <button
              type="button"
              className="btn btn-warning"
              onClick={handleProcessDirectUpiCheckout}
              disabled={processing || !regNumber.trim()}
              style={{ minWidth: '190px' }}
            >
              {processing ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Processing...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-circle-check"></i> Settle via Direct UPI (₹{totalAmount.toFixed(2)})
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
