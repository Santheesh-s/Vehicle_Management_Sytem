# ParkSys – Intelligent Vehicle & Parking Management System

A full-stack, enterprise-grade Parking Management System built with **React 18**, **Java 21**, **Spring Boot**, **Spring Data JPA**, and **Supabase PostgreSQL Cloud Database**. The application automates vehicle entry/exit workflows, dynamic slot allocation, multi-tier duration billing, role-based operator controls, and administrative auditing.

---

## Key Features

- **Automated Slot Allocation**: Dynamically reserves designated parking bays based on vehicle class (`TWO_WHEELER`, `FOUR_WHEELER`, `TRUCK`, `BUS`) across 100+ pre-configured bays with Admin expansion support.
- **Dynamic Tariff Calculation Engine**: Computes exact parking charges using configurable base tariffs and hourly increments tailored to each vehicle classification.
- **Multi-Channel Payment Settlement**: Tracks payment lifecycle (`PENDING`, `COMPLETED`) supporting `UPI`, `CARD`, and `CASH` settlement options.
- **Interactive React Dashboard**: Real-time visual slot occupancy map, live statistics, quick spot finder, fare calculator, and modal-driven vehicle check-in/checkout.
- **Role-Based Access Control (RBAC)**: Distinguishes between `ADMIN` and `OPERATOR` privileges, enabling operator lifecycle management and rate configuration.
- **User Self-Registration & OTP Recovery**: Built-in 6-digit OTP verification flow for password recovery and self-service operator registration.
- **Auditing & Reporting Engine**: Generates end-of-day revenue reports, vehicle throughput summaries, active occupancy metrics, and email dispatch support.
- **Dual Database Architecture**: Configured with production **Supabase PostgreSQL Cloud Database** with instant fallback to embedded **H2 In-Memory Database**.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend UI** | React 18, Vite, Vanilla CSS Design System, Font Awesome 6 |
| **Backend Framework** | Spring Boot 4.x / Spring Framework 6 |
| **Language & Runtime** | Java 21 (LTS) – Amazon Corretto |
| **Persistence & ORM** | Spring Data JPA, Hibernate ORM |
| **Database** | Supabase PostgreSQL Cloud Database / H2 In-Memory |
| **Build & Tooling** | Vite, Apache Maven Wrapper, Project Lombok |

---

## System Architecture

```text
Vehicle_Management_System/
├── frontend/                     # React 18 SPA (Vite)
│   ├── src/
│   │   ├── api.js                # Clean REST API client (fetch)
│   │   ├── App.jsx               # Main state & view controller
│   │   ├── App.css               # Vanilla CSS design system
│   │   ├── index.css             # Design tokens & typography
│   │   └── components/           # Modular React components
│   │       ├── Navbar.jsx        # Navigation & live status pill
│   │       ├── HeroSection.jsx   # Overview, spot finder & fare calc
│   │       ├── ParkingGrid.jsx   # 100-bay interactive map
│   │       ├── DashboardStats.jsx# KPI stats & occupancy bar
│   │       ├── VehicleRecordsTable.jsx # Historical entry/exit logs
│   │       ├── DailyReports.jsx  # Daily audit & revenue report
│   │       ├── RatesConfig.jsx   # Admin tariff configuration
│   │       ├── UserManagement.jsx# Admin staff & operator access
│   │       ├── LoginModal.jsx    # Authentication & 1-click demo logins
│   │       ├── VehicleEntryModal.jsx # Vehicle check-in
│   │       ├── EntryTicketModal.jsx  # Printable ticket slip
│   │       ├── VehicleExitModal.jsx  # Settlement & departure
│   │       ├── ExitReceiptModal.jsx  # Printable payment receipt
│   │       ├── AddUserModal.jsx      # Operator creation dialog
│   │       ├── EmailReportModal.jsx  # Email audit report dialog
│   │       └── AlertToast.jsx        # Lightweight notification toast
│   ├── package.json
│   └── vite.config.js
│
└── src/main/java/com/example/demo/ # Spring Boot Backend
    ├── config/                   # DataInitializer (seeds 100 bays, users, rates)
    ├── controller/               # REST Controllers: AuthController, ParkingController, ConfigController
    ├── dto/                      # Data Transfer Objects (Requests & Responses)
    ├── entity/                   # JPA Entities: User, Vehicle, ParkingSlot, ParkingRecord, ParkingRate, OtpRecord
    ├── enums/                    # VehicleType, UserRole, SlotStatus, PaymentStatus, PaymentMethod
    ├── repository/               # Spring Data JPA Repositories
    └── service/                  # Business Logic: AuthService, ParkingService, ParkingRateService
```

