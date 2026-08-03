package com.ecommerce.user;

import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Test-only Spring Boot configuration.
 *
 * <p>user-service is a library module with no application class of its own (it boots
 * as part of {@code backend/app}), but Spring Boot test slices such as
 * {@code @WebMvcTest} need a {@code @SpringBootConfiguration} to anchor on. This class
 * exists in test sources only and is never packaged.
 */
@SpringBootApplication
public class UserServiceTestApplication {
}
