import { supabase } from './supabaseClient'

// ── Sign Up with email + password ──
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })
  return { data, error }
}

// ── Sign In with email + password ──
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

// ── Sign Out ──
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// ── Get current session ──
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  return { session: data.session, error }
}

// ── Get current user ──
export async function getUser() {
  const { data, error } = await supabase.auth.getUser()
  return { user: data.user, error }
}

// ── Forgot password – send reset email ──
export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  return { data, error }
}

// ── Update password (called after clicking the reset link) ──
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  return { data, error }
}

// ── Google OAuth login ──
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  })
  return { data, error }
}
