package com.example.demo.service;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.PaymentOrderRequest;
import com.example.demo.dto.PaymentVerificationRequest;
import com.example.demo.dto.VehicleExitRequest;
import com.example.demo.entity.ParkingRecord;
import com.example.demo.enums.PaymentMethod;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    @Value("${razorpay.key.id:rzp_test_placeholder}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret:placeholder_secret}")
    private String razorpayKeySecret;

    private final ParkingService parkingService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient;

    public PaymentService(ParkingService parkingService) {
        this.parkingService = parkingService;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isRealGatewayConfigured() {
        return razorpayKeyId != null
                && razorpayKeyId.startsWith("rzp_")
                && !razorpayKeyId.equalsIgnoreCase("rzp_test_placeholder")
                && razorpayKeySecret != null
                && !razorpayKeySecret.equalsIgnoreCase("placeholder_secret");
    }

    public ApiResponse<Map<String, Object>> getPaymentConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("keyId", razorpayKeyId);
        config.put("isLiveGateway", isRealGatewayConfigured());
        return ApiResponse.ok("Payment configuration", config);
    }

    public ApiResponse<Map<String, Object>> createOrder(PaymentOrderRequest request) {
        if (request.getRegNumber() == null || request.getRegNumber().trim().isEmpty()) {
            return ApiResponse.error("Vehicle plate number is required");
        }

        String regNum = request.getRegNumber().trim().toUpperCase();

        // Calculate or retrieve fare
        ApiResponse<Map<String, Object>> fareResponse = parkingService.calculateFare(regNum);
        double totalAmount = 20.0;
        if (fareResponse.isSuccess() && fareResponse.getData() != null && fareResponse.getData().get("totalAmount") != null) {
            totalAmount = ((Number) fareResponse.getData().get("totalAmount")).doubleValue();
        } else if (request.getAmount() != null && request.getAmount() > 0) {
            totalAmount = request.getAmount();
        }

        long amountInPaise = Math.round(totalAmount * 100);
        String receiptId = "rcpt_" + regNum.replaceAll("[^a-zA-Z0-9]", "") + "_" + (System.currentTimeMillis() % 100000);

        Map<String, Object> result = new HashMap<>();
        result.put("amount", amountInPaise);
        result.put("amountInRupees", totalAmount);
        result.put("currency", "INR");
        result.put("keyId", razorpayKeyId);
        result.put("regNumber", regNum);
        result.put("receipt", receiptId);

        if (isRealGatewayConfigured()) {
            try {
                Map<String, Object> payload = new HashMap<>();
                payload.put("amount", amountInPaise);
                payload.put("currency", "INR");
                payload.put("receipt", receiptId);
                payload.put("notes", Map.of("regNumber", regNum, "system", "ParkSys"));

                String jsonBody = objectMapper.writeValueAsString(payload);
                String auth = Base64.getEncoder().encodeToString((razorpayKeyId + ":" + razorpayKeySecret).getBytes(StandardCharsets.UTF_8));

                HttpRequest httpRequest = HttpRequest.newBuilder()
                        .uri(URI.create("https://api.razorpay.com/v1/orders"))
                        .header("Authorization", "Basic " + auth)
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                        .build();

                HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200 || response.statusCode() == 201) {
                    JsonNode node = objectMapper.readTree(response.body());
                    String orderId = node.get("id").asText();
                    result.put("orderId", orderId);
                    result.put("isSandbox", false);
                    log.info("Razorpay Order created: {} for vehicle {}", orderId, regNum);
                    return ApiResponse.ok("Razorpay Order created successfully", result);
                } else {
                    log.warn("Razorpay API error ({}), falling back to Sandbox simulation: {}", response.statusCode(), response.body());
                }
            } catch (Exception ex) {
                log.error("Failed to connect to Razorpay API, falling back to Sandbox simulator: {}", ex.getMessage());
            }
        }

        // Sandbox / Simulator mode fallback
        String mockOrderId = "order_sim_" + System.currentTimeMillis();
        result.put("orderId", mockOrderId);
        result.put("isSandbox", true);
        return ApiResponse.ok("Sandbox Payment Order created successfully", result);
    }

    public ApiResponse<ParkingRecord> verifyPayment(PaymentVerificationRequest request) {
        if (request.getRegNumber() == null || request.getRegNumber().trim().isEmpty()) {
            return ApiResponse.error("Registration plate number is required");
        }
        if (request.getRazorpayOrderId() == null || request.getRazorpayOrderId().trim().isEmpty()) {
            return ApiResponse.error("Razorpay Order ID is required");
        }
        if (request.getRazorpayPaymentId() == null || request.getRazorpayPaymentId().trim().isEmpty()) {
            return ApiResponse.error("Razorpay Payment ID is required");
        }

        String orderId = request.getRazorpayOrderId().trim();
        String paymentId = request.getRazorpayPaymentId().trim();
        String signature = request.getRazorpaySignature() != null ? request.getRazorpaySignature().trim() : "";

        boolean isMockOrder = orderId.startsWith("order_sim_");

        if (!isMockOrder && isRealGatewayConfigured()) {
            try {
                String payload = orderId + "|" + paymentId;
                Mac mac = Mac.getInstance("HmacSHA256");
                mac.init(new SecretKeySpec(razorpayKeySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
                byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
                String expectedSignature = HexFormat.of().formatHex(hash);

                if (!expectedSignature.equalsIgnoreCase(signature)) {
                    log.warn("Cryptographic signature mismatch! Expected: {}, Received: {}", expectedSignature, signature);
                    return ApiResponse.error("Security verification failed: Invalid transaction signature.");
                }
            } catch (Exception e) {
                log.error("Error computing signature verification: {}", e.getMessage());
                return ApiResponse.error("Cryptographic verification error: " + e.getMessage());
            }
        }

        // Auto-finalize parking record check-out
        VehicleExitRequest exitRequest = new VehicleExitRequest();
        exitRequest.setRegNumber(request.getRegNumber().trim().toUpperCase());
        exitRequest.setPaymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : PaymentMethod.UPI);
        exitRequest.setTransactionId(paymentId);
        exitRequest.setPaymentReference("Razorpay Auto-Verified (Ref: " + paymentId + ", Order: " + orderId + ")");

        log.info("Payment auto-verified for vehicle {}. Finalizing exit record...", request.getRegNumber());
        return parkingService.exitVehicle(exitRequest);
    }
}
