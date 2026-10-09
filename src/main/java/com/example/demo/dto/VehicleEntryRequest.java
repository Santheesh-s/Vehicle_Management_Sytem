package com.example.demo.dto;

import com.example.demo.enums.VehicleType;
import lombok.Data;

@Data
public class VehicleEntryRequest {
    private String regNumber;
    private VehicleType vehicleType;
    private String ownerName;
    private String ownerPhone;
}
