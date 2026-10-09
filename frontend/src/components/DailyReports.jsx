import React, { useState, useEffect } from 'react';
import { fetchDailyReport, sendReportEmail } from '../api';

/**
 * DailyReports Component:
 * Generates audit summary of parking throughput and revenue for a selected date.
 * Automatically dispatches the audit report to all system administrators with one click.
 */
export default function DailyReports({ onShowAlert }) {
  const today = new Date().toISOString().split('T')[0];
  const [reportDate, setReportDate] = useState(today);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const loadReport = async (date) => {
    setLoading(true);
    try {
      const res = await fetchDailyReport(date);
      if (res.success && res.data) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Failed to load daily report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(reportDate);
  }, [reportDate]);

  const handleSendToAdmins = async () => {
    setSendingEmail(true);
    try {
      const res = await sendReportEmail(reportDate, '');
      if (res.success) {
        onShowAlert(res.message || 'Audit report dispatched to all system administrators!', 'success');
      } else {
        onShowAlert(res.message || 'Failed to dispatch report', 'danger');
      }
    } catch (err) {
      onShowAlert('Error sending report: ' + err.message, 'danger');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <i className="fa-solid fa-file-invoice-dollar" style={{ color: 'var(--primary)' }}></i>
            Daily Audit &amp; Revenue Reports
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Audited breakdown of vehicle turnover and collected parking fees.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="date"
            className="form-control"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            style={{ width: '160px', fontSize: '0.88rem' }}
          />
          <button
            className="btn btn-outline btn-sm"
            onClick={() => loadReport(reportDate)}
            disabled={loading}
          >
            <i className="fa-solid fa-rotate"></i> {loading ? 'Loading...' : 'Generate'}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSendToAdmins}
            disabled={sendingEmail}
          >
            <i className="fa-solid fa-envelope"></i> {sendingEmail ? 'Sending...' : 'Email Report to Admins'}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon indigo">
            <i className="fa-solid fa-calendar-day"></i>
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: '1.2rem' }}>
              {reportData?.reportDate || reportDate}
            </div>
            <div className="stat-label">Audit Date</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <i className="fa-solid fa-car-side"></i>
          </div>
          <div>
            <div className="stat-value">
              {reportData ? reportData.totalVehicles : 0}
            </div>
            <div className="stat-label">Total Vehicles Handled</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon emerald">
            <i className="fa-solid fa-indian-rupee-sign"></i>
          </div>
          <div>
            <div className="stat-value">
              ₹{(reportData?.totalRevenue || 0).toFixed(2)}
            </div>
            <div className="stat-label">Gross Revenue Collected</div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Registration No</th>
                <th>Vehicle Type</th>
                <th>Slot No</th>
                <th>Entry Time</th>
                <th>Exit Time</th>
                <th>Amount</th>
                <th>Payment Mode</th>
              </tr>
            </thead>
            <tbody>
              {!reportData || !reportData.records || reportData.records.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                    No vehicle entries or exits recorded on this date.
                  </td>
                </tr>
              ) : (
                reportData.records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="reg-plate">{r.vehicle?.regNumber}</span>
                    </td>
                    <td>{r.vehicle?.vehicleType?.replace('_', ' ')}</td>
                    <td>
                      <span className="badge-tag blue">
                        {r.parkingSlot ? r.parkingSlot.slotNumber : '--'}
                      </span>
                    </td>
                    <td>{new Date(r.entryTime).toLocaleTimeString()}</td>
                    <td>{r.exitTime ? new Date(r.exitTime).toLocaleTimeString() : 'Still Parked'}</td>
                    <td>
                      <strong>₹{(r.totalAmount || 0).toFixed(2)}</strong>
                    </td>
                    <td>
                      <span className="badge-tag gray">
                        {r.paymentMethod || 'CASH'}
                      </span>
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