---

## Default Users & Credentials

Upon startup, `DataInitializer` automatically configures the environment:

| Username | Password | Role | Description |
| :--- | :--- | :--- | :--- |
| `admin` | `admin123` | `ADMIN` | Super Administrator (Full access, rate config, user management) |
| `staff` | `staff123` | `OPERATOR` | Gate Operator (Entry, exit, payment processing) |

*(The React Login Modal includes **1-Click Demo Buttons** for both roles).*

---

## Default Tariff Schedule

| Vehicle Type | Base Fee (First Hour) | Hourly Rate (Subsequent Hours) |
| :--- | :--- | :--- |
| **Two Wheeler** | ₹20.00 | ₹10.00 / hr |
| **Four Wheeler** | ₹40.00 | ₹20.00 / hr |
| **Truck** | ₹80.00 | ₹40.00 / hr |
| **Bus** | ₹80.00 | ₹40.00 / hr |

---

## 100 Parking Bays Allocation

- **Slots A01 – A40**: Two-Wheeler bays (40 slots)
- **Slots A41 – A60**: Four-Wheeler bays (20 slots)
- **Slots B01 – B30**: Bus bays (30 slots)
- **Slots C51 – C60**: Heavy Truck bays (10 slots)

---

## REST API Overview

### 1. Authentication & Users (`/api/auth`)
- `POST /api/auth/login` – Authenticate user
- `POST /api/auth/register` – Register operator or admin
- `GET /api/auth/me` – Fetch user profile
- `GET /api/auth/users` – List all system users (Admin)
- `POST /api/auth/users/{id}/toggle-status` – Enable/Disable operator account

### 2. Parking Operations (`/api/parking`)
- `POST /api/parking/enter` – Record entry, allocate bay, issue ticket
- `POST /api/parking/exit` – Record exit, calculate duration/fare, finalize settlement
- `GET /api/parking/slots` – Fetch all 100 bay statuses (`AVAILABLE`, `OCCUPIED`)
- `GET /api/parking/vehicles` – List active parked vehicles
- `GET /api/parking/records` – Full parking log history
- `GET /api/parking/stats` – Facility KPI stats (available, occupied, revenue)
- `GET /api/parking/reports/daily` – Generate daily audit summary
- `POST /api/parking/reports/send-email` – Trigger email dispatch of audit

### 3. Rate Configuration (`/api/config`)
- `GET /api/config/rates` – View tariff schedule for all categories
- `POST /api/config/rates` – Update base and hourly rates (Admin)

---

## How to Run the Project

### Option A: Development Mode (Hot-Reloading)
1. **Start Spring Boot Backend**:
   ```cmd
   mvnw.cmd spring-boot:run
   ```
   *(Server starts on `http://localhost:5000`)*

2. **Start React Frontend**:
   ```cmd
   cd frontend
   npm run dev
   ```
   *(Vite starts on `http://localhost:5173` with automatic API proxy to port 5000)*

### Option B: Unified Production Mode (Single Port)
1. **Build React App**:
   ```cmd
   cd frontend
   npm run build
   ```
   *(Compiled directly into `src/main/resources/static/`)*

2. **Run Spring Boot**:
   ```cmd
   mvnw.cmd spring-boot:run
   ```
3. Open `http://localhost:5000` in your browser. Spring Boot directly serves the compiled React application!
