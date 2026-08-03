package com.ecommerce.user.repository;

import com.ecommerce.user.entity.User;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Data access for {@link User}.
 *
 * <p>Email lookups are case-insensitive to match the {@code LOWER(email)} unique
 * index on the {@code users} table.
 */
public interface UserRepository extends JpaRepository<User, UUID> {

    boolean existsByEmailIgnoreCase(String email);
}
