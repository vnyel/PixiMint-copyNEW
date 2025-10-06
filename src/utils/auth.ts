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
    showSuccess("Registration successful! Please log in with your username and password.");
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