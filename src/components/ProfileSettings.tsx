import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Profile } from "@/types/nft";
import { uploadAvatar, uploadBannerImage } from "@/utils/nft"; // Import uploadBannerImage
import { User as UserIcon, CheckCircle2, Image as ImageIcon } from "lucide-react"; // Import ImageIcon
import { Switch } from "@/components/ui/switch";
import useDebounce from "@/hooks/use-debounce"; // Import useDebounce
import { useNavigate } from "react-router-dom"; // Import useNavigate

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: Profile;
  onProfileUpdated: (updatedProfile: Profile) => void;
}

const ProfileSettings = ({ isOpen, onClose, currentProfile, onProfileUpdated }: ProfileSettingsProps) => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [description, setDescription] = useState(currentProfile.description || "");
  const [websiteUrl, setWebsiteUrl] = useState(currentProfile.website_url || "");
  const [twitterUrl, setTwitterUrl] = useState(currentProfile.twitter_url || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentProfile.avatar_url || null);
  const [bannerFile, setBannerFile] = useState<File | null>(null); // New state for banner file
  const [bannerPreview, setBannerPreview] = useState<string | null>(currentProfile.banner_url || null); // New state for banner preview
  const [isVerified, setIsVerified] = useState(currentProfile.is_verified || false);
  const [loading, setLoading] = useState(false);

  // New states for username
  const [newUsername, setNewUsername] = useState(currentProfile.username || "");
  const debouncedUsername = useDebounce(newUsername, 500);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isUsernameChecking, setIsUsernameChecking] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(false);

  useEffect(() => {
    setDescription(currentProfile.description || "");
    setWebsiteUrl(currentProfile.website_url || "");
    setTwitterUrl(currentProfile.twitter_url || "");
    setAvatarPreview(currentProfile.avatar_url || null);
    setBannerPreview(currentProfile.banner_url || null); // Reset banner preview
    setIsVerified(currentProfile.is_verified || false);
    setAvatarFile(null);
    setBannerFile(null); // Reset banner file
    setNewUsername(currentProfile.username || ""); // Reset newUsername
    setUsernameError(null);
    setIsUsernameAvailable(false);
  }, [currentProfile, isOpen]); // Reset when dialog opens or currentProfile changes

  // Debounced username check
  useEffect(() => {
    const checkUsernameAvailability = async () => {
      if (debouncedUsername === currentProfile.username) {
        setUsernameError(null);
        setIsUsernameAvailable(true);
        return;
      }
      if (debouncedUsername.trim() === "") {
        setUsernameError("Username cannot be empty.");
        setIsUsernameAvailable(false);
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(debouncedUsername)) {
        setUsernameError("Username can only contain letters, numbers, and underscores.");
        setIsUsernameAvailable(false);
        return;
      }
      if (debouncedUsername.length < 3 || debouncedUsername.length > 20) {
        setUsernameError("Username must be between 3 and 20 characters.");
        setIsUsernameAvailable(false);
        return;
      }

      setIsUsernameChecking(true);
      setUsernameError(null);
      setIsUsernameAvailable(false);

      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', debouncedUsername)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is good
        console.error("Error checking username availability:", error.message);
        setUsernameError("Error checking username. Please try again.");
        setIsUsernameAvailable(false);
      } else if (data) {
        setUsernameError("This username is already taken.");
        setIsUsernameAvailable(false);
      } else {
        setIsUsernameAvailable(true);
      }
      setIsUsernameChecking(false);
    };

    if (debouncedUsername) {
      checkUsernameAvailability();
    } else {
      setUsernameError(null);
      setIsUsernameAvailable(false);
    }
  }, [debouncedUsername, currentProfile.username]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        showError("Please upload an image file for your avatar.");
        setAvatarFile(null);
        setAvatarPreview(currentProfile.avatar_url || null);
        return;
      }
      if (file.size > 2 * 1024 * 1024) { // 2 MB limit for avatars
        showError("Avatar image size cannot exceed 2MB.");
        setAvatarFile(null);
        setAvatarPreview(currentProfile.avatar_url || null);
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    } else {
      setAvatarFile(null);
      setAvatarPreview(currentProfile.avatar_url || null);
    }
  };

  const handleBannerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        showError("Please upload an image file for your banner.");
        setBannerFile(null);
        setBannerPreview(currentProfile.banner_url || null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5 MB limit for banners
        showError("Banner image size cannot exceed 5MB.");
        setBannerFile(null);
        setBannerPreview(currentProfile.banner_url || null);
        return;
      }
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    } else {
      setBannerFile(null);
      setBannerPreview(currentProfile.banner_url || null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showError("You must be logged in to update your profile.");
      return;
    }

    if (newUsername !== currentProfile.username && (!isUsernameAvailable || usernameError)) {
      showError(usernameError || "Please fix the username before saving.");
      return;
    }

    setLoading(true);
    let newAvatarUrl = currentProfile.avatar_url;
    let newBannerUrl = currentProfile.banner_url; // Initialize newBannerUrl
    let updatedProfileData: Partial<Profile> = {
      description: description,
      website_url: websiteUrl,
      twitter_url: twitterUrl,
      is_verified: isVerified,
      updated_at: new Date().toISOString(),
    };

    try {
      // 1. Upload new avatar if selected
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar(avatarFile, user.id);
        if (uploadedUrl) {
          newAvatarUrl = uploadedUrl;
          updatedProfileData.avatar_url = newAvatarUrl;
        } else {
          setLoading(false);
          return; // Error already shown by uploadAvatar
        }
      }

      // 2. Upload new banner if selected
      if (bannerFile) {
        const uploadedUrl = await uploadBannerImage(bannerFile, user.id);
        if (uploadedUrl) {
          newBannerUrl = uploadedUrl;
          updatedProfileData.banner_url = newBannerUrl;
        } else {
          setLoading(false);
          return; // Error already shown by uploadBannerImage
        }
      }

      // 3. Update username if changed
      const isUsernameChanged = newUsername !== currentProfile.username;
      if (isUsernameChanged) {
        // Update username in auth.users metadata
        const { data: authUpdateData, error: authUpdateError } = await supabase.auth.updateUser({
          data: { username: newUsername },
        });

        if (authUpdateError) {
          showError(`Failed to update username in authentication: ${authUpdateError.message}`);
          setLoading(false);
          return;
        }
        updatedProfileData.username = newUsername;
      }

      // 4. Update profile in public.profiles table
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updatedProfileData,
          username: newUsername, // Ensure username is updated in profiles table
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        showError(`Failed to update profile: ${error.message}`);
        // If auth update succeeded but profile update failed, this is a partial failure.
        // For simplicity, we'll just show an error. In a real app, you might want to roll back auth update.
        return;
      }

      showSuccess("Profile updated successfully!");
      onProfileUpdated(data as Profile); // Pass the fully updated profile

      // If username changed, navigate to the new profile URL
      if (isUsernameChanged) {
        navigate(`/profile/${newUsername}`);
      }
      onClose();
    } catch (err: any) {
      showError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto bg-card text-card-foreground border border-border rounded-lg shadow-lg font-sans">
        <DialogHeader>
          <DialogTitle className="text-2xl font-pixel text-primary">Edit Your Profile</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <Label htmlFor="avatar" className="font-sans text-foreground">Profile Picture</Label>
            <Avatar className="h-24 w-24 border-2 border-border">
              <AvatarImage src={avatarPreview || undefined} alt="Avatar" />
              <AvatarFallback className="bg-muted text-muted-foreground">
                <UserIcon className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <Input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="col-span-3 border border-input rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 file:text-primary file:bg-secondary file:border-0 file:rounded-md file:font-sans"
              disabled={loading}
            />
          </div>

          {/* New Banner Image Section */}
          <div className="flex flex-col items-center gap-4 mt-4">
            <Label htmlFor="banner" className="font-sans text-foreground">Banner Image</Label>
            <div className="w-full h-32 bg-muted border border-border rounded-lg flex items-center justify-center overflow-hidden">
              {bannerPreview ? (
                <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <Input
              id="banner"
              type="file"
              accept="image/*"
              onChange={handleBannerChange}
              className="col-span-3 border border-input rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 file:text-primary file:bg-secondary file:border-0 file:rounded-md file:font-sans"
              disabled={loading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="username" className="font-sans text-foreground">Username</Label>
            <div className="relative">
              <Input
                id="username"
                type="text"
                placeholder="Your unique username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="col-span-3 border border-input rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-sans pr-10"
                disabled={loading}
                required
              />
              {isUsernameChecking && (
                <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
              )}
              {!isUsernameChecking && newUsername.trim() !== "" && newUsername !== currentProfile.username && isUsernameAvailable && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
              )}
            </div>
            {usernameError && <p className="text-red-500 text-sm mt-1">{usernameError}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description" className="font-sans text-foreground">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell us about yourself..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3 border border-input rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-sans"
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="website" className="font-sans text-foreground">Website URL</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://yourwebsite.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="col-span-3 border border-input rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-sans"
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="twitter" className="font-sans text-foreground">Twitter URL</Label>
            <Input
              id="twitter"
              type="url"
              placeholder="https://twitter.com/yourhandle"
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              className="col-span-3 border border-input rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-sans"
              disabled={loading}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="is-verified" className="font-sans text-foreground">Show Verified Badge</Label>
            <Switch
              id="is-verified"
              checked={isVerified}
              onCheckedChange={setIsVerified}
              disabled={loading}
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground border border-primary rounded-lg hover:bg-primary/90 transition-all duration-150 ease-in-out shadow-md font-pixel text-lg py-2 px-4"
              disabled={loading || isUsernameChecking || (newUsername !== currentProfile.username && !isUsernameAvailable)}
            >
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSettings;