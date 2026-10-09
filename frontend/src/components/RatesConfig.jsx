import React, { useState } from 'react';
import { updateRate } from '../api';

/**
 * RatesConfig Component (Admin only):
 * Manages parking tariff schedules: Base fee and hourly rate for each vehicle type.
 */
export default function RatesConfig({ rates, onRatesUpdated, onShowAlert }) {
  const [selectedType, setSelectedType] = useState('FOUR_WHEELER');
  const [baseRate, setBaseRate] = useState(40);
  const [hourlyRate, setHourlyRate] = useState(20);
  const [loading, setLoading] = useState(false);

  // When type selection changes, populate current rates
  const handleTypeChange = (type) => {
    setSelectedType(type);
    const existing = rates.find((r) => r.vehicleType === type);
    if (existing) {
      setBaseRate(existing.baseRate);
      setHourlyRate(existing.hourlyRate);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateRate({
        vehicleType: selectedType,
        baseRate: parseFloat(baseRate),
        hourlyRate: parseFloat(hourlyRate),
      });

      if (res.success) {
        onShowAlert(`Tariff rates for ${selectedType.replace('_', ' ')} updated successfully!`, 'success');
        onRatesUpdated();
      } else {
        onShowAlert(res.message || 'Failed to update rates', 'danger');
      }
    } catch (err) {
      onShowAlert('Error updating rates: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <i className="fa-solid fa-sliders" style={{ color: 'var(--primary)' }}></i>
            Parking Tariff &amp; Rate Configuration
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Set base fee (first hour) and hourly rates for each vehicle category.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        {/* Current Rates Table */}
        <div className="table-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
            Active Tariff Schedule
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle Category</th>
                  <th>Base Fee (1st Hr)</th>
                  <th>Hourly Rate</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate) => (
                  <tr key={rate.id || rate.vehicleType}>
                    <td>
                      <strong>{rate.vehicleType.replace('_', ' ')}</strong>
                    </td>
                    <td>₹{rate.baseRate.toFixed(2)}</td>
                    <td>₹{rate.hourlyRate.toFixed(2)} / hr</td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setSelectedType(rate.vehicleType);
                          setBaseRate(rate.baseRate);
                          setHourlyRate(rate.hourlyRate);
                        }}
                      >
                        Edit Rate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Update Rate Form */}
        <div className="table-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px' }}>
            Modify Category Tariff
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Vehicle Category</label>
              <select
                className="form-control"
                value={selectedType}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="TWO_WHEELER">Two Wheeler</option>
                <option value="FOUR_WHEELER">Four Wheeler</option>
                <option value="TRUCK">Heavy Truck</option>
                <option value="BUS">Bus / Coach</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Base Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  className="form-control"
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hourly Fee (₹/hr)</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  className="form-control"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading}
            >
              <i className="fa-solid fa-floppy-disk"></i> {loading ? 'Saving...' : 'Update Tariff Rates'}
            </button>
          </form>
        </div>
      </div>

      {/* Account UPI Gateway Settings */}
      <div className="table-card" style={{ padding: '24px', marginTop: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>
          <i className="fa-solid fa-qrcode" style={{ color: 'var(--primary)', marginRight: '8px' }}></i>
          Receiving UPI Account Configuration
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '16px' }}>
          Configure your personal or business UPI ID so scanned QR payments deposit directly into your linked bank account.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const cleanId = (e.target.elements.upiId.value || '').trim();
            const cleanName = (e.target.elements.payeeName.value || '').trim();
            if (cleanId) {
              localStorage.setItem('parking_upi_id', cleanId);
              localStorage.setItem('parking_payee_name', cleanName || 'Santheesh S');
              onShowAlert(`Receiving UPI account updated: ${cleanId}`, 'success');
            }
          }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '14px', alignItems: 'flex-end' }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Receiving UPI ID (GPay / PhonePe / Paytm)</label>
            <input
              type="text"
              name="upiId"
              className="form-control"
              defaultValue={localStorage.getItem('parking_upi_id') || 'santheesh24@okaxis'}
              placeholder="e.g. santheesh24@okaxis"
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Beneficiary / Payee Name</label>
            <input
              type="text"
              name="payeeName"
              className="form-control"
              defaultValue={localStorage.getItem('parking_payee_name') || 'SANTHEESH'}
              placeholder="e.g. SANTHEESH"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '38px' }}>
            <i className="fa-solid fa-floppy-disk"></i> Save UPI Account
          </button>
        </form>
      </div>
    </div>
  );
}
