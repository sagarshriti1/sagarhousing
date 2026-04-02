import { Home, Building2 } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

interface HeroSectionProps {
  activeTab: "buy" | "rent";
  setActiveTab: (tab: "buy" | "rent") => void;
}

const HeroSection = ({ activeTab, setActiveTab }: HeroSectionProps) => {
  return (
    <section className="relative h-[520px] flex items-center justify-center overflow-hidden">
      <img
        src={heroBg}
        alt="Beautiful modern home"
        className="absolute inset-0 w-full h-full object-cover scale-105"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-foreground/70 via-foreground/50 to-foreground/80" />

      <div className="relative z-10 container text-center animate-fade-in-up">
        <p className="text-primary-foreground/60 uppercase tracking-[0.3em] text-sm font-medium mb-4">
          Nepal's Trusted Property Platform
        </p>
        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 text-balance leading-tight">
          Find Your Dream Home
        </h1>
        <p className="text-primary-foreground/70 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
          Explore thousands of properties for sale and rent across the country
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setActiveTab("buy")}
            className={`group flex items-center gap-3 px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 ${
              activeTab === "buy"
                ? "bg-accent text-accent-foreground shadow-lg shadow-accent/30 scale-105"
                : "bg-card/20 text-primary-foreground border border-primary-foreground/20 hover:bg-card/30 hover:scale-105"
            }`}
          >
            <Home className={`h-5 w-5 transition-transform group-hover:scale-110 ${activeTab === "buy" ? "text-accent-foreground" : "text-primary-foreground/70"}`} />
            Buy Property
          </button>
          <button
            onClick={() => setActiveTab("rent")}
            className={`group flex items-center gap-3 px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 ${
              activeTab === "rent"
                ? "bg-accent text-accent-foreground shadow-lg shadow-accent/30 scale-105"
                : "bg-card/20 text-primary-foreground border border-primary-foreground/20 hover:bg-card/30 hover:scale-105"
            }`}
          >
            <Building2 className={`h-5 w-5 transition-transform group-hover:scale-110 ${activeTab === "rent" ? "text-accent-foreground" : "text-primary-foreground/70"}`} />
            Rent Property
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
