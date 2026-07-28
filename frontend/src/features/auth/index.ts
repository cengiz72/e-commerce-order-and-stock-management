/**
 * `features/auth` — the login/register screens for the public auth routes (A10).
 *
 * Not one of the four features named in CLAUDE.md's Architecture Map, because that map lists
 * the *shopping* features; A10 still requires login/register routes, and their pages belong
 * beside the other features rather than inside the cross-cutting `routes/` folder.
 *
 * Session state itself lives in `hooks/auth` and the login call in `services/userService` —
 * this folder holds UI only.
 */
export { LoginPage } from './LoginPage'
export { RegisterPage } from './RegisterPage'
