package com.example.demo.controller;

import com.example.demo.dto.*;
import com.example.demo.entity.ParkingRecord;
import com.example.demo.entity.ParkingSlot;
import com.example.demo.service.ParkingService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/parking")
@CrossOrigin(origins = "*")
public class ParkingController {

    private final ParkingService parkingService;

    public ParkingController(ParkingService parkingService) {
        this.parkingService = parkingService;
    }

    @PostMapping("/enter")
    public ApiResponse<ParkingRecord> enterVehicle(@RequestBody VehicleEntryRequest request) {
        return parkingService.enterVehicle(request);
    }

    @PostMapping("/exit")
    public ApiResponse<ParkingRecord> exitVehicle(@RequestBody VehicleExitRequest request) {
        return parkingService.exitVehicle(request);
    }

    @GetMapping("/calculate-fare")
    public ApiResponse<Map<String, Object>> calculateFare(@RequestParam String regNumber) {
        return parkingService.calculateFare(regNumber);
    }

    @GetMapping("/slots")
    public ApiResponse<List<ParkingSlot>> getAllSlots() {
        return ApiResponse.ok("Parking slots retrieved", parkingService.getAllSlots());
    }

    @PostMapping("/slots")
    public ApiResponse<ParkingSlot> addSlot(@RequestBody ParkingSlot slot) {
        return parkingService.addSlot(slot);
    }

    @GetMapping("/vehicles")
    public ApiResponse<List<ParkingRecord>> getParkedVehicles() {
        return ApiResponse.ok("Currently parked vehicles retrieved", parkingService.getParkedVehicles());
    }

    @GetMapping("/records")
    public ApiResponse<List<ParkingRecord>> getAllRecords() {
        return ApiResponse.ok("All parking records retrieved", parkingService.getAllRecords());
    }

    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> getParkingStats() {
        return ApiResponse.ok("Parking statistics retrieved", parkingService.getParkingStats());
    }

    @PostMapping("/reports/daily")
    public ApiResponse<DailyReportResponse> generateDailyReportPost(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate reportDate = (date != null) ? date : LocalDate.now();
        return ApiResponse.ok("Daily report generated", parkingService.getDailyReport(reportDate));
    }

    @GetMapping("/reports/daily")
    public ApiResponse<DailyReportResponse> generateDailyReportGet(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate reportDate = (date != null) ? date : LocalDate.now();
        return ApiResponse.ok("Daily report generated", parkingService.getDailyReport(reportDate));
    }

    @PostMapping("/reports/send-email")
    public ApiResponse<String> sendDailyReportEmail(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        @RequestParam(required = false, defaultValue = "admin@parking.com") String recipientEmail) {
        LocalDate reportDate = (date != null) ? date : LocalDate.now();
        return parkingService.sendDailyReportEmail(reportDate, recipientEmail);
    }
}
