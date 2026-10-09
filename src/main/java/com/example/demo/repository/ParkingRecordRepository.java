package com.example.demo.repository;

import com.example.demo.entity.ParkingRecord;
import com.example.demo.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ParkingRecordRepository extends JpaRepository<ParkingRecord, Long> {
    Optional<ParkingRecord> findFirstByVehicle_RegNumberAndExitTimeIsNull(String regNumber);
    
    List<ParkingRecord> findByExitTimeIsNull();

    List<ParkingRecord> findByEntryTimeBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT COUNT(p) FROM ParkingRecord p WHERE p.entryTime >= :startTime")
    long countVehiclesEnteredSince(@Param("startTime") LocalDateTime startTime);

    @Query("SELECT COALESCE(SUM(p.totalAmount), 0.0) FROM ParkingRecord p WHERE p.exitTime >= :startTime AND p.paymentStatus = :status")
    Double sumRevenueSince(@Param("startTime") LocalDateTime startTime, @Param("status") PaymentStatus status);
}
