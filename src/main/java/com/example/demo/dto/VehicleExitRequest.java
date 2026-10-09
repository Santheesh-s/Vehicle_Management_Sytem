package com.example.demo.dto;

import com.example.demo.enums.PaymentMethod;
import lombok.Data;

@Data
public class VehicleExitRequest {
    private String regNumber;
    private PaymentMethod paymentMethod = PaymentMethod.CASH;
    private String transactionId;
    private String paymentReference;
}
