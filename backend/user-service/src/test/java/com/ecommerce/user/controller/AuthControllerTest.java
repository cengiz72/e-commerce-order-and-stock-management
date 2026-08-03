package com.ecommerce.user.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ecommerce.user.config.SecurityConfig;
import com.ecommerce.user.dto.RegisterRequest;
import com.ecommerce.user.exception.EmailAlreadyExistsException;
import com.ecommerce.user.service.UserService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @Test
    void registerReturns201WithCreatedId() throws Exception {
        UUID id = UUID.fromString("11111111-2222-3333-4444-555555555555");
        when(userService.register(any(RegisterRequest.class))).thenReturn(id);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"foo@bar.com","password":"s3cretpass","displayName":"Foo"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void registerReturns409OnDuplicateEmail() throws Exception {
        when(userService.register(any(RegisterRequest.class)))
                .thenThrow(new EmailAlreadyExistsException());

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"foo@bar.com","password":"s3cretpass"}"""))
                .andExpect(status().isConflict());
    }

    @Test
    void registerReturns400OnInvalidEmail() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"not-an-email","password":"s3cretpass"}"""))
                .andExpect(status().isBadRequest());

        verify(userService, never()).register(any(RegisterRequest.class));
    }

    @Test
    void registerReturns400OnBlankPassword() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"foo@bar.com","password":"   "}"""))
                .andExpect(status().isBadRequest());

        verify(userService, never()).register(any(RegisterRequest.class));
    }

    @Test
    void registerReturns400OnMissingPassword() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"foo@bar.com"}"""))
                .andExpect(status().isBadRequest());

        verify(userService, never()).register(any(RegisterRequest.class));
    }

    @Test
    void registerReturns400OnTooShortPassword() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"foo@bar.com","password":"short"}"""))
                .andExpect(status().isBadRequest());

        verify(userService, never()).register(any(RegisterRequest.class));
    }
}
