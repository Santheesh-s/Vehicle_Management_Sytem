package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:arvilightss@gmail.com}")
    private String fromEmail;

    public NotificationService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Sends an email via Gmail SMTP.
     * Returns true if sent successfully, or false with console fallback.
     */
    public boolean sendEmail(String toEmail, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);
            System.out.println("[EMAIL SUCCESS] Sent email to " + toEmail + " with subject: " + subject);
            return true;
        } catch (Exception e) {
            System.err.println("[EMAIL NOTIFICATION WARN] Could not dispatch email via SMTP to " + toEmail + ": " + e.getMessage());
            System.out.println("[EMAIL CONSOLE FALLBACK]\nTo: " + toEmail + "\nSubject: " + subject + "\n" + body);
            return false;
        }
    }

    /**
     * Sends an SMS notification (logged to system output without third-party charges).
     */
    public boolean sendSms(String toPhoneNumber, String messageBody) {
        String cleanPhone = toPhoneNumber.replaceAll("[^0-9+]", "");
        if (!cleanPhone.startsWith("+") && cleanPhone.length() == 10) {
            cleanPhone = "+91" + cleanPhone;
        }
        System.out.println("[SMS NOTIFICATION] To: " + cleanPhone + " | Message: " + messageBody);
        return true;
    }

    /**
     * Intelligent dispatch: routes to Email or SMS based on the target format.
     */
    public void notifyTarget(String target, String subject, String message) {
        if (target != null && target.contains("@")) {
            sendEmail(target, subject, message);
        } else if (target != null && !target.isBlank()) {
            sendSms(target, message);
        }
    }
}
