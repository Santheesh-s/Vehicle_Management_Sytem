package com.example.demo.config;

import com.example.demo.entity.ParkingRate;
import com.example.demo.entity.ParkingRecord;
import com.example.demo.entity.ParkingSlot;
import com.example.demo.entity.User;
import com.example.demo.entity.Vehicle;
import com.example.demo.enums.PaymentMethod;
import com.example.demo.enums.PaymentStatus;
import com.example.demo.enums.SlotStatus;
import com.example.demo.enums.UserRole;
import com.example.demo.enums.VehicleType;
import com.example.demo.repository.ParkingRateRepository;
import com.example.demo.repository.ParkingRecordRepository;
import com.example.demo.repository.ParkingSlotRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.VehicleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingRateRepository parkingRateRepository;
    private final VehicleRepository vehicleRepository;
    private final ParkingRecordRepository parkingRecordRepository;

    public DataInitializer(UserRepository userRepository,
                           ParkingSlotRepository parkingSlotRepository,
                           ParkingRateRepository parkingRateRepository,
                           VehicleRepository vehicleRepository,
                           ParkingRecordRepository parkingRecordRepository) {
        this.userRepository = userRepository;
        this.parkingSlotRepository = parkingSlotRepository;
        this.parkingRateRepository = parkingRateRepository;
        this.vehicleRepository = vehicleRepository;
        this.parkingRecordRepository = parkingRecordRepository;
    }

    @Override
    public void run(String... args) {
        // 1. Initialize default users
        if (userRepository.count() == 0) {
            User admin = new User(null, "admin", "admin123", "admin@parksys.com", "9876543210", UserRole.ADMIN, true);
            User santheesh = new User(null, "SANTHEESH S", "admin123", "santheesh24@gmail.com", "9876543211", UserRole.ADMIN, true);
            User staff = new User(null, "staff", "staff123", "staff@parksys.com", "9876543212", UserRole.OPERATOR, true);
            User staff2 = new User(null, "santheesh-staff", "staff123", "santheeshs.23cse@kongu.edu", "9876543213", UserRole.OPERATOR, true);
            userRepository.saveAll(List.of(admin, santheesh, staff, staff2));
            System.out.println("Default users initialized (Admin & Staff accounts ready).");
        }

        // 2. Initialize default parking rates
        if (parkingRateRepository.count() == 0) {
            parkingRateRepository.save(new ParkingRate(null, VehicleType.TWO_WHEELER, 20.0, 10.0));
            parkingRateRepository.save(new ParkingRate(null, VehicleType.FOUR_WHEELER, 40.0, 20.0));
            parkingRateRepository.save(new ParkingRate(null, VehicleType.TRUCK, 80.0, 40.0));
            parkingRateRepository.save(new ParkingRate(null, VehicleType.BUS, 80.0, 40.0));
            System.out.println("Default parking rates initialized.");
        }

        // 3. Initialize default 100 parking slots matching ParkSys UI
        if (parkingSlotRepository.count() == 0) {
            // 40 Two-wheeler slots: A01 to A40
            for (int i = 1; i <= 40; i++) {
                String code = "A" + String.format("%02d", i);
                parkingSlotRepository.save(new ParkingSlot(null, code, VehicleType.TWO_WHEELER, SlotStatus.AVAILABLE));
            }

            // 20 Four-wheeler slots: A41 to A60
            for (int i = 41; i <= 60; i++) {
                String code = "A" + String.format("%02d", i);
                parkingSlotRepository.save(new ParkingSlot(null, code, VehicleType.FOUR_WHEELER, SlotStatus.AVAILABLE));
            }

            // 10 Truck slots: C51 to C60
            for (int i = 51; i <= 60; i++) {
                parkingSlotRepository.save(new ParkingSlot(null, "C" + i, VehicleType.TRUCK, SlotStatus.AVAILABLE));
            }

            // 30 Bus slots: B01 to B30
            for (int i = 1; i <= 30; i++) {
                parkingSlotRepository.save(new ParkingSlot(null, "B" + String.format("%02d", i), VehicleType.BUS, SlotStatus.AVAILABLE));
            }
            System.out.println("Default 100 parking slots initialized.");

            // Seed sample active & historical parked vehicles
            ParkingSlot slotA01 = parkingSlotRepository.findBySlotNumber("A01").orElse(null);
            ParkingSlot slotA02 = parkingSlotRepository.findBySlotNumber("A02").orElse(null);
            ParkingSlot slotA03 = parkingSlotRepository.findBySlotNumber("A03").orElse(null);

            if (slotA01 != null && slotA02 != null) {
                // Active vehicle 1
                Vehicle v1 = vehicleRepository.save(new Vehicle(null, "TN 49 AS 6179", VehicleType.TWO_WHEELER, "SANTHEESH S", "7012050137"));
                slotA01.setStatus(SlotStatus.OCCUPIED);
                parkingSlotRepository.save(slotA01);
                ParkingRecord r1 = new ParkingRecord();
                r1.setVehicle(v1);
                r1.setParkingSlot(slotA01);
                r1.setEntryTime(LocalDateTime.now().minusHours(2));
                r1.setPaymentStatus(PaymentStatus.PENDING);
                parkingRecordRepository.save(r1);

                // Active vehicle 2
                Vehicle v2 = vehicleRepository.save(new Vehicle(null, "TN02AF1456", VehicleType.TWO_WHEELER, "thikish", "1234567890"));
                slotA02.setStatus(SlotStatus.OCCUPIED);
                parkingSlotRepository.save(slotA02);
                ParkingRecord r2 = new ParkingRecord();
                r2.setVehicle(v2);
                r2.setParkingSlot(slotA02);
                r2.setEntryTime(LocalDateTime.now().minusHours(3));
                r2.setPaymentStatus(PaymentStatus.PENDING);
                parkingRecordRepository.save(r2);

                // Sample Exited vehicle (history)
                if (slotA03 != null) {
                    Vehicle v3 = vehicleRepository.save(new Vehicle(null, "TN 49 AC 6158", VehicleType.TWO_WHEELER, "SANTHEESH S", "7012050137"));
                    ParkingRecord r3 = new ParkingRecord();
                    r3.setVehicle(v3);
                    r3.setParkingSlot(slotA03);
                    r3.setEntryTime(LocalDateTime.now().minusDays(1));
                    r3.setExitTime(LocalDateTime.now().minusDays(1).plusHours(2));
                    r3.setDurationMinutes(120L);
                    r3.setTotalAmount(30.0);
                    r3.setPaymentStatus(PaymentStatus.COMPLETED);
                    r3.setPaymentMethod(PaymentMethod.UPI);
                    r3.setTransactionId("UPI-982184910281");
                    r3.setPaymentReference("UPI RRN: 982184910281 (GPAY)");
                    parkingRecordRepository.save(r3);
                }
            }
        }
    }
}
