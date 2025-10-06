import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Profile } from "@/types/nft";
import { Link } from "react-router-dom";
import VerifiedBadge from "@/components/VerifiedBadge"; // Import VerifiedBadge

interface FollowsListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
}

const FollowsListDialog = ({ isOpen, onClose, userId, type }: FollowsListDialogProps) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchFollows = async () => {
      setLoading(true);
      setUsers([]); // Clear previous list
      try {
        let query;
        if (type === 'followers') {
          query = supabase
            .from('follows')
            .select('follower_id')
            .eq('followed_id', userId);
        } else { // type === 'following'
          query = supabase
            .from('follows')
            .select('followed_id')
            .eq('follower_id', userId);
        }

        const { data: followsData, error: followsError } = await query;

        if (followsError) {
          showError(`Failed to fetch ${type}: ${followsError.message}`);
          setLoading(false);
          return;
        }

        const userIds = followsData.map(item => type === 'followers' ? item.follower_id : item.followed_id);

        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, is_verified') // Fetch is_verified
            .in('id', userIds);

          if (profilesError) {
            showError(`Failed to fetch profiles: ${profilesError.message}`);
            setLoading(false);
            return;
          }
          setUsers(profilesData as Profile[]);
        }
      } catch (error: any) {
        showError(`An unexpected error occurred: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchFollows();
  }, [isOpen, userId, type]);

  const dialogTitle = type === 'followers' ? 'Followers' : 'Following';
  const dialogDescription = type === 'followers' ? 'Users who follow this profile.' : 'Users this profile is following.';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border border-border rounded-lg shadow-lg font-sans">
        <DialogHeader>
          <DialogTitle className="text-2xl font-pixel text-primary">{dialogTitle}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground">No {type} found.</p>
          ) : (
            <div className="space-y-4">
              {users.map(userProfile => (
                <Link to={`/profile/${userProfile.username}`} key={userProfile.id} onClick={onClose} className="flex items-center gap-3 p-2 hover:bg-accent/50 rounded-md transition-colors">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={userProfile.avatar_url || undefined} alt={`${userProfile.username}'s avatar`} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <UserIcon className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-sans text-foreground font-medium text-lg flex items-center gap-1">
                    @{userProfile.username}
                    {userProfile.is_verified && <VerifiedBadge />}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowsListDialog;