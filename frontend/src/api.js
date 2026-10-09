/**
 * Simple, clean API service using standard browser fetch.
 * Placement friendly: Uses native fetch and async/await with clean error handling.
 */

const BASE_URL = ''; // Relative URL works with both Vite proxy and Spring Boot static hosting

async function safeFetch(url, options = {}) {
  try {
    const token = localStorage.getItem('token');
    const headers = { ...options.headers };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errData = null;
      try {
        errData = await res.json();
      } catch {
        // Response was not JSON (e.g. Vite proxy ECONNREFUSED 500 error)
      }
      return {
        success: false,
        message:
          errData?.message ||
          `Backend connection error (${res.status}): Ensure Spring Boot is running on port 5000.`,
        data: null,
      };
    }
    return await res.json();
  } catch (err) {
    return {
      success: false,
      message: `Cannot connect to server: ${err.message}. Ensure Spring Boot is started on port 5000.`,
      data: null,
    };
  }
}

export async function fetchStats() {
  return safeFetch(`${BASE_URL}/api/parking/stats`);
}

export async function fetchSlots() {
  return safeFetch(`${BASE_URL}/api/parking/slots`);
}

export async function fetchRecords() {
  return safeFetch(`${BASE_URL}/api/parking/records`);
}

export async function fetchParkedVehicles() {
  return safeFetch(`${BASE_URL}/api/parking/vehicles`);
}

export async function fetchRates() {
  return safeFetch(`${BASE_URL}/api/config/rates`);
}

export async function updateRate(rateData) {
  return safeFetch(`${BASE_URL}/api/config/rates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rateData),
  });
}

export async function enterVehicle(entryData) {
  return safeFetch(`${BASE_URL}/api/parking/enter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryData),
  });
}

export async function exitVehicle(exitData) {
  return safeFetch(`${BASE_URL}/api/parking/exit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(exitData),
  });
}

export async function calculateFare(regNumber) {
  return safeFetch(`${BASE_URL}/api/parking/calculate-fare?regNumber=${encodeURIComponent(regNumber)}`);
}

export async function fetchDailyReport(date) {
  const url = date
    ? `${BASE_URL}/api/parking/reports/daily?date=${date}`
    : `${BASE_URL}/api/parking/reports/daily`;
  return safeFetch(url);
}

export async function sendReportEmail(date, recipientEmail) {
  const url = `${BASE_URL}/api/parking/reports/send-email?date=${date}&recipientEmail=${encodeURIComponent(recipientEmail)}`;
  return safeFetch(url, { method: 'POST' });
}

export async function loginUser(email, password) {
  return safeFetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(userData) {
  return safeFetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
}

export async function fetchUsers() {
  return safeFetch(`${BASE_URL}/api/auth/users`);
}

export async function toggleUserStatus(userId) {
  return safeFetch(`${BASE_URL}/api/auth/users/${userId}/toggle-status`, {
    method: 'POST',
  });
}

export async function deleteUser(userId) {
  return safeFetch(`${BASE_URL}/api/auth/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function addParkingSlot(slotData) {
  return safeFetch(`${BASE_URL}/api/parking/slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slotData),
  });
}

export async function requestOtp(target) {
  return safeFetch(`${BASE_URL}/api/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target }),
  });
}

export async function verifyOtp(verifyData) {
  return safeFetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(verifyData),
  });
}

export async function changePassword(changeData) {
  return safeFetch(`${BASE_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changeData),
  });
}
