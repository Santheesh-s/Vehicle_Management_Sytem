package com.example.demo.dto;

import com.example.demo.enums.UserRole;
import lombok.Data;

@Data
public class RegisterRequest {
    private String username;
    private String password;
    private String email;
    private String phone;
    private UserRole role; // Optional: defaults to CUSTOMER if not provided
}
