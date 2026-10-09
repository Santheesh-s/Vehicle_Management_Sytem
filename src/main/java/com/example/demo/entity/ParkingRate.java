package com.example.demo.entity;

import com.example.demo.enums.VehicleType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "parking_rates")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParkingRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true)
    private VehicleType vehicleType;

    private double baseRate; // Rate for the first hour

    private double hourlyRate; // Additional rate per subsequent hour
}
