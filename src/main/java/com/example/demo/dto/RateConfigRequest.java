package com.example.demo.dto;

import com.example.demo.enums.VehicleType;
import lombok.Data;

@Data
public class RateConfigRequest {
    private VehicleType vehicleType;
    private double baseRate;
    private double hourlyRate;
}
