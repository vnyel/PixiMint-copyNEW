import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginUser } from "@/utils/auth";
import { showError } from "@/utils/toast";
import MiniNftCarousel from "@/components/MiniNftCarousel";
import AuthPageStats from "@/components/AuthPageStats";

const featuredNftNames = [
  "#426", "#6639", "#9075", "#9724", "#1956", "#3522", "#9925", "#6695", "#2114",
  "#6321", "#654", "#9028", "#7766", "#2971", "#3394", "#6630", "#5120"
];

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      showError("Please enter both username and password.");
      return;
    }
    setLoading(true);
    const user = await loginUser(username, password);
    setLoading(false);
    if (user) {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-auth-image text-foreground font-sans p-4 relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center w-full max-w-6xl">
        {/* AuthPageStats - now in the first column */}
        <div className="hidden lg:flex justify-end self-start"> {/* Changed justify-center to justify-end */}
          <AuthPageStats />
        </div>
        
        {/* Login/Register Card - this will be in the middle column */}
        <Card className="w-full border border-border rounded-lg shadow-md bg-card bg-opacity-50 text-card-foreground lg:col-span-1 self-start">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-pixel text-primary mb-2">Login to PixiMint</CardTitle>
            <CardDescription className="text-muted-foreground font-sans">Enter your username and password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="font-sans text-foreground">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Your unique username"
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
                  placeholder="Your password"
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
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground font-sans">
              Don't have an account?{" "}
              <Button variant="link" onClick={() => navigate("/register")} className="p-0 h-auto text-blue-600 hover:text-blue-800 font-sans">
                Register
              </Button>
            </p>
          </CardContent>
        </Card>
        
        {/* MiniNftCarousel - this will be in the right column */}
        <div className="hidden lg:flex justify-center self-start">
          <MiniNftCarousel nftNames={featuredNftNames} />
        </div>
      </div>
    </div>
  );
};

export default Login;