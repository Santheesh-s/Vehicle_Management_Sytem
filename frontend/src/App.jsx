import React, { useState, useEffect } from 'react';
import './App.css';
import { fetchStats, fetchSlots, fetchRecords, fetchRates } from './api';

// Components
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import ParkingGrid from './components/ParkingGrid';
import DashboardStats from './components/DashboardStats';
import VehicleRecordsTable from './components/VehicleRecordsTable';
import DailyReports from './components/DailyReports';
import RatesConfig from './components/RatesConfig';
import UserManagement from './components/UserManagement';

// Modals & Feedback
import LoginModal from './components/LoginModal';
import VehicleEntryModal from './components/VehicleEntryModal';
import EntryTicketModal from './components/EntryTicketModal';
import VehicleExitModal from './components/VehicleExitModal';
import ExitReceiptModal from './components/ExitReceiptModal';
import AddUserModal from './components/AddUserModal';
import AddSlotModal from './components/AddSlotModal';
import AlertToast from './components/AlertToast';

/**
 * Main Application Component (App.jsx)
 * Demonstrates clean, placement-ready React principles:
 * - useState for component state management
 * - useEffect for API lifecycle & real-time polling
 * - Separation of concerns with focused, reusable components
 * - Direct REST API integration with Spring Boot backend
 */
