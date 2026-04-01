import { useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturedListings from "@/components/FeaturedListings";
import FindRealtors from "@/components/FindRealtors";
import Footer from "@/components/Footer";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"buy" | "rent">("buy");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection activeTab={activeTab} setActiveTab={setActiveTab} />
        <FeaturedListings heroListingType={activeTab === "buy" ? "sale" : "rent"} />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
