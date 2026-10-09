package com.example.demo.service;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.RateConfigRequest;
import com.example.demo.entity.ParkingRate;
import com.example.demo.enums.VehicleType;
import com.example.demo.repository.ParkingRateRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ParkingRateService {

    private final ParkingRateRepository parkingRateRepository;

    public ParkingRateService(ParkingRateRepository parkingRateRepository) {
        this.parkingRateRepository = parkingRateRepository;
    }

    public List<ParkingRate> getAllRates() {
        return parkingRateRepository.findAll();
    }

    public ApiResponse<ParkingRate> updateRate(RateConfigRequest request) {
        if (request.getVehicleType() == null) {
            return ApiResponse.error("Vehicle type is required");
        }

        Optional<ParkingRate> existingRate = parkingRateRepository.findByVehicleType(request.getVehicleType());
        ParkingRate rate = existingRate.orElseGet(ParkingRate::new);
        rate.setVehicleType(request.getVehicleType());
        rate.setBaseRate(request.getBaseRate());
        rate.setHourlyRate(request.getHourlyRate());

        ParkingRate savedRate = parkingRateRepository.save(rate);
        return ApiResponse.ok("Parking rate updated successfully", savedRate);
    }

    public ParkingRate getRateForVehicleType(VehicleType vehicleType) {
        return parkingRateRepository.findByVehicleType(vehicleType).orElseGet(() -> {
            // Default fallback rate if not configured
            ParkingRate defaultRate = new ParkingRate();
            defaultRate.setVehicleType(vehicleType);
            defaultRate.setBaseRate(20.0);
            defaultRate.setHourlyRate(10.0);
            return defaultRate;
        });
    }
}
