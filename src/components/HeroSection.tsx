import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import heroBg from "@/assets/hero-bg.jpg";

interface HeroSectionProps {
  activeTab: "buy" | "rent";
  setActiveTab: (tab: "buy" | "rent") => void;
}

const HeroSection = ({ activeTab, setActiveTab }: HeroSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <section className="relative h-[540px] flex items-center justify-center overflow-hidden">
      <img
        src={heroBg}
        alt="Beautiful modern home"
        className="absolute inset-0 w-full h-full object-cover"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0 bg-foreground/60" />
      
      <div className="relative z-10 container text-center animate-fade-in-up">
        <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4 text-balance">
          Find Your Dream Home
        </h1>
        <p className="text-primary-foreground/80 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
          Explore thousands of properties for sale and rent across the country
        </p>

        <div className="max-w-2xl mx-auto">
          <div className="flex gap-1 mb-3 justify-center">
            <button
              onClick={() => setActiveTab("buy")}
              className={`px-6 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
                activeTab === "buy"
                  ? "bg-card text-foreground"
                  : "bg-card/30 text-primary-foreground hover:bg-card/50"
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setActiveTab("rent")}
              className={`px-6 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
                activeTab === "rent"
                  ? "bg-card text-foreground"
                  : "bg-card/30 text-primary-foreground hover:bg-card/50"
              }`}
            >
              Rent
            </button>
          </div>

          <div className="flex items-center bg-card rounded-lg shadow-card-hover p-2">
            <MapPin className="h-5 w-5 text-muted-foreground ml-3 shrink-0" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter an address, neighborhood, city, or ZIP code"
              className="border-0 shadow-none focus-visible:ring-0 text-base"
            />
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 px-6">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
