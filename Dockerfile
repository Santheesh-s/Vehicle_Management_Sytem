# ==========================================
# Multi-Stage Dockerfile for Render Deployment
# Stage 1: Build React SPA Frontend
# Stage 2: Build Spring Boot Application JAR
# Stage 3: Minimal Eclipse Temurin 21 JRE Runtime
# ==========================================

# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm install

# Build static bundle
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build Spring Boot JAR ---
FROM maven:3.9.9-eclipse-temurin-21-alpine AS backend-builder
WORKDIR /app

# Cache Maven dependencies
COPY pom.xml ./
RUN mvn dependency:go-offline -B

# Copy backend source code
COPY src ./src

# Inject compiled React assets into Spring Boot's static resources
COPY --from=frontend-builder /app/src/main/resources/static ./src/main/resources/static

# Package production executable JAR without running tests during image build
RUN mvn clean package -DskipTests

# --- Stage 3: Production Runtime ---
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Install curl for Render service health checks
RUN apk add --no-cache curl

# Run as non-root user for security best practices
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy JAR from backend-builder
COPY --from=backend-builder /app/target/*.jar app.jar

# Render assigns dynamic $PORT (default 5000 for local runs)
ENV PORT=5000
EXPOSE 5000

# Launch application with memory limits and dynamic port binding
ENTRYPOINT ["sh", "-c", "java -Djava.security.egd=file:/dev/./urandom -Dserver.port=${PORT} -jar app.jar"]
