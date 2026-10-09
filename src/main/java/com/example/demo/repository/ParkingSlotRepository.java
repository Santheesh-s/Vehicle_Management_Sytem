package com.example.demo.repository;

import com.example.demo.entity.ParkingSlot;
import com.example.demo.enums.SlotStatus;
import com.example.demo.enums.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Long> {
    Optional<ParkingSlot> findFirstByVehicleTypeAndStatus(VehicleType vehicleType, SlotStatus status);
    List<ParkingSlot> findByStatus(SlotStatus status);
    Optional<ParkingSlot> findBySlotNumber(String slotNumber);
    long countByStatus(SlotStatus status);
}
