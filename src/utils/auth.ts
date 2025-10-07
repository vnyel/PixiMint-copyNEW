import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

// Function to handle user registration
export const registerUser = async (username: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email: `${username}@piximint.com`, // Using a dummy email for Supabase auth
    password: password,
    options: {
      data: {
        username: username,
      },
    },
  });

  if (error) {
    showError(`Registration failed: ${error.message}`);
    return null;
  }

  if (data.user) {
    // After successful auth signup, create a profile entry with initial Pixi Tokens
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        username: username,
        pixi_tokens: 5, // Assign 5 Pixi Tokens to new users
      });

    if (profileError) {
      // If profile creation fails, log the error but still return the user
      // as the auth account was created. A manual fix might be needed for tokens.
      console.error("Failed to create user profile with initial Pixi Tokens:", profileError.message);
      showError(`Registration successful, but failed to assign initial Pixi Tokens: ${profileError.message}`);
      return data.user;
    }

    showSuccess("Registration successful! You have 5 Pixi Tokens. Please log in with your username and password.");
    return data.user;
  }
  return null;
};

// Function to handle user login
export const loginUser = async (username: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${username}@piximint.com`,
    password: password,
  });

  if (error) {
    showError(`Login failed: ${error.message}`);
    return null;
  }

  if (data.user) {
    showSuccess("Logged in successfully!");
    return data.user;
  }
  return null;
};

export const logoutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    showError(`Logout failed: ${error.message}`);
  } else {
    showSuccess("Logged out successfully!");
  }
};