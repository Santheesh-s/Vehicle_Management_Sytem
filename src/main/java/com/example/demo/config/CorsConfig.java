package com.example.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

/**
 * Global Dynamic CORS Configuration
 * Binds dynamically to 'frontend.url' (and 'cors.allowed-origins') injected via
 * environment variables (e.g. FRONTEND_URL in Render or application.properties).
 * Supports Firebase Hosting domains, Render deployments, and local Vite dev servers.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${frontend.url:${cors.allowed-origins:http://localhost:5173,http://localhost:3000,https://*.web.app,https://*.firebaseapp.com}}")
    private String allowedOrigins;

    private List<String> parseOrigins() {
        if (allowedOrigins == null || allowedOrigins.isBlank()) {
            return List.of("*");
        }
        return Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> origins = parseOrigins();
        var mapping = registry.addMapping("/**")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD")
                .allowedHeaders("*")
                .exposedHeaders("Authorization", "Content-Type", "X-Total-Count")
                .allowCredentials(true)
                .maxAge(3600);

        if (origins.contains("*")) {
            mapping.allowedOriginPatterns("*");
        } else {
            mapping.allowedOriginPatterns(origins.toArray(new String[0]));
        }
    }

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = parseOrigins();
        if (origins.contains("*")) {
            config.addAllowedOriginPattern("*");
        } else {
            for (String origin : origins) {
                config.addAllowedOriginPattern(origin);
            }
        }
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization", "Content-Type", "X-Total-Count"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
