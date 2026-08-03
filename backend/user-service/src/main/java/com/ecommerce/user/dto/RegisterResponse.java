package com.ecommerce.user.dto;

import java.util.UUID;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Registration response body. Exposes the created user's id only — never the
 * password or its hash.
 */
@Getter
@RequiredArgsConstructor
public class RegisterResponse {

    private final UUID id;
}
