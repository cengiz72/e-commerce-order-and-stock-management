package com.ecommerce.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ecommerce.user.dto.RegisterRequest;
import com.ecommerce.user.entity.Role;
import com.ecommerce.user.entity.User;
import com.ecommerce.user.exception.EmailAlreadyExistsException;
import com.ecommerce.user.repository.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, passwordEncoder);
    }

    private RegisterRequest request(String email, String password, String displayName) {
        RegisterRequest request = new RegisterRequest();
        request.setEmail(email);
        request.setPassword(password);
        request.setDisplayName(displayName);
        return request;
    }

    @Test
    void registerPersistsCustomerWithHashedPassword() {
        UUID id = UUID.randomUUID();
        when(userRepository.existsByEmailIgnoreCase("foo@bar.com")).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(id);
            return saved;
        });

        UUID result = userService.register(request("foo@bar.com", "s3cretpass", "Foo"));

        assertThat(result).isEqualTo(id);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(captor.capture());
        User saved = captor.getValue();

        assertThat(saved.getEmail()).isEqualTo("foo@bar.com");
        assertThat(saved.getDisplayName()).isEqualTo("Foo");
        assertThat(saved.getRole()).isEqualTo(Role.CUSTOMER);
        assertThat(saved.isEnabled()).isTrue();
        assertThat(saved.getPasswordHash()).isNotEqualTo("s3cretpass");
        assertThat(saved.getPasswordHash()).startsWith("$2");
        assertThat(passwordEncoder.matches("s3cretpass", saved.getPasswordHash())).isTrue();
    }

    @Test
    void registerForcesCustomerRoleEvenWhenAdminIsDesired() {
        // The request DTO has no role field at all, so ADMIN is unreachable from the
        // outside; the service pins the role regardless.
        when(userRepository.existsByEmailIgnoreCase(any())).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        userService.register(request("admin-wannabe@bar.com", "s3cretpass", null));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getRole()).isEqualTo(Role.CUSTOMER);
    }

    @Test
    void registerRejectsExistingEmailCaseInsensitively() {
        when(userRepository.existsByEmailIgnoreCase("Foo@Bar.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.register(request("Foo@Bar.com", "s3cretpass", null)))
                .isInstanceOf(EmailAlreadyExistsException.class);

        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void registerTranslatesUniqueViolationToConflict() {
        when(userRepository.existsByEmailIgnoreCase(any())).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("ux_users_email_lower"));

        assertThatThrownBy(() -> userService.register(request("race@bar.com", "s3cretpass", null)))
                .isInstanceOf(EmailAlreadyExistsException.class);
    }

    @Test
    void registerTrimsEmailAndNullsBlankDisplayName() {
        when(userRepository.existsByEmailIgnoreCase("spaced@bar.com")).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        userService.register(request("  spaced@bar.com  ", "s3cretpass", "   "));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo("spaced@bar.com");
        assertThat(captor.getValue().getDisplayName()).isNull();
    }
}
