package com.ecommerce.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Registration request body for {@code POST /api/v1/auth/register}.
 *
 * <p>There is deliberately no {@code role} field: the role is forced to
 * {@code CUSTOMER} server-side and cannot be influenced by the client.
 */
@Getter
@Setter
public class RegisterRequest {

    @NotBlank
    @Email
    @Size(max = 320)
    private String email;

    /** Raw password; hashed with BCrypt before it is persisted, never stored as-is. */
    @NotBlank
    @Size(min = 8, max = 72)
    private String password;

    @Size(max = 100)
    private String displayName;
}
