package com.example.demo.dto;

import lombok.Data;

@Data
public class VerifyOtpRequest {
    private String target; // email or phone
    private String otpCode;
    private String newPassword; // Optional: set new password if resetting
}
