package com.example.demo.service;

import com.example.demo.dto.*;
import com.example.demo.entity.ParkingRate;
import com.example.demo.entity.ParkingRecord;
import com.example.demo.entity.ParkingSlot;
import com.example.demo.entity.Vehicle;
import com.example.demo.enums.PaymentMethod;
import com.example.demo.enums.PaymentStatus;
import com.example.demo.enums.SlotStatus;
import com.example.demo.repository.ParkingRecordRepository;
import com.example.demo.repository.ParkingSlotRepository;
import com.example.demo.repository.VehicleRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ParkingService {

    private final ParkingSlotRepository parkingSlotRepository;
    private final VehicleRepository vehicleRepository;
    private final ParkingRecordRepository parkingRecordRepository;
    private final ParkingRateService parkingRateService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public ParkingService(ParkingSlotRepository parkingSlotRepository,
                          VehicleRepository vehicleRepository,
                          ParkingRecordRepository parkingRecordRepository,
                          ParkingRateService parkingRateService,
                          NotificationService notificationService,
                          UserRepository userRepository) {
        this.parkingSlotRepository = parkingSlotRepository;
        this.vehicleRepository = vehicleRepository;
        this.parkingRecordRepository = parkingRecordRepository;
        this.parkingRateService = parkingRateService;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    public ApiResponse<ParkingRecord> enterVehicle(VehicleEntryRequest request) {
        if (request.getRegNumber() == null || request.getRegNumber().trim().isEmpty()) {
            return ApiResponse.error("Registration number is required");
        }
        if (request.getVehicleType() == null) {
            return ApiResponse.error("Vehicle type is required");
        }

        String regNum = request.getRegNumber().trim().toUpperCase();

        // Check if vehicle is already parked
        Optional<ParkingRecord> activeRecord = parkingRecordRepository.findFirstByVehicle_RegNumberAndExitTimeIsNull(regNum);
        if (activeRecord.isPresent()) {
            return ApiResponse.error("Vehicle " + regNum + " is already parked in slot " 
                    + activeRecord.get().getParkingSlot().getSlotNumber());
        }

        // Find available slot for this vehicle type
        Optional<ParkingSlot> availableSlot = parkingSlotRepository.findFirstByVehicleTypeAndStatus(
                request.getVehicleType(), SlotStatus.AVAILABLE);

        if (availableSlot.isEmpty()) {
            return ApiResponse.error("No parking slot available for " + request.getVehicleType());
        }

        ParkingSlot slot = availableSlot.get();

        // Find or create Vehicle
        Vehicle vehicle = vehicleRepository.findByRegNumber(regNum).orElseGet(() -> {
            Vehicle newVehicle = new Vehicle();
            newVehicle.setRegNumber(regNum);
            newVehicle.setVehicleType(request.getVehicleType());
            newVehicle.setOwnerName(request.getOwnerName());
            newVehicle.setOwnerPhone(request.getOwnerPhone());
            newVehicle.setOwnerEmail(request.getOwnerEmail());
            return vehicleRepository.save(newVehicle);
        });

        // Update owner details if provided
        if (request.getOwnerName() != null) vehicle.setOwnerName(request.getOwnerName());
        if (request.getOwnerPhone() != null) vehicle.setOwnerPhone(request.getOwnerPhone());
        if (request.getOwnerEmail() != null) vehicle.setOwnerEmail(request.getOwnerEmail());
        vehicleRepository.save(vehicle);

        // Mark slot as occupied
        slot.setStatus(SlotStatus.OCCUPIED);
        parkingSlotRepository.save(slot);

        // Create Parking Record
        ParkingRecord record = new ParkingRecord();
        record.setVehicle(vehicle);
        record.setParkingSlot(slot);
        record.setEntryTime(LocalDateTime.now());
        record.setPaymentStatus(PaymentStatus.PENDING);

        ParkingRecord savedRecord = parkingRecordRepository.save(record);

        // Dispatch Email confirmation when vehicle is parked (No SMS)
        String driverEmail = vehicle.getOwnerEmail();
        if (driverEmail != null && !driverEmail.isBlank()) {
            java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("dd-MMM-yyyy hh:mm a");
            String formattedEntry = savedRecord.getEntryTime() != null ? savedRecord.getEntryTime().format(dtf) : "Now";
            String driverName = (vehicle.getOwnerName() != null && !vehicle.getOwnerName().isBlank()) ? vehicle.getOwnerName() : "Driver";
            String driverPhone = (vehicle.getOwnerPhone() != null && !vehicle.getOwnerPhone().isBlank()) ? vehicle.getOwnerPhone() : "Not Provided";

            String subject = "🅿️ Vehicle Parked Confirmation - " + regNum + " [Bay " + slot.getSlotNumber() + "]";
            String emailBody = String.format("""
                Dear %s,

                Your vehicle (%s) has been successfully checked in and parked at our facility.

                PARKING DETAILS:
                ============================================================
                Registration Number : %s
                Vehicle Category    : %s
                Allocated Bay / Slot: %s
                Check-In Timestamp  : %s
                Ticket ID Reference : #%d
                Registered Mobile   : %s
                ============================================================

                Please retain your Ticket ID / Registration Number for checkout at the exit gate.

                Thank you for parking with us!
                """,
                driverName,
                regNum,
                regNum,
                request.getVehicleType(),
                slot.getSlotNumber(),
                formattedEntry,
                savedRecord.getId(),
                driverPhone
            );
            notificationService.sendEmail(driverEmail.trim(), subject, emailBody);
        }

        return ApiResponse.ok("Vehicle entered successfully and assigned to slot " + slot.getSlotNumber(), savedRecord);
    }

    public ApiResponse<ParkingRecord> exitVehicle(VehicleExitRequest request) {
        if (request.getRegNumber() == null || request.getRegNumber().trim().isEmpty()) {
            return ApiResponse.error("Registration number is required");
        }

        String regNum = request.getRegNumber().trim().toUpperCase();

        Optional<ParkingRecord> activeRecordOpt = parkingRecordRepository.findFirstByVehicle_RegNumberAndExitTimeIsNull(regNum);
        if (activeRecordOpt.isEmpty()) {
            return ApiResponse.error("No active parking record found for vehicle: " + regNum);
        }

        ParkingRecord record = activeRecordOpt.get();
        LocalDateTime exitTime = LocalDateTime.now();
        record.setExitTime(exitTime);

        // Calculate duration
        long durationMinutes = Duration.between(record.getEntryTime(), exitTime).toMinutes();
        if (durationMinutes < 1) {
            durationMinutes = 1; // Minimum 1 minute recorded
        }
        record.setDurationMinutes(durationMinutes);

        // Calculate hours (ceil to nearest full hour, minimum 1 hour)
        long billableHours = (long) Math.ceil((double) durationMinutes / 60.0);
        if (billableHours < 1) {
            billableHours = 1;
        }

        // Calculate amount based on rate
        ParkingRate rate = parkingRateService.getRateForVehicleType(record.getVehicle().getVehicleType());
        double totalAmount = rate.getBaseRate();
        if (billableHours > 1) {
            totalAmount += (billableHours - 1) * rate.getHourlyRate();
        }

        record.setTotalAmount(totalAmount);
        record.setPaymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : PaymentMethod.CASH);
        record.setPaymentStatus(PaymentStatus.COMPLETED);

        // Assign Transaction ID and payment reference
        String txnId = request.getTransactionId();
        if (txnId == null || txnId.trim().isEmpty()) {
            txnId = "TXN-" + record.getPaymentMethod().name() + "-" + (System.currentTimeMillis() % 10000000);
        }
        record.setTransactionId(txnId);
        record.setPaymentReference(request.getPaymentReference() != null && !request.getPaymentReference().trim().isEmpty() 
            ? request.getPaymentReference() : "Settled at Exit Checkout");

        // Free up the parking slot
        ParkingSlot slot = record.getParkingSlot();
        slot.setStatus(SlotStatus.AVAILABLE);
        parkingSlotRepository.save(slot);

        ParkingRecord updatedRecord = parkingRecordRepository.save(record);

        // Dispatch Email receipt when vehicle exits with amount (No SMS)
        if (record.getVehicle() != null && record.getVehicle().getOwnerEmail() != null && !record.getVehicle().getOwnerEmail().isBlank()) {
            String driverEmail = record.getVehicle().getOwnerEmail().trim();
            java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("dd-MMM-yyyy hh:mm a");
            String formattedEntry = record.getEntryTime() != null ? record.getEntryTime().format(dtf) : "N/A";
            String formattedExit = record.getExitTime() != null ? record.getExitTime().format(dtf) : "N/A";
            String driverName = (record.getVehicle().getOwnerName() != null && !record.getVehicle().getOwnerName().isBlank()) 
                    ? record.getVehicle().getOwnerName() : "Driver";

            String subject = String.format("🚗 Vehicle Exited - Settlement Receipt: %s (Amount: ₹%.2f)", regNum, totalAmount);
            String emailBody = String.format("""
                Dear %s,

                Your vehicle (%s) has successfully checked out and exited from our parking facility.

                EXIT & SETTLEMENT RECEIPT:
                ============================================================
                Registration Number : %s
                Vehicle Category    : %s
                Parking Bay / Slot  : %s
                Check-In Timestamp  : %s
                Check-Out Timestamp : %s
                Total Duration      : %d mins (%d billable hr(s))
                ============================================================
                TOTAL AMOUNT PAID   : ₹%.2f
                Payment Method      : %s
                Transaction ID      : %s
                Exit Barrier Status : CLEARED & OPENED
                ============================================================

                Thank you for choosing our parking facility. Have a safe journey!
                """,
                driverName,
                regNum,
                regNum,
                record.getVehicle().getVehicleType(),
                record.getParkingSlot() != null ? record.getParkingSlot().getSlotNumber() : "--",
                formattedEntry,
                formattedExit,
                record.getDurationMinutes() != null ? record.getDurationMinutes() : 0,
                billableHours,
                totalAmount,
                record.getPaymentMethod(),
                txnId
            );
            notificationService.sendEmail(driverEmail, subject, emailBody);
        }

        return ApiResponse.ok("Vehicle exited successfully. Total amount: ₹" + totalAmount, updatedRecord);
    }

    public ApiResponse<Map<String, Object>> calculateFare(String regNumber) {
        if (regNumber == null || regNumber.trim().isEmpty()) {
            return ApiResponse.error("Registration number is required");
        }

        String regNum = regNumber.trim().toUpperCase();
        Optional<ParkingRecord> activeRecordOpt = parkingRecordRepository.findFirstByVehicle_RegNumberAndExitTimeIsNull(regNum);
        if (activeRecordOpt.isEmpty()) {
            return ApiResponse.error("No active parking record found for vehicle: " + regNum);
        }

        ParkingRecord record = activeRecordOpt.get();
        LocalDateTime now = LocalDateTime.now();
        long durationMinutes = Duration.between(record.getEntryTime(), now).toMinutes();
        if (durationMinutes < 1) {
            durationMinutes = 1;
        }

        long billableHours = (long) Math.ceil((double) durationMinutes / 60.0);
        if (billableHours < 1) {
            billableHours = 1;
        }

        ParkingRate rate = parkingRateService.getRateForVehicleType(record.getVehicle().getVehicleType());
        double totalAmount = rate.getBaseRate();
        if (billableHours > 1) {
            totalAmount += (billableHours - 1) * rate.getHourlyRate();
        }

        Map<String, Object> fareData = new HashMap<>();
        fareData.put("regNumber", regNum);
        fareData.put("vehicleType", record.getVehicle().getVehicleType());
        fareData.put("slotNumber", record.getParkingSlot().getSlotNumber());
        fareData.put("entryTime", record.getEntryTime());
        fareData.put("durationMinutes", durationMinutes);
        fareData.put("billableHours", billableHours);
        fareData.put("baseRate", rate.getBaseRate());
        fareData.put("hourlyRate", rate.getHourlyRate());
        fareData.put("totalAmount", totalAmount);
        fareData.put("ownerName", record.getVehicle().getOwnerName());
        fareData.put("ownerPhone", record.getVehicle().getOwnerPhone());
        fareData.put("ownerEmail", record.getVehicle().getOwnerEmail());

        return ApiResponse.ok("Fare calculated successfully", fareData);
    }

    public List<ParkingSlot> getAllSlots() {
        return parkingSlotRepository.findAll();
    }

    public ApiResponse<ParkingSlot> addSlot(ParkingSlot slot) {
        if (slot.getSlotNumber() == null || slot.getSlotNumber().trim().isEmpty()) {
            return ApiResponse.error("Slot number is required");
        }
        if (slot.getVehicleType() == null) {
            return ApiResponse.error("Vehicle type is required");
        }
        if (parkingSlotRepository.findBySlotNumber(slot.getSlotNumber().trim().toUpperCase()).isPresent()) {
            return ApiResponse.error("Slot number already exists");
        }
        slot.setSlotNumber(slot.getSlotNumber().trim().toUpperCase());
        if (slot.getStatus() == null) {
            slot.setStatus(SlotStatus.AVAILABLE);
        }
        ParkingSlot saved = parkingSlotRepository.save(slot);
        return ApiResponse.ok("Parking slot added successfully", saved);
    }

    public List<ParkingRecord> getParkedVehicles() {
        return parkingRecordRepository.findByExitTimeIsNull();
    }

    public List<ParkingRecord> getAllRecords() {
        return parkingRecordRepository.findAll();
    }

    public Map<String, Object> getParkingStats() {
        long totalSlots = parkingSlotRepository.count();
        long occupiedSlots = parkingSlotRepository.countByStatus(SlotStatus.OCCUPIED);
        long availableSlots = parkingSlotRepository.countByStatus(SlotStatus.AVAILABLE);
        long maintenanceSlots = parkingSlotRepository.countByStatus(SlotStatus.MAINTENANCE);

        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        long todayVehicleCount = parkingRecordRepository.countVehiclesEnteredSince(startOfToday);
        Double todayRevenue = parkingRecordRepository.sumRevenueSince(startOfToday, PaymentStatus.COMPLETED);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalSlots", totalSlots);
        stats.put("occupiedSlots", occupiedSlots);
        stats.put("availableSlots", availableSlots);
        stats.put("maintenanceSlots", maintenanceSlots);
        stats.put("todayVehicleCount", todayVehicleCount);
        stats.put("todayRevenue", todayRevenue != null ? todayRevenue : 0.0);

        return stats;
    }

    public DailyReportResponse getDailyReport(LocalDate date) {
        if (date == null) {
            date = LocalDate.now();
        }

        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(LocalTime.MAX);

        List<ParkingRecord> records = parkingRecordRepository.findByEntryTimeBetween(startOfDay, endOfDay);
        double totalRevenue = records.stream()
                .filter(r -> r.getPaymentStatus() == PaymentStatus.COMPLETED && r.getTotalAmount() != null)
                .mapToDouble(ParkingRecord::getTotalAmount)
                .sum();

        return new DailyReportResponse(date, records.size(), totalRevenue, records);
    }

    public ApiResponse<String> sendDailyReportEmail(LocalDate date, String recipientEmail) {
        DailyReportResponse report = getDailyReport(date);

        String emailBody = String.format("""
                =============================================
                DAILY PARKING AUDIT REPORT - %s
                =============================================
                Total Vehicles Handled: %d
                Gross Revenue Earned  : ₹%.2f
                =============================================
                Dispatched automatically to system administrators.
                """, report.getReportDate(), report.getTotalVehicles(), report.getTotalRevenue());

        // Find all registered system administrators
        java.util.List<com.example.demo.entity.User> admins = userRepository.findByRole(com.example.demo.enums.UserRole.ADMIN);
        java.util.List<String> targetEmails = new java.util.ArrayList<>(admins.stream()
                .map(com.example.demo.entity.User::getEmail)
                .filter(e -> e != null && !e.isBlank())
                .distinct()
                .toList());

        if (recipientEmail != null && !recipientEmail.isBlank() && !targetEmails.contains(recipientEmail.trim())) {
            targetEmails.add(recipientEmail.trim());
        }

        if (targetEmails.isEmpty()) {
            targetEmails.add("arvilightss@gmail.com");
        }

        int sentCount = 0;
        for (String email : targetEmails) {
            boolean sent = notificationService.sendEmail(email, "Daily Parking Audit Report - " + report.getReportDate(), emailBody);
            if (sent) sentCount++;
        }

        String statusMsg = sentCount > 0
                ? "Audit report dispatched to administrator(s): " + String.join(", ", targetEmails)
                : "Daily report generated for administrators (logged to server console).";

        return ApiResponse.ok(statusMsg, emailBody);
    }
}
