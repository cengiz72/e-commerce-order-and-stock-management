package com.ecommerce.user.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Field;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class RegisterRequestTest {

    /**
     * A registration request must not be able to carry a role: the field simply does
     * not exist on the DTO, which is what makes self-assigning ADMIN impossible.
     */
    @Test
    void requestDtoHasNoRoleField() {
        assertThat(Arrays.stream(RegisterRequest.class.getDeclaredFields())
                .map(Field::getName))
                .containsExactlyInAnyOrder("email", "password", "displayName");
    }
}
