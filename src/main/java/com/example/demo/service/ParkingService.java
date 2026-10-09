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
            return vehicleRepository.save(newVehicle);
        });

        // Update owner details if provided
        if (request.getOwnerName() != null) vehicle.setOwnerName(request.getOwnerName());
        if (request.getOwnerPhone() != null) vehicle.setOwnerPhone(request.getOwnerPhone());
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

        // Optional: Dispatch SMS ticket notification if phone number provided
        if (request.getOwnerPhone() != null && !request.getOwnerPhone().isBlank()) {
            notificationService.sendSms(request.getOwnerPhone(), 
                "ParkSys: Vehicle " + regNum + " check-in confirmed at bay " + slot.getSlotNumber() + ". Ticket #" + savedRecord.getId());
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

        // Dispatch optional exit SMS confirmation
        if (record.getVehicle() != null && record.getVehicle().getOwnerPhone() != null && !record.getVehicle().getOwnerPhone().isBlank()) {
            notificationService.sendSms(record.getVehicle().getOwnerPhone(), 
                "ParkSys: Settlement completed for " + regNum + ". Amount Paid: ₹" + totalAmount + " (" + record.getPaymentMethod() + ", Ref: " + txnId + "). Exit gate opened!");
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
