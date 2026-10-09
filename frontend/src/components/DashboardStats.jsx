import React, { useState } from 'react';

/**
 * DashboardStats Component:
 * Clean, uncluttered, and spacious operations dashboard.
 * Eliminates visual crowding through:
 * 1. 4 High-Impact KPI Metrics with generous whitespace
 * 2. Visual Capacity Load Gauge
 * 3. Filterable Active Parked Vehicles log with comfortable table spacing
 */
export default function DashboardStats({
  stats,
  records,
  onOpenEntry,
  onOpenExit,
  onRefresh,
}) {
  const [searchReg, setSearchReg] = useState('');

  const occupancyRate = stats.totalSlots > 0
    ? Math.round((stats.occupiedSlots / stats.totalSlots) * 100)
    : 0;

  // Active parked vehicles (without exitTime)
  const activeVehicles = records.filter((r) => !r.exitTime);

  // Filter active vehicles by license plate
  const filteredActive = activeVehicles.filter((r) =>
    !searchReg || r.vehicle?.regNumber?.toLowerCase().includes(searchReg.toLowerCase().trim())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* 1. Header & Primary Quick Actions */}
      <div className="section-header" style={{ marginBottom: '28px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
            <i className="fa-solid fa-gauge-high" style={{ color: 'var(--primary)' }}></i>
            Operations Dashboard
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Facility telemetry, real-time bay availability, and active check-ins.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn btn-outline btn-sm" onClick={onRefresh} title="Sync latest data">
            <i className="fa-solid fa-rotate"></i> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onOpenEntry()}>
            <i className="fa-solid fa-plus"></i> New Vehicle Entry
          </button>
          <button className="btn btn-outline-danger btn-sm" onClick={() => onOpenExit()}>
            <i className="fa-solid fa-right-from-bracket"></i> Check Out
          </button>
        </div>
      </div>

      {/* 2. Focused, Spacious 4-Card KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        {/* KPI 1: Available Bays */}
        <div className="stat-card" style={{ padding: '22px 24px' }}>
          <div className="stat-icon emerald" style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}>
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: '1.8rem', color: '#059669' }}>
              {stats.availableSlots || 0}
            </div>
            <div className="stat-label">Available Free Bays</div>
          </div>
        </div>

        {/* KPI 2: Occupied Vehicles */}
        <div className="stat-card" style={{ padding: '22px 24px' }}>
          <div className="stat-icon blue" style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}>
            <i className="fa-solid fa-car-side"></i>
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: '1.8rem', color: '#2563eb' }}>
              {stats.occupiedSlots || 0}
            </div>
            <div className="stat-label">Vehicles Currently Parked</div>
          </div>
        </div>

        {/* KPI 3: Today's Revenue */}
        <div className="stat-card" style={{ padding: '22px 24px' }}>
          <div className="stat-icon amber" style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}>
            <i className="fa-solid fa-indian-rupee-sign"></i>
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: '1.8rem', color: '#d97706' }}>
              ₹{(stats.todayRevenue || 0).toFixed(0)}
            </div>
            <div className="stat-label">Today's Total Collection</div>
          </div>
        </div>

        {/* KPI 4: Facility Utilization */}
        <div className="stat-card" style={{ padding: '22px 24px' }}>
          <div className="stat-icon indigo" style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}>
            <i className="fa-solid fa-chart-pie"></i>
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: '1.8rem', color: '#4f46e5' }}>
              {occupancyRate}%
            </div>
            <div className="stat-label">Facility Utilization</div>
          </div>
        </div>
      </div>

      {/* 3. Real-Time Occupancy Gauge Bar */}
      <div
        className="occupancy-card"
        style={{
          padding: '20px 24px',
          marginBottom: '32px',
          borderRadius: '12px',
          background: '#ffffff',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="occupancy-header" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></span>
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Overall Parking Load
            </span>
          </div>
          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--primary)' }}>
            {stats.occupiedSlots || 0} of {stats.totalSlots || 100} bays occupied ({occupancyRate}%)
          </span>
        </div>
        <div className="progress-track" style={{ height: '10px' }}>
          <div className="progress-fill" style={{ width: `${occupancyRate}%` }}></div>
        </div>
      </div>

      {/* 4. Active Parked Vehicles Table (Airy & Filterable) */}
      <div className="table-card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            background: '#ffffff',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
              Active Parked Vehicles ({activeVehicles.length})
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Live vehicles occupying bays in the facility
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search plate (e.g. TN49)..."
              value={searchReg}
              onChange={(e) => setSearchReg(e.target.value)}
              style={{ width: '200px', fontSize: '0.84rem' }}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ padding: '14px 24px' }}>License Plate</th>
                <th style={{ padding: '14px 18px' }}>Assigned Bay</th>
                <th style={{ padding: '14px 18px' }}>Category</th>
                <th style={{ padding: '14px 18px' }}>Driver / Owner</th>
                <th style={{ padding: '14px 18px' }}>Entry Time</th>
                <th style={{ padding: '14px 24px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredActive.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 24px' }}>
                    <i className="fa-solid fa-square-parking" style={{ fontSize: '2rem', marginBottom: '8px', display: 'block', color: '#cbd5e1' }}></i>
                    {searchReg ? 'No parked vehicles match your search.' : 'No vehicles currently parked in the facility.'}
                  </td>
                </tr>
              ) : (
                filteredActive.map((record) => (
                  <tr key={record.id}>
                    <td style={{ padding: '16px 24px' }}>
                      <span className="reg-plate">{record.vehicle.regNumber}</span>
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <span className="badge-tag blue" style={{ fontWeight: 700 }}>
                        {record.parkingSlot ? record.parkingSlot.slotNumber : '--'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <span className="badge-tag gray">
                        {record.vehicle.vehicleType.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ fontWeight: 600 }}>{record.vehicle.ownerName || 'Guest'}</div>
                      {record.vehicle.ownerPhone && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {record.vehicle.ownerPhone}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <span style={{ fontSize: '0.86rem', color: 'var(--text-main)' }}>
                        <i className="fa-regular fa-clock" style={{ marginRight: '6px', color: 'var(--text-muted)' }}></i>
                        {new Date(record.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => onOpenExit(record.vehicle.regNumber)}
                      >
                        <i className="fa-solid fa-right-from-bracket"></i> Check Out
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
