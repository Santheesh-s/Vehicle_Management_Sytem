package com.example.demo.dto;

import com.example.demo.entity.ParkingRecord;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailyReportResponse {
    private LocalDate reportDate;
    private long totalVehicles;
    private double totalRevenue;
    private List<ParkingRecord> records;
}
