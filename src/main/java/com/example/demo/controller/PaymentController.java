package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.PaymentOrderRequest;
import com.example.demo.dto.PaymentVerificationRequest;
import com.example.demo.entity.ParkingRecord;
import com.example.demo.service.PaymentService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/config")
    public ApiResponse<Map<String, Object>> getPaymentConfig() {
        return paymentService.getPaymentConfig();
    }

    @PostMapping("/create-order")
    public ApiResponse<Map<String, Object>> createOrder(@RequestBody PaymentOrderRequest request) {
        return paymentService.createOrder(request);
    }

    @PostMapping("/verify-payment")
    public ApiResponse<ParkingRecord> verifyPayment(@RequestBody PaymentVerificationRequest request) {
        return paymentService.verifyPayment(request);
    }
}
