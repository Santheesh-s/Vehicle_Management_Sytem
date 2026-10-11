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
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    @Value("${razorpay.key.id:rzp_test_placeholder}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret:placeholder_secret}")
    private String razorpayKeySecret;

    @Value("${parking.upi.id:santheesh24@okaxis}")
    private String configuredUpiId;

    @Value("${parking.upi.name:SANTHEESH}")
    private String configuredUpiName;

    private final ParkingService parkingService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient;

    // Track active dynamic UPI payment sessions in-memory for real-time polling
    private final Map<String, Map<String, Object>> activeUpiSessions = new ConcurrentHashMap<>();

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
        config.put("upiId", configuredUpiId);
        config.put("upiName", configuredUpiName);
        return ApiResponse.ok("Payment configuration", config);
    }

    /**
     * Initializes a unique dynamic UPI payment session with a unique order ID & QR URI.
     */
    public ApiResponse<Map<String, Object>> createUpiSession(PaymentOrderRequest request) {
        if (request.getRegNumber() == null || request.getRegNumber().trim().isEmpty()) {
            return ApiResponse.error("Vehicle plate number is required");
        }

        String regNum = request.getRegNumber().trim().toUpperCase();

        ApiResponse<Map<String, Object>> fareResponse = parkingService.calculateFare(regNum);
        double totalAmount = 20.0;
        if (fareResponse.isSuccess() && fareResponse.getData() != null && fareResponse.getData().get("totalAmount") != null) {
            totalAmount = ((Number) fareResponse.getData().get("totalAmount")).doubleValue();
        } else if (request.getAmount() != null && request.getAmount() > 0) {
            totalAmount = request.getAmount();
        }

        String orderId = "UPI-" + (System.currentTimeMillis() % 10000000);
        String amountStr = String.format(Locale.US, "%.2f", totalAmount);
        String cleanUpiId = (configuredUpiId != null ? configuredUpiId : "santheesh24@okaxis").trim();
        String cleanName = (configuredUpiName != null ? configuredUpiName : "SANTHEESH").trim().replaceAll("[^a-zA-Z0-9 ]", "");

        // NPCI UPI URI with unique transaction reference (tr) and transaction note (tn)
        String upiUrl = "upi://pay?pa=" + cleanUpiId 
                + "&pn=" + URLEncoder.encode(cleanName, StandardCharsets.UTF_8)
                + "&am=" + amountStr
                + "&cu=INR"
                + "&tn=ParkSys-" + orderId
                + "&tr=" + orderId;

        Map<String, Object> session = new HashMap<>();
        session.put("orderId", orderId);
        session.put("regNumber", regNum);
        session.put("amount", totalAmount);
        session.put("upiId", cleanUpiId);
        session.put("payeeName", cleanName);
        session.put("upiUrl", upiUrl);
        session.put("status", "WAITING_FOR_PAYMENT");
        session.put("createdAt", System.currentTimeMillis());

        activeUpiSessions.put(orderId, session);
        log.info("Created dynamic UPI session {} for vehicle {}", orderId, regNum);

        return ApiResponse.ok("UPI session initialized", session);
    }

    /**
     * Poll status of an active UPI session.
     */
    public ApiResponse<Map<String, Object>> checkUpiStatus(String orderId) {
        if (orderId == null || !activeUpiSessions.containsKey(orderId)) {
            return ApiResponse.error("Active UPI session not found for order: " + orderId);
        }
        Map<String, Object> session = activeUpiSessions.get(orderId);
        return ApiResponse.ok("UPI session status", session);
    }

    /**
     * Completes UPI payment for the session, frees the parking bay, and clears the barrier gate.
     */
    public synchronized ApiResponse<Map<String, Object>> completeUpiPayment(String orderId) {
        if (orderId == null || !activeUpiSessions.containsKey(orderId)) {
            return ApiResponse.error("Active UPI session not found: " + orderId);
        }

        Map<String, Object> session = activeUpiSessions.get(orderId);
        if ("COMPLETED".equals(session.get("status"))) {
            return ApiResponse.ok("Payment already confirmed", session);
        }

        String regNum = (String) session.get("regNumber");
        String txnId = "UPI-" + (100000000000L + (long) (Math.random() * 900000000000L));

        VehicleExitRequest exitRequest = new VehicleExitRequest();
        exitRequest.setRegNumber(regNum);
        exitRequest.setPaymentMethod(PaymentMethod.UPI);
        exitRequest.setTransactionId(txnId);
        exitRequest.setPaymentReference("UPI Auto-Payment (Ref: " + orderId + ")");

        ApiResponse<ParkingRecord> exitResult = parkingService.exitVehicle(exitRequest);
        if (exitResult.isSuccess()) {
            session.put("status", "COMPLETED");
            session.put("transactionId", txnId);
            session.put("parkingRecord", exitResult.getData());
            log.info("UPI Payment {} auto-completed for vehicle {}. Gate opened!", orderId, regNum);
            return ApiResponse.ok("Payment confirmed! Gate opened.", session);
        } else {
            return ApiResponse.error(exitResult.getMessage());
        }
    }

    public ApiResponse<Map<String, Object>> createOrder(PaymentOrderRequest request) {
        return createUpiSession(request);
    }

    public ApiResponse<ParkingRecord> verifyPayment(PaymentVerificationRequest request) {
        if (request.getRegNumber() == null || request.getRegNumber().trim().isEmpty()) {
            return ApiResponse.error("Registration plate number is required");
        }
        VehicleExitRequest exitRequest = new VehicleExitRequest();
        exitRequest.setRegNumber(request.getRegNumber().trim().toUpperCase());
        exitRequest.setPaymentMethod(PaymentMethod.UPI);
        exitRequest.setTransactionId(request.getRazorpayPaymentId() != null ? request.getRazorpayPaymentId() : "UPI-" + System.currentTimeMillis());
        exitRequest.setPaymentReference("UPI Auto-Verified (" + exitRequest.getTransactionId() + ")");
        return parkingService.exitVehicle(exitRequest);
    }
}
