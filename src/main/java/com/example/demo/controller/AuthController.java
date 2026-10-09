package com.example.demo.controller;

import com.example.demo.dto.*;
import com.example.demo.entity.User;
import com.example.demo.service.AuthService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ApiResponse<User> register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public ApiResponse<User> getCurrentUser(@RequestParam(required = false, defaultValue = "admin") String username) {
        return authService.getUser(username);
    }

    @PostMapping("/change-password")
    public ApiResponse<String> changePassword(@RequestBody ChangePasswordRequest request) {
        return authService.changePassword(request);
    }

    @PostMapping("/request-otp")
    public ApiResponse<String> requestOtp(@RequestBody OtpRequest request) {
        return authService.requestOtp(request.getTarget());
    }

    @PostMapping("/verify-otp")
    public ApiResponse<String> verifyOtp(@RequestBody VerifyOtpRequest request) {
        return authService.verifyOtp(request);
    }

    @GetMapping("/users")
    public ApiResponse<java.util.List<User>> getAllUsers() {
        return ApiResponse.ok("All users retrieved", authService.getAllUsers());
    }

    @PostMapping("/users/{id}/toggle-status")
    public ApiResponse<User> toggleUserStatus(@PathVariable Long id) {
        return authService.toggleUserStatus(id);
    }

    @DeleteMapping("/users/{id}")
    public ApiResponse<String> deleteUser(@PathVariable Long id) {
        return authService.deleteUser(id);
    }
}
