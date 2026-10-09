import React, { useState } from 'react';

/**
 * VehicleRecordsTable Component:
 * Comprehensive log of all vehicle parking sessions (active & completed).
 * Supports search by registration plate or owner, and status filtering.
 */
export default function VehicleRecordsTable({ records, onOpenExit }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter records
  const filteredRecords = records.filter((r) => {
    const isParked = !r.exitTime;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PARKED' && isParked) ||
      (statusFilter === 'EXITED' && !isParked);

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.vehicle.regNumber.toLowerCase().includes(q) ||
      (r.vehicle.ownerName && r.vehicle.ownerName.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  return (
    <div>
      {/* Top Filter Bar */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <i className="fa-solid fa-list-check" style={{ color: 'var(--primary)' }}></i>
            Vehicle Entry &amp; Exit Log
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Showing {filteredRecords.length} records in system.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '140px', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Records</option>
            <option value="PARKED">🚗 Currently Parked</option>
            <option value="EXITED">🏁 Completed / Exited</option>
          </select>

          <input
            type="text"
            className="form-control"
            placeholder="Search Plate or Owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '220px', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Records Table */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Registration No</th>
                <th>Owner Details</th>
                <th>Vehicle Type</th>
                <th>Status</th>
                <th>Bay</th>
                <th>Duration</th>
                <th>Entry Time</th>
                <th>Settlement / Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                    No vehicle records found matching filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isParked = !r.exitTime;
                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="reg-plate">{r.vehicle.regNumber}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.vehicle.ownerName || '-'}</div>
                        <small style={{ color: 'var(--text-muted)' }}>{r.vehicle.ownerPhone || ''}</small>
                      </td>
                      <td>
                        <span className="badge-tag gray">
                          {r.vehicle.vehicleType.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-tag ${isParked ? 'rose' : 'gray'}`}>
                          {isParked ? 'Parked' : 'Exited'}
                        </span>
                      </td>
                      <td>
                        <span className="badge-tag blue">
                          ⬡ {r.parkingSlot ? r.parkingSlot.slotNumber : '--'}
                        </span>
                      </td>
                      <td>
                        <i className="fa-regular fa-clock" style={{ marginRight: '6px', color: 'var(--text-muted)' }}></i>
                        {isParked ? 'Active' : `${r.durationMinutes || 0} mins`}
                      </td>
                      <td>{new Date(r.entryTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td>
                        {isParked ? (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => onOpenExit(r.vehicle.regNumber)}
                          >
                            <i className="fa-solid fa-right-from-bracket"></i> Check Out
                          </button>
                        ) : (
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                              ₹{(r.totalAmount || 0).toFixed(0)}
                            </span>
                            <span className="badge-tag green" style={{ marginLeft: '6px', fontSize: '0.72rem' }}>
                              {r.paymentMethod || 'CASH'}
                            </span>
                            {r.transactionId && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                                {r.transactionId}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
