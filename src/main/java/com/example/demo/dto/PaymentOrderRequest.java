package com.example.demo.dto;

import lombok.Data;

@Data
public class PaymentOrderRequest {
    private String regNumber;
    private Double amount;
}
