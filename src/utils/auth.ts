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
    // After successful auth signup, update the profile entry with initial Pixi Tokens
    // A profile is often automatically created by a Supabase trigger, so we update instead of insert.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        username: username, // Ensure username is set/updated
        pixi_tokens: 5, // Assign 5 Pixi Tokens to new users
      })
      .eq('id', data.user.id); // Update the profile corresponding to the new user's ID

    if (profileError) {
      console.error("Failed to update user profile with initial Pixi Tokens:", profileError.message);
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