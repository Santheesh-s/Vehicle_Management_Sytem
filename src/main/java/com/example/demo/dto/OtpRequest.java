package com.example.demo.dto;

import lombok.Data;

@Data
public class OtpRequest {
    private String target; // email or phone number
}
