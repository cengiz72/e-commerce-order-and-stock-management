package com.ecommerce.user.entity;

/**
 * Account role, persisted as a string in {@code users.role}.
 *
 * <p>Registration always creates {@link #CUSTOMER}; {@link #ADMIN} is never
 * self-assignable through a public endpoint.
 */
public enum Role {
    CUSTOMER,
    ADMIN
}
