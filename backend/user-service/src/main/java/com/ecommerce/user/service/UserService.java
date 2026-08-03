package com.ecommerce.user.service;

import com.ecommerce.user.dto.RegisterRequest;
import com.ecommerce.user.entity.Role;
import com.ecommerce.user.entity.User;
import com.ecommerce.user.exception.EmailAlreadyExistsException;
import com.ecommerce.user.repository.UserRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * User account operations. Owns the registration rules: case-insensitive email
 * uniqueness, password hashing, and the server-side role assignment.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Registers a new customer account.
     *
     * @return the id of the created user
     * @throws EmailAlreadyExistsException if the email is already taken (case-insensitive)
     */
    @Transactional
    public UUID register(RegisterRequest request) {
        String email = request.getEmail().trim();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new EmailAlreadyExistsException();
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setDisplayName(normalizeDisplayName(request.getDisplayName()));
        // Role is always CUSTOMER: it is never taken from the request.
        user.setRole(Role.CUSTOMER);
        user.setEnabled(true);

        try {
            return userRepository.saveAndFlush(user).getId();
        } catch (DataIntegrityViolationException ex) {
            // Two concurrent registrations for the same email: the LOWER(email)
            // unique index is the authoritative check.
            throw new EmailAlreadyExistsException();
        }
    }

    private String normalizeDisplayName(String displayName) {
        if (displayName == null) {
            return null;
        }
        String trimmed = displayName.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
