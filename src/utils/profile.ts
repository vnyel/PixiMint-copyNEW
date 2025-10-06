import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

export const followUser = async (followerId: string, followedId: string) => {
  if (followerId === followedId) {
    showError("You cannot follow yourself.");
    return false;
  }
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, followed_id: followedId });

  if (error) {
    if (error.code === '23505') { // Unique violation code
      showError("You are already following this user.");
    } else {
      showError(`Failed to follow user: ${error.message}`);
    }
    return false;
  }
  showSuccess("User followed successfully!");
  return true;
};

export const unfollowUser = async (followerId: string, followedId: string) => {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('followed_id', followedId);

  if (error) {
    showError(`Failed to unfollow user: ${error.message}`);
    return false;
  }
  showSuccess("User unfollowed successfully!");
  return true;
};

export const isFollowing = async (followerId: string, followedId: string): Promise<boolean> => {
  if (followerId === followedId) return true; // A user is always "following" themselves in this context
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('followed_id', followedId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is expected for not following
    console.error("Error checking follow status:", error.message);
    return false;
  }
  return !!data;
};

export const getFollowCounts = async (userId: string): Promise<{ followers: number; following: number } | null> => {
  try {
    const { count: followersCount, error: followersError } = await supabase
      .from('follows')
      .select('id', { count: 'exact' })
      .eq('followed_id', userId);

    if (followersError) {
      showError(`Failed to fetch followers count: ${followersError.message}`);
      return null;
    }

    const { count: followingCount, error: followingError } = await supabase
      .from('follows')
      .select('id', { count: 'exact' })
      .eq('follower_id', userId);

    if (followingError) {
      showError(`Failed to fetch following count: ${followingError.message}`);
      return null;
    }

    return { followers: followersCount || 0, following: followingCount || 0 };
  } catch (error: any) {
    showError(`An unexpected error occurred while fetching follow counts: ${error.message}`);
    return null;
  }
};