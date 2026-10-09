package com.example.demo.service;

import com.example.demo.dto.*;
import com.example.demo.entity.OtpRecord;
import com.example.demo.entity.User;
import com.example.demo.enums.UserRole;
import com.example.demo.repository.OtpRecordRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final OtpRecordRepository otpRecordRepository;
    private final NotificationService notificationService;
    private final com.example.demo.util.JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository,
                       OtpRecordRepository otpRecordRepository,
                       NotificationService notificationService,
                       com.example.demo.util.JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.otpRecordRepository = otpRecordRepository;
        this.notificationService = notificationService;
        this.jwtUtil = jwtUtil;
    }

    public ApiResponse<User> register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            return ApiResponse.error("Username already exists");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(request.getPassword()); // Stored directly for basic implementation
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setRole(request.getRole() != null ? request.getRole() : UserRole.CUSTOMER);
        user.setActive(true);

        User savedUser = userRepository.save(user);
        return ApiResponse.ok("User registered successfully", savedUser);
    }

    public ApiResponse<AuthResponse> login(LoginRequest request) {
        Optional<User> userOpt = Optional.empty();

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            userOpt = userRepository.findByEmail(request.getEmail().trim());
        }
        if (userOpt.isEmpty() && request.getUsername() != null && !request.getUsername().trim().isEmpty()) {
            userOpt = userRepository.findByUsername(request.getUsername().trim());
        }
        if (userOpt.isEmpty() && request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            userOpt = userRepository.findByUsername(request.getEmail().trim());
        }

        if (userOpt.isEmpty()) {
            return ApiResponse.error("User not found with provided credentials");
        }

        User user = userOpt.get();
        if (!user.getPassword().equals(request.getPassword())) {
            return ApiResponse.error("Invalid password");
        }

        if (!user.isActive()) {
            return ApiResponse.error("Account is disabled. Please contact administrator.");
        }

        String userIdentifier = (user.getEmail() != null && !user.getEmail().isBlank()) ? user.getEmail() : user.getUsername();
        String token = jwtUtil.generateToken(userIdentifier, user.getRole().name());

        return ApiResponse.ok("Login successful", new AuthResponse(token, user));
    }

    public ApiResponse<User> getUser(String username) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        return userOpt.map(user -> ApiResponse.ok("User profile retrieved", user))
                .orElseGet(() -> ApiResponse.error("User not found"));
    }

    public ApiResponse<String> changePassword(ChangePasswordRequest request) {
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());
        if (userOpt.isEmpty()) {
            return ApiResponse.error("User not found");
        }

        User user = userOpt.get();
        if (!user.getPassword().equals(request.getOldPassword())) {
            return ApiResponse.error("Incorrect old password");
        }

        user.setPassword(request.getNewPassword());
        userRepository.save(user);
        return ApiResponse.ok("Password changed successfully", "OK");
    }

    public ApiResponse<String> requestOtp(String target) {
        if (target == null || target.trim().isEmpty()) {
            return ApiResponse.error("Target email or phone is required");
        }

        // Generate 6-digit OTP
        String otpCode = String.valueOf(100000 + new Random().nextInt(900000));

        OtpRecord record = new OtpRecord();
        record.setTarget(target);
        record.setOtpCode(otpCode);
        record.setExpiryTime(LocalDateTime.now().plusMinutes(5));
        record.setVerified(false);

        otpRecordRepository.save(record);

        // Dispatch OTP via Email or SMS based on target format
        String msg = "Your ParkSys verification OTP code is: " + otpCode + ". This code is valid for 5 minutes.";
        notificationService.notifyTarget(target, "ParkSys - Verification OTP Code", msg);

        return ApiResponse.ok("OTP sent successfully to " + target + ". Code: " + otpCode, otpCode);
    }

    public ApiResponse<String> verifyOtp(VerifyOtpRequest request) {
        Optional<OtpRecord> otpOpt = otpRecordRepository.findTopByTargetOrderByIdDesc(request.getTarget());
        if (otpOpt.isEmpty()) {
            return ApiResponse.error("No OTP request found for this target");
        }

        OtpRecord record = otpOpt.get();
        if (record.isVerified()) {
            return ApiResponse.error("OTP already used");
        }

        if (record.getExpiryTime().isBefore(LocalDateTime.now())) {
            return ApiResponse.error("OTP has expired");
        }

        if (!record.getOtpCode().equals(request.getOtpCode())) {
            return ApiResponse.error("Invalid OTP code");
        }

        record.setVerified(true);
        otpRecordRepository.save(record);

        // If newPassword provided, reset for the user with matching email or phone
        if (request.getNewPassword() != null && !request.getNewPassword().isEmpty()) {
            Optional<User> userByEmail = userRepository.findByEmail(request.getTarget());
            Optional<User> userByPhone = userRepository.findByPhone(request.getTarget());

            User user = userByEmail.or(() -> userByPhone).orElse(null);
            if (user != null) {
                user.setPassword(request.getNewPassword());
                userRepository.save(user);
                return ApiResponse.ok("OTP verified and password reset successfully", "OK");
            }
        }

        return ApiResponse.ok("OTP verified successfully", "OK");
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public ApiResponse<User> toggleUserStatus(Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ApiResponse.error("User not found");
        }
        User user = userOpt.get();
        user.setActive(!user.isActive());
        User saved = userRepository.save(user);
        return ApiResponse.ok("User status updated to " + (saved.isActive() ? "ACTIVE" : "INACTIVE"), saved);
    }

    public ApiResponse<String> deleteUser(Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ApiResponse.error("User not found");
        }
        User user = userOpt.get();
        if ("admin".equalsIgnoreCase(user.getUsername())) {
            return ApiResponse.error("Super Admin account cannot be deleted");
        }
        userRepository.deleteById(userId);
        return ApiResponse.ok("User '" + user.getUsername() + "' deleted successfully", "DELETED");
    }
}
