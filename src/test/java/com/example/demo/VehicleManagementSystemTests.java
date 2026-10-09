package com.example.demo;

import com.example.demo.controller.AuthController;
import com.example.demo.controller.ConfigController;
import com.example.demo.controller.ParkingController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class VehicleManagementSystemTests {

    @Autowired
    private AuthController authController;

    @Autowired
    private ParkingController parkingController;

    @Autowired
    private ConfigController configController;

    @Autowired
    private com.example.demo.repository.UserRepository userRepository;

    @Autowired
    private com.example.demo.repository.VehicleRepository vehicleRepository;

    private MockMvc authMockMvc;
    private MockMvc parkingMockMvc;
    private MockMvc configMockMvc;

    @BeforeEach
    void setUp() {
        this.authMockMvc = MockMvcBuilders.standaloneSetup(authController).build();
        this.parkingMockMvc = MockMvcBuilders.standaloneSetup(parkingController).build();
        this.configMockMvc = MockMvcBuilders.standaloneSetup(configController).build();
    }

    @Test
    void testAllEndpoints() throws Exception {
        String testUser = "driver" + (System.currentTimeMillis() % 100000);
        String testReg = "KA" + (10 + (int)(Math.random() * 89)) + "MN" + (1000 + (int)(Math.random() * 8999));

        // 1. POST /api/auth/register
        authMockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {
                                    "username": "%s",
                                    "password": "pass123",
                                    "email": "%s@test.com",
                                    "phone": "9876543299",
                                    "role": "CUSTOMER"
                                }
                                """, testUser, testUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 2. POST /api/auth/login (Returns JWT token and user)
        authMockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {
                                    "username": "%s",
                                    "password": "pass123"
                                }
                                """, testUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").exists())
                .andExpect(jsonPath("$.data.user.username").value(testUser));

        // 3. GET /api/auth/me
        authMockMvc.perform(get("/api/auth/me?username=" + testUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value(testUser));

        // 4. POST /api/auth/change-password
        authMockMvc.perform(post("/api/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {
                                    "username": "%s",
                                    "oldPassword": "pass123",
                                    "newPassword": "newPass456"
                                }
                                """, testUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 5. POST /api/auth/request-otp
        authMockMvc.perform(post("/api/auth/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "target": "driver1@test.com"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 6. POST /api/config/rates
        configMockMvc.perform(post("/api/config/rates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "vehicleType": "TWO_WHEELER",
                                    "baseRate": 20.0,
                                    "hourlyRate": 10.0
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 7. GET /api/parking/slots
        parkingMockMvc.perform(get("/api/parking/slots"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 8. POST /api/parking/enter
        parkingMockMvc.perform(post("/api/parking/enter")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {
                                    "regNumber": "%s",
                                    "vehicleType": "TWO_WHEELER",
                                    "ownerName": "Alex",
                                    "ownerPhone": "9876543299"
                                }
                                """, testReg)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.parkingSlot.status").value("OCCUPIED"));

        // 9. GET /api/parking/vehicles
        parkingMockMvc.perform(get("/api/parking/vehicles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 10. POST /api/parking/exit
        parkingMockMvc.perform(post("/api/parking/exit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {
                                    "regNumber": "%s",
                                    "paymentMethod": "UPI"
                                }
                                """, testReg)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.paymentStatus").value("COMPLETED"));

        // 11. GET /api/parking/records
        parkingMockMvc.perform(get("/api/parking/records"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 12. GET /api/parking/stats
        parkingMockMvc.perform(get("/api/parking/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalSlots").isNumber());

        // 13. POST /api/parking/reports/daily
        parkingMockMvc.perform(post("/api/parking/reports/daily"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalRevenue").isNumber());
    }
}
