import React, { useState } from 'react';

/**
 * HeroSection Component:
 * Modern, clean, and spacious overview banner with tabbed interactive tools.
 * Cleanly separates Spot Availability Finder and Tariff Fare Estimator
 * to avoid visual clutter.
 */
export default function HeroSection({ stats, slots, rates, onBookSlot }) {
  // Active tool tab: 'spot' | 'fare'
  const [toolTab, setToolTab] = useState('spot');

  // Quick Spot Finder state
  const [simType, setSimType] = useState('FOUR_WHEELER');
  const [simPlate, setSimPlate] = useState('');
  const [simResult, setSimResult] = useState(null);

  // Fare Calculator state
  const [calcType, setCalcType] = useState('FOUR_WHEELER');
  const [calcHours, setCalcHours] = useState(2);

  // Find optimal spot simulator
  const handleSpotSearch = (e) => {
    e.preventDefault();
    const availableMatch = slots.find(
      (s) => s.vehicleType === simType && s.status === 'AVAILABLE'
    );
    if (availableMatch) {
      setSimResult({
        found: true,
        slotNumber: availableMatch.slotNumber,
        type: availableMatch.vehicleType,
        plate: simPlate.trim() || 'VEHICLE',
      });
    } else {
      setSimResult({
        found: false,
        type: simType,
      });
    }
  };

  // Calculate fare based on backend rates or standard defaults
  const calculateFare = () => {
    let base = 40;
    let hourly = 20;

    const rateObj = rates.find((r) => r.vehicleType === calcType);
    if (rateObj) {
      base = rateObj.baseRate;
      hourly = rateObj.hourlyRate;
    } else {
      if (calcType === 'TWO_WHEELER') { base = 20; hourly = 10; }
      else if (calcType === 'TRUCK' || calcType === 'BUS') { base = 80; hourly = 40; }
    }

    const hours = Math.max(1, parseInt(calcHours) || 1);
    const total = base + Math.max(0, hours - 1) * hourly;
    return total.toFixed(2);
  };

  const occupancyRate = stats.totalSlots > 0
    ? Math.round((stats.occupiedSlots / stats.totalSlots) * 100)
    : 0;

  return (
    <div className="hero">
      <div className="hero-content">
        {/* Left Column: Headlines & KPI counters */}
        <div className="hero-text-col">
          <div className="hero-pill">
            <span className="pulse-dot"></span>
            Automated Smart Facility &bull; Live Sensors
          </div>

          <h1 className="hero-title">
            Smart Vehicle &amp; <br />
            <span>Parking Operations</span>
          </h1>

          <p className="hero-desc">
            Automated bay allocation, multi-tier tariff calculations, and real-time
            capacity telemetry powered by Spring Boot and Supabase.
          </p>

          <div className="hero-stats-row">
            <div className="hero-stat-box">
              <div className="hero-stat-val">{stats.totalSlots || 100}</div>
              <div className="hero-stat-lbl">Total Capacity</div>
            </div>
            <div className="hero-stat-box">
              <div className="hero-stat-val" style={{ color: '#10b981' }}>
                {stats.availableSlots || 0}
              </div>
              <div className="hero-stat-lbl">Free Bays</div>
            </div>
            <div className="hero-stat-box">
              <div className="hero-stat-val" style={{ color: '#f43f5e' }}>
                {stats.occupiedSlots || 0}
              </div>
              <div className="hero-stat-lbl">Occupied</div>
            </div>
            <div className="hero-stat-box">
              <div className="hero-stat-val">{occupancyRate}%</div>
              <div className="hero-stat-lbl">Occupancy</div>
            </div>
          </div>
        </div>

        {/* Right Column: Tabbed Interactive Quick Tools Box */}
        <div className="hero-card">
          {/* Tool Switcher Tabs */}
          <div className="hero-card-tabs">
            <button
              type="button"
              className={`hero-card-tab ${toolTab === 'spot' ? 'active' : ''}`}
              onClick={() => setToolTab('spot')}
            >
              <i className="fa-solid fa-magnifying-glass-location"></i> Spot Finder
            </button>
            <button
              type="button"
              className={`hero-card-tab ${toolTab === 'fare' ? 'active' : ''}`}
              onClick={() => setToolTab('fare')}
            >
              <i className="fa-solid fa-calculator"></i> Fare Estimator
            </button>
          </div>

          <div style={{ padding: '20px 22px' }}>
            {/* TAB 1: SPOT AVAILABILITY FINDER */}
            {toolTab === 'spot' && (
              <div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Check real-time availability and find the nearest empty bay for your vehicle class.
                </p>

                <form onSubmit={handleSpotSearch}>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Vehicle Category</label>
                    <select
                      className="form-control"
                      value={simType}
                      onChange={(e) => setSimType(e.target.value)}
                    >
                      <option value="FOUR_WHEELER">Four Wheeler (Car / SUV)</option>
                      <option value="TWO_WHEELER">Two Wheeler (Bike / Scooter)</option>
                      <option value="TRUCK">Heavy Truck</option>
                      <option value="BUS">Bus / Coach</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">License Plate (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. TN-37-AB-1234"
                      value={simPlate}
                      onChange={(e) => setSimPlate(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    <i className="fa-solid fa-magnifying-glass"></i> Find Available Bay
                  </button>
                </form>

                {/* Spot Search Result Alert */}
                {simResult && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: simResult.found ? '#ecfdf5' : '#fff1f2',
                      border: `1px solid ${simResult.found ? '#a7f3d0' : '#fecdd3'}`,
                      fontSize: '0.86rem',
                    }}
                  >
                    {simResult.found ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: 700 }}>
                          <i className="fa-solid fa-circle-check"></i>
                          Bay {simResult.slotNumber} is Available!
                        </div>
                        <p style={{ margin: '4px 0 10px', fontSize: '0.8rem', color: '#047857' }}>
                          Reserved zone ready for entry.
                        </p>
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          style={{ width: '100%' }}
                          onClick={() => onBookSlot(simResult.slotNumber)}
                        >
                          Book Bay {simResult.slotNumber}
                        </button>
                      </div>
                    ) : (
                      <div style={{ color: '#be123c', fontWeight: 600 }}>
                        <i className="fa-solid fa-circle-exclamation"></i> All {simResult.type.replace('_', ' ')} bays are currently occupied.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: TARIFF FARE ESTIMATOR */}
            {toolTab === 'fare' && (
              <div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Estimate total parking fee based on designated vehicle category and planned duration.
                </p>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Vehicle Category</label>
                  <select
                    className="form-control"
                    value={calcType}
                    onChange={(e) => setCalcType(e.target.value)}
                  >
                    <option value="FOUR_WHEELER">Four Wheeler (Car / SUV)</option>
                    <option value="TWO_WHEELER">Two Wheeler (Bike / Scooter)</option>
                    <option value="TRUCK">Heavy Truck</option>
                    <option value="BUS">Bus / Coach</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Expected Duration (Hours)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="range"
                      min="1"
                      max="24"
                      value={calcHours}
                      onChange={(e) => setCalcHours(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <span style={{ minWidth: '55px', fontWeight: 700, color: 'var(--primary)', textAlign: 'right' }}>
                      {calcHours} hr{calcHours > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Fare Summary Box */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Estimated Tariff
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginTop: '2px' }}>
                      Includes base fee + hourly increment
                    </div>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                    ₹{calculateFare()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
