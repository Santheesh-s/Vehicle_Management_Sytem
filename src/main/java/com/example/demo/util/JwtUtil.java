package com.example.demo.util;

import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Basic-level JWT Utility.
 * Generates and validates standard HMAC-SHA256 (HS256) JSON Web Tokens.
 * Ideal for college viva & placement interviews:
 * Demonstrates standard JWT structure (Header.Payload.Signature) with zero external dependency bloat.
 */
@Component
public class JwtUtil {

    // 256-bit signing key for HMAC-SHA256
    private static final String SECRET_KEY = "ParkSys_Vehicle_Management_Secret_JWT_Key_2026_SecureKey";
    
    // 24 hour token validity
    private static final long EXPIRATION_TIME_MS = 24 * 60 * 60 * 1000;

    /**
     * Generates a signed JWT token containing email, role, and expiration.
     */
    public String generateToken(String email, String role) {
        long now = System.currentTimeMillis();
        long exp = now + EXPIRATION_TIME_MS;

        // 1. Header (Base64Url encoded)
        String header = Base64.getUrlEncoder().withoutPadding().encodeToString(
                "{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8)
        );

        // 2. Payload Claims (Subject, Role, IssuedAt, Expiration)
        String payloadJson = String.format(
                "{\"sub\":\"%s\",\"role\":\"%s\",\"iat\":%d,\"exp\":%d}",
                email, role, now / 1000, exp / 1000
        );
        String payload = Base64.getUrlEncoder().withoutPadding().encodeToString(
                payloadJson.getBytes(StandardCharsets.UTF_8)
        );

        // 3. Signature: HMAC-SHA256(header.payload, SECRET_KEY)
        String signature = hmacSha256(header + "." + payload, SECRET_KEY);

        // Complete JWT format: Header.Payload.Signature
        return header + "." + payload + "." + signature;
    }

    /**
     * Validates signature and checks if token is expired.
     */
    public boolean validateToken(String token) {
        try {
            if (token == null || token.isBlank()) return false;
            
            // Remove 'Bearer ' prefix if present
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }

            String[] parts = token.split("\\.");
            if (parts.length != 3) return false;

            String header = parts[0];
            String payload = parts[1];
            String signature = parts[2];

            // Verify signature
            String expectedSignature = hmacSha256(header + "." + payload, SECRET_KEY);
            if (!expectedSignature.equals(signature)) {
                return false;
            }

            // Verify expiration
            String payloadJson = new String(Base64.getUrlDecoder().decode(payload), StandardCharsets.UTF_8);
            if (payloadJson.contains("\"exp\":")) {
                int expIdx = payloadJson.indexOf("\"exp\":") + 6;
                int endIdx = payloadJson.indexOf("}", expIdx);
                if (endIdx == -1) endIdx = payloadJson.indexOf(",", expIdx);
                long exp = Long.parseLong(payloadJson.substring(expIdx, endIdx).trim());
                if ((System.currentTimeMillis() / 1000) > exp) {
                    return false; // Token expired
                }
            }

            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Extracts the subject (email) from token.
     */
    public String extractSubject(String token) {
        try {
            if (token.startsWith("Bearer ")) token = token.substring(7);
            String[] parts = token.split("\\.");
            if (parts.length < 2) return null;
            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            int subIdx = payloadJson.indexOf("\"sub\":\"") + 7;
            int endIdx = payloadJson.indexOf("\"", subIdx);
            return payloadJson.substring(subIdx, endIdx);
        } catch (Exception e) {
            return null;
        }
    }

    private String hmacSha256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate HMAC-SHA256", e);
        }
    }
}