export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Navigation View State
  const [viewMode, setViewMode] = useState('public'); // 'public' | 'portal'
  const [portalTab, setPortalTab] = useState('dashboard'); // 'dashboard' | 'slots' | 'records' | 'reports' | 'rates' | 'users'

  // Application Data State
  const [stats, setStats] = useState({
    totalSlots: 100,
    availableSlots: 98,
    occupiedSlots: 2,
    todayRevenue: 30,
    todayVehicleCount: 3,
  });
  const [slots, setSlots] = useState([]);
  const [records, setRecords] = useState([]);
  const [rates, setRates] = useState([]);

  // Modal Dialogs State
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryPreselectedSlot, setEntryPreselectedSlot] = useState(null);
  const [entryTicketData, setEntryTicketData] = useState(null);

  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exitInitialReg, setExitInitialReg] = useState('');
  const [exitReceiptData, setExitReceiptData] = useState(null);

  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [addSlotModalOpen, setAddSlotModalOpen] = useState(false);

  // Toast Notification State
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
  };

  // Load all initial data from Spring Boot REST API
  const loadAllData = async () => {
    try {
      const [statsRes, slotsRes, recordsRes, ratesRes] = await Promise.allSettled([
        fetchStats(),
        fetchSlots(),
        fetchRecords(),
        fetchRates(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
        setStats(statsRes.value.data);
      }
      if (slotsRes.status === 'fulfilled' && slotsRes.value?.success) {
        setSlots(slotsRes.value.data || []);
      }
      if (recordsRes.status === 'fulfilled' && recordsRes.value?.success) {
        setRecords(recordsRes.value.data || []);
      }
      if (ratesRes.status === 'fulfilled') {
        const ratesData = Array.isArray(ratesRes.value) ? ratesRes.value : ratesRes.value?.data;
        if (ratesData) setRates(ratesData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  // Lifecycle Hook: Load data on initial mount and poll every 6 seconds
  useEffect(() => {
    loadAllData();

    const interval = setInterval(() => {
      fetchStats()
        .then((res) => {
          if (res?.success && res.data) setStats(res.data);
        })
        .catch(() => {});

      fetchSlots()
        .then((res) => {
          if (res?.success && res.data) setSlots(res.data || []);
        })
        .catch(() => {});
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  // Handlers for Slot Clicks in the Visual Bay Grid
  const handleSlotClick = (slot) => {
    if (slot.status === 'OCCUPIED') {
      // Find active record for this slot to prefill registration plate
      const activeRecord = records.find(
        (r) => r.parkingSlot?.slotNumber === slot.slotNumber && !r.exitTime
      );
      const reg = activeRecord ? activeRecord.vehicle.regNumber : '';
      setExitInitialReg(reg);
      setExitModalOpen(true);
    } else {
      // Slot is available -> open Entry modal
      if (!currentUser) {
        showAlert(`Slot ${slot.slotNumber} is available! Sign in as operator to check-in vehicle.`, 'danger');
        setLoginModalOpen(true);
        return;
      }
      setEntryPreselectedSlot(slot);
      setEntryModalOpen(true);
    }
  };

  // Auth Handlers
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    setViewMode('portal');
    loadAllData();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    setViewMode('public');
    showAlert('Signed out successfully.', 'success');
  };

  const handleBookFromHero = (slotNum) => {
    const foundSlot = slots.find((s) => s.slotNumber === slotNum);
    handleSlotClick(foundSlot || { slotNumber: slotNum, status: 'AVAILABLE', vehicleType: 'FOUR_WHEELER' });
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="app-container">
      {/* Universal Top Navigation */}
      <Navbar
        currentUser={currentUser}
        viewMode={viewMode}
        setViewMode={setViewMode}
        portalTab={portalTab}
        setPortalTab={setPortalTab}
        availableCount={stats.availableSlots || 0}
        onOpenLogin={() => setLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {/* PUBLIC LIVE OVERVIEW VIEW */}
        {viewMode === 'public' && (
          <div className="fade-in">
            <HeroSection
              stats={stats}
              slots={slots}
              rates={rates}
              onBookSlot={handleBookFromHero}
            />

            <div className="section-header">
              <div>
                <h2 className="section-title">
                  <i className="fa-solid fa-map-location-dot" style={{ color: 'var(--primary)' }}></i>
                  Live Parking Bay Occupancy Map
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Real-time status of all 100 parking bays. Green = Available, Red = Occupied.
                </p>
              </div>
            </div>

            <ParkingGrid
              slots={slots}
              records={records}
              onSlotClick={handleSlotClick}
            />
          </div>
        )}

        {/* OPERATOR & ADMIN PORTAL VIEW */}
        {viewMode === 'portal' && (
          <div className="fade-in">
            {/* Portal Tab Navigation */}
            <div style={{ marginBottom: '24px' }}>
              <div className="tabs-nav">
                <button
                  className={`tab-btn ${portalTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setPortalTab('dashboard')}
                >
                  <i className="fa-solid fa-chart-pie"></i> Dashboard Overview
                </button>
                <button
                  className={`tab-btn ${portalTab === 'slots' ? 'active' : ''}`}
                  onClick={() => setPortalTab('slots')}
                >
                  <i className="fa-solid fa-square-parking"></i> Parking Bays
                </button>
                <button
                  className={`tab-btn ${portalTab === 'records' ? 'active' : ''}`}
                  onClick={() => setPortalTab('records')}
                >
                  <i className="fa-solid fa-clock-rotate-left"></i> Vehicle Log
                </button>
                <button
                  className={`tab-btn ${portalTab === 'reports' ? 'active' : ''}`}
                  onClick={() => setPortalTab('reports')}
                >
                  <i className="fa-solid fa-file-invoice-dollar"></i> Audit Reports
                </button>

                {isAdmin && (
                  <>
                    <button
                      className={`tab-btn ${portalTab === 'rates' ? 'active' : ''}`}
                      onClick={() => setPortalTab('rates')}
                    >
                      <i className="fa-solid fa-sliders"></i> Tariff Rates
                    </button>
                    <button
                      className={`tab-btn ${portalTab === 'users' ? 'active' : ''}`}
                      onClick={() => setPortalTab('users')}
                    >
                      <i className="fa-solid fa-users-gear"></i> User Management
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Render Active Tab */}
            {portalTab === 'dashboard' && (
              <DashboardStats
                stats={stats}
                records={records}
                onOpenEntry={() => {
                  setEntryPreselectedSlot(null);
                  setEntryModalOpen(true);
                }}
                onOpenExit={(reg) => {
                  setExitInitialReg(reg || '');
                  setExitModalOpen(true);
                }}
                onRefresh={loadAllData}
              />
            )}

            {portalTab === 'slots' && (
              <ParkingGrid
                slots={slots}
                records={records}
                onSlotClick={handleSlotClick}
                isAdmin={isAdmin}
                onOpenAddSlot={() => setAddSlotModalOpen(true)}
              />
            )}

            {portalTab === 'records' && (
              <VehicleRecordsTable
                records={records}
                onOpenExit={(reg) => {
                  setExitInitialReg(reg);
                  setExitModalOpen(true);
                }}
              />
            )}

            {portalTab === 'reports' && (
              <DailyReports onShowAlert={showAlert} />
            )}

            {portalTab === 'rates' && isAdmin && (
              <RatesConfig
                rates={rates}
                onRatesUpdated={loadAllData}
                onShowAlert={showAlert}
              />
            )}

            {portalTab === 'users' && isAdmin && (
              <UserManagement
                onOpenAddUser={() => setAddUserModalOpen(true)}
                onShowAlert={showAlert}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div>
          <strong>ParkSys</strong> – Intelligent Vehicle &amp; Parking Management System. All rights reserved.
        </div>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onShowAlert={showAlert}
      />

      <VehicleEntryModal
        isOpen={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        preselectedSlot={entryPreselectedSlot}
        onEntrySuccess={(ticket) => {
          setEntryTicketData(ticket);
          loadAllData();
        }}
        onShowAlert={showAlert}
      />

      <EntryTicketModal
        ticketData={entryTicketData}
        onClose={() => setEntryTicketData(null)}
      />

      <VehicleExitModal
        isOpen={exitModalOpen}
        onClose={() => setExitModalOpen(false)}
        initialRegNumber={exitInitialReg}
        parkedVehicles={records.filter((r) => !r.exitTime)}
        onExitSuccess={(receipt) => {
          setExitReceiptData(receipt);
          loadAllData();
        }}
        onShowAlert={showAlert}
      />

      <ExitReceiptModal
        receiptData={exitReceiptData}
        onClose={() => setExitReceiptData(null)}
      />

      <AddUserModal
        isOpen={addUserModalOpen}
        onClose={() => setAddUserModalOpen(false)}
        onUserCreated={loadAllData}
        onShowAlert={showAlert}
      />

      <AddSlotModal
        isOpen={addSlotModalOpen}
        onClose={() => setAddSlotModalOpen(false)}
        onSlotAdded={loadAllData}
        onShowAlert={showAlert}
      />

      {/* Floating Alert Toast */}
      <AlertToast alert={alert} onClose={() => setAlert(null)} />
    </div>
  );
}
