package com.example.demo.dto;

import com.example.demo.enums.PaymentMethod;
import lombok.Data;

@Data
public class PaymentVerificationRequest {
    private String regNumber;
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String razorpaySignature;
    private PaymentMethod paymentMethod = PaymentMethod.UPI;
}
