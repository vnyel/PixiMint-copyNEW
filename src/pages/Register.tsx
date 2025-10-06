import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { registerUser } from "@/utils/auth";
import { showError, showSuccess } from "@/utils/toast";

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      showError("Username and password cannot be empty.");
      return;
    }
    setLoading(true);
    const user = await registerUser(username, password);
    setLoading(false);
    if (user) {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-auth-image text-foreground font-sans p-4">
      <Card className="w-full max-w-md border border-border rounded-lg shadow-md bg-card bg-opacity-50 text-card-foreground">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-pixel text-primary mb-2">Register for PixiMint</CardTitle>
          <CardDescription className="text-muted-foreground font-sans">Create your account to start minting NFTs.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="font-sans text-foreground">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a unique username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="border border-input rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-sans"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-sans text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Choose a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-input rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-sans"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground border border-primary rounded-lg hover:bg-primary/90 transition-all duration-150 ease-in-out shadow-md font-pixel text-lg py-3"
              disabled={loading}
            >
              {loading ? "Registering..." : "Register"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground font-sans">
            Already have an account?{" "}
            <Button variant="link" onClick={() => navigate("/login")} className="p-0 h-auto text-blue-600 hover:text-blue-800 font-sans">
              Login
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;