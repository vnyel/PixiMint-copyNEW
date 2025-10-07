import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import LeaderboardTable from "@/components/LeaderboardTable"; // Import the new component

const LeaderboardPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-leaderboard-image text-foreground font-sans">
      <Header />
      <main className="flex-grow flex flex-col items-center p-8">
        <h2 className="text-5xl font-pixel text-primary mb-12 text-center tracking-tight">
          Top 10 Leaderboard
        </h2>
        <LeaderboardTable />
      </main>
      <Footer />
    </div>
  );
};

export default LeaderboardPage;