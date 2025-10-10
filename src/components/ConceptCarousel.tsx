import React from "react";
import { Sparkles, Image, Gem, Users, MessageSquare, Fingerprint, ArrowRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TypewriterEffect from "./TypewriterEffect"; // Import TypewriterEffect

const ConceptCarousel = () => {
  const slides = [
    {
      title: "The PixiMint Vision: A New Era for NFTs",
      icon: <Sparkles className="h-8 w-8 text-yellow-400" />,
      content: (
        <>
          <p className="mb-4">
            Welcome to PixiMint, where the digital art world meets nostalgic 8-bit aesthetics and a truly unique minting experience. Unlike traditional NFT projects, PixiMint empowers *you* to be the creator, transforming your personal images into one-of-a-kind pixelated masterpieces.
          </p>
          <p>
            Discover how you can be part of a groundbreaking, community-driven collection.
          </p>
        </>
      ),
    },
    {
      title: "How PixiMint Works: Your Creative Journey",
      icon: <Image className="h-8 w-8 text-primary" />,
      content: (
        <ul className="list-disc list-inside space-y-3 pl-4 text-left">
          <li className="flex items-start gap-2">
            <Image className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <strong>Upload Your Image:</strong> Start by uploading any image you desire.
          </li>
          <li className="flex items-start gap-2">
            <Gem className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <strong>8-Bit Transformation:</strong> Our unique algorithm instantly pixelates your image.
          </li>
          <li className="flex items-start gap-2">
            <Sparkles className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <strong>Algorithmic Rarity & Pricing:</strong> Your NFT is assigned a rarity tier and price in SOL.
          </li>
          <li className="flex items-start gap-2">
            <Fingerprint className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <strong>Mint & Own:</strong> Your unique PixiNFT is minted and added to the collection.
          </li>
        </ul>
      ),
    },
    {
      title: "PixiMint vs. Traditional NFT Mints: A Paradigm Shift",
      icon: <ArrowRight className="h-8 w-8 text-blue-500" />,
      content: (
        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-accent p-4 rounded-lg border border-border shadow-inner space-y-2">
            <h5 className="text-xl font-pixel text-accent-foreground mb-2">Traditional NFT Mints</h5>
            <ul className="list-disc list-inside space-y-1 text-base">
              <li>Often pre-generated collections.</li>
              <li>"Blind mints" with unknown outcomes.</li>
              <li>Focus on artist's vision.</li>
            </ul>
          </Card>
          <Card className="bg-primary p-4 rounded-lg border border-primary shadow-inner space-y-2 text-primary-foreground">
            <h5 className="text-xl font-pixel text-primary-foreground mb-2">The PixiMint Difference</h5>
            <ul className="list-disc list-inside space-y-1 text-base">
              <li><strong>User-Generated Content:</strong> You bring the art.</li>
              <li><strong>On-Demand Minting:</strong> Mint when you're ready.</li>
              <li><strong>Personal Connection:</strong> Every NFT has a story.</li>
            </ul>
          </Card>
        </div>
      ),
    },
    {
      title: "Join the PixiMint Community",
      icon: <Users className="h-8 w-8 text-blue-500" />,
      content: (
        <>
          <p className="mb-4">
            Beyond minting, PixiMint is a vibrant community. Explore the gallery, follow other minters, and engage in direct messages. Track your collection's worth, climb the leaderboard, and showcase your unique 8-bit creations.
          </p>
          <p>
            With a strict limit of 10,000 NFTs, every PixiMint is a rare piece of digital history. Be part of this groundbreaking collection and mint your legacy today!
          </p>
        </>
      ),
    },
  ];

  return (
    <section className="w-full max-w-4xl mx-auto mt-12 p-8 bg-card border border-border rounded-xl shadow-xl text-card-foreground font-sans">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={index} className="p-4">
              <Card className="bg-background border border-border rounded-lg shadow-md h-full flex flex-col justify-between">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-3xl font-pixel text-primary flex items-center justify-center gap-3 mb-2">
                    {slide.icon} <TypewriterEffect text={slide.title} delay={40} />
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-lg">
                    {index === 0 && "A new era for digital art ownership."}
                    {index === 1 && "Transform your images into unique 8-bit NFTs."}
                    {index === 2 && "Experience the PixiMint difference."}
                    {index === 3 && "Connect, create, and collect with PixiMint."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-lg leading-relaxed text-center flex-grow flex items-center justify-center">
                  {slide.content}
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="bg-mint-green text-black hover:bg-mint-green/90 hover:text-black border-mint-green" />
        <CarouselNext className="bg-mint-green text-black hover:bg-mint-green/90 hover:text-black border-mint-green" />
      </Carousel>
    </section>
  );
};

export default ConceptCarousel;