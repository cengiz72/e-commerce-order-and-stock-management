package com.ecommerce.user.controller;

import com.ecommerce.user.dto.RegisterRequest;
import com.ecommerce.user.dto.RegisterResponse;
import com.ecommerce.user.service.UserService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Public authentication endpoints. */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    /**
     * Registers a new customer account.
     *
     * <p>Returns 400 on invalid input (Bean Validation), 409 if the email is
     * already registered.
     */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterResponse register(@Valid @RequestBody RegisterRequest request) {
        UUID id = userService.register(request);
        return new RegisterResponse(id);
    }
}
