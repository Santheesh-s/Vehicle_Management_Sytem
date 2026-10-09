import React, { useState } from 'react';

/**
 * ParkingGrid Component:
 * Clean, spacious, and modular visualization of all parking bays.
 * Solves visual crowding by providing:
 * 1. Zone cards with mini progress bars (Cars, Bikes, Heavy, All)
 * 2. Spacious slot cards with clear status pills and icons
 * 3. Quick status and slot search filters
 */
export default function ParkingGrid({ slots, records, onSlotClick, isAdmin, onOpenAddSlot }) {
  // Zone selection: 'FOUR_WHEELER' | 'TWO_WHEELER' | 'HEAVY' | 'ALL'
  const [activeZone, setActiveZone] = useState('FOUR_WHEELER');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Partition slots by vehicle category
  const twoWheelers = slots.filter((s) => s.vehicleType === 'TWO_WHEELER');
  const fourWheelers = slots.filter((s) => s.vehicleType === 'FOUR_WHEELER');
  const heavyVehicles = slots.filter(
    (s) => s.vehicleType === 'TRUCK' || s.vehicleType === 'BUS'
  );

  // Helper counts
  const countFree = (list) => list.filter((s) => s.status === 'AVAILABLE').length;

  const fourFree = countFree(fourWheelers);
  const twoFree = countFree(twoWheelers);
  const heavyFree = countFree(heavyVehicles);

  // Active list based on zone
  let displayedSlots = slots;
  if (activeZone === 'FOUR_WHEELER') displayedSlots = fourWheelers;
  else if (activeZone === 'TWO_WHEELER') displayedSlots = twoWheelers;
  else if (activeZone === 'HEAVY') displayedSlots = heavyVehicles;

  // Apply status and search filters
  const filteredSlots = displayedSlots.filter((slot) => {
    const matchesStatus = statusFilter === 'ALL' || slot.status === statusFilter;
    const matchesSearch =
      !searchQuery || slot.slotNumber.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesStatus && matchesSearch;
  });

  const getIcon = (vehicleType) => {
    switch (vehicleType) {
      case 'TWO_WHEELER':
        return 'fa-motorcycle';
      case 'FOUR_WHEELER':
        return 'fa-car-side';
      case 'TRUCK':
        return 'fa-truck';
      case 'BUS':
        return 'fa-bus';
      default:
        return 'fa-car';
    }
  };

  return (
    <div className="parking-section">
      {/* Zone Overview Cards: Click to Filter Zone */}
      <div className="zone-cards-grid">
        {/* Four Wheelers Zone Card */}
        <div
          className={`zone-card ${activeZone === 'FOUR_WHEELER' ? 'active' : ''}`}
          onClick={() => setActiveZone('FOUR_WHEELER')}
        >
          <div className="zone-card-top">
            <div className="zone-icon blue">
              <i className="fa-solid fa-car-side"></i>
            </div>
            <span className="zone-badge">A41 – A60</span>
          </div>
          <div className="zone-name">Four-Wheeler Zone</div>
          <div className="zone-numbers">
            <span className="free-text">{fourFree} Free</span>
            <span className="total-text">/ {fourWheelers.length} Bays</span>
          </div>
          <div className="zone-progress-bar">
            <div
              className="zone-progress-fill"
              style={{
                width: fourWheelers.length > 0 ? `${((fourWheelers.length - fourFree) / fourWheelers.length) * 100}%` : '0%',
              }}
            ></div>
          </div>
        </div>

        {/* Two Wheelers Zone Card */}
        <div
          className={`zone-card ${activeZone === 'TWO_WHEELER' ? 'active' : ''}`}
          onClick={() => setActiveZone('TWO_WHEELER')}
        >
          <div className="zone-card-top">
            <div className="zone-icon emerald">
              <i className="fa-solid fa-motorcycle"></i>
            </div>
            <span className="zone-badge">A01 – A40</span>
          </div>
          <div className="zone-name">Two-Wheeler Zone</div>
          <div className="zone-numbers">
            <span className="free-text">{twoFree} Free</span>
            <span className="total-text">/ {twoWheelers.length} Bays</span>
          </div>
          <div className="zone-progress-bar">
            <div
              className="zone-progress-fill emerald"
              style={{
                width: twoWheelers.length > 0 ? `${((twoWheelers.length - twoFree) / twoWheelers.length) * 100}%` : '0%',
              }}
            ></div>
          </div>
        </div>

        {/* Heavy Vehicles Zone Card */}
        <div
          className={`zone-card ${activeZone === 'HEAVY' ? 'active' : ''}`}
          onClick={() => setActiveZone('HEAVY')}
        >
          <div className="zone-card-top">
            <div className="zone-icon amber">
              <i className="fa-solid fa-truck"></i>
            </div>
            <span className="zone-badge">B01–B30, C51–C60</span>
          </div>
          <div className="zone-name">Bus &amp; Heavy Zone</div>
          <div className="zone-numbers">
            <span className="free-text">{heavyFree} Free</span>
            <span className="total-text">/ {heavyVehicles.length} Bays</span>
          </div>
          <div className="zone-progress-bar">
            <div
              className="zone-progress-fill amber"
              style={{
                width: heavyVehicles.length > 0 ? `${((heavyVehicles.length - heavyFree) / heavyVehicles.length) * 100}%` : '0%',
              }}
            ></div>
          </div>
        </div>

        {/* All Bays Combined Card */}
        <div
          className={`zone-card ${activeZone === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveZone('ALL')}
        >
          <div className="zone-card-top">
            <div className="zone-icon indigo">
              <i className="fa-solid fa-border-all"></i>
            </div>
            <span className="zone-badge">Facility Overview</span>
          </div>
          <div className="zone-name">All 100 Bays</div>
          <div className="zone-numbers">
            <span className="free-text">{fourFree + twoFree + heavyFree} Free</span>
            <span className="total-text">/ {slots.length} Total</span>
          </div>
          <div className="zone-progress-bar">
            <div
              className="zone-progress-fill indigo"
              style={{
                width: slots.length > 0 ? `${((slots.length - (fourFree + twoFree + heavyFree)) / slots.length) * 100}%` : '0%',
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '4px' }}>
            Filter:
          </span>
          <button
            type="button"
            className={`filter-chip ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All ({displayedSlots.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${statusFilter === 'AVAILABLE' ? 'active' : ''}`}
            onClick={() => setStatusFilter('AVAILABLE')}
          >
            🟢 Available ({displayedSlots.filter((s) => s.status === 'AVAILABLE').length})
          </button>
          <button
            type="button"
            className={`filter-chip ${statusFilter === 'OCCUPIED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('OCCUPIED')}
          >
            🔴 Occupied ({displayedSlots.filter((s) => s.status === 'OCCUPIED').length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search bay (e.g. A05)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '180px', fontSize: '0.84rem' }}
          />

          {isAdmin && onOpenAddSlot && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onOpenAddSlot}
              style={{ whiteSpace: 'nowrap' }}
            >
              <i className="fa-solid fa-square-plus"></i> Add Bay
            </button>
          )}
        </div>
      </div>

      {/* Active Grid Display */}
      <div className="table-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              {activeZone === 'FOUR_WHEELER' && '🚗 Four-Wheeler Parking Bays (A41 – A60)'}
              {activeZone === 'TWO_WHEELER' && '🏍️ Two-Wheeler Parking Bays (A01 – A40)'}
              {activeZone === 'HEAVY' && '🚛 Heavy & Bus Parking Bays (B01–B30, C51–C60)'}
              {activeZone === 'ALL' && '🌐 Complete Facility Parking Bays (All Zones)'}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {filteredSlots.length} bays matching your filter. Click any bay to check-in or checkout.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
              Available
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f43f5e' }}></span>
              Occupied
            </span>
          </div>
        </div>

        {filteredSlots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-circle-question" style={{ fontSize: '2rem', marginBottom: '8px', display: 'block' }}></i>
            No parking bays match the selected filters.
          </div>
        ) : (
          <div className="slots-grid-spacious">
            {filteredSlots.map((slot) => {
              const isAvail = slot.status === 'AVAILABLE';
              return (
                <div
                  key={slot.id || slot.slotNumber}
                  className={`slot-card-spacious ${isAvail ? 'available' : 'occupied'}`}
                  onClick={() => onSlotClick(slot)}
                  title={`Slot ${slot.slotNumber} - ${slot.status} (Click to ${isAvail ? 'Park' : 'Check Out'})`}
                >
                  <div className="slot-card-header">
                    <span className="slot-card-id">{slot.slotNumber}</span>
                    <i className={`fa-solid ${getIcon(slot.vehicleType)} slot-card-icon`}></i>
                  </div>
                  <div className="slot-card-status">
                    <span className={`status-pill ${isAvail ? 'pill-green' : 'pill-red'}`}>
                      {isAvail ? 'Available' : 'Occupied'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
