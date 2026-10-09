package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.RateConfigRequest;
import com.example.demo.entity.ParkingRate;
import com.example.demo.service.ParkingRateService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/config")
@CrossOrigin(origins = "*")
public class ConfigController {

    private final ParkingRateService parkingRateService;

    public ConfigController(ParkingRateService parkingRateService) {
        this.parkingRateService = parkingRateService;
    }

    @PostMapping("/rates")
    public ApiResponse<ParkingRate> updateRate(@RequestBody RateConfigRequest request) {
        return parkingRateService.updateRate(request);
    }

    @GetMapping("/rates")
    public List<ParkingRate> getAllRates() {
        return parkingRateService.getAllRates();
    }
}
