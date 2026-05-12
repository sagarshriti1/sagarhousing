import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturedListings from "@/components/FeaturedListings";
import FindRealtors from "@/components/FindRealtors";
import Footer from "@/components/Footer";

const Index = () => {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get("type");
  const [activeTab, setActiveTab] = useState<"all" | "buy" | "rent">(
    typeParam === "rent" ? "rent" : typeParam === "buy" ? "buy" : "all"
  );

  useEffect(() => {
    if (typeParam === "rent") setActiveTab("rent");
    else if (typeParam === "buy") setActiveTab("buy");
    else setActiveTab("all");
  }, [typeParam]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection activeTab={activeTab} setActiveTab={setActiveTab} />
        <FeaturedListings heroListingType={activeTab === "buy" ? "sale" : activeTab === "rent" ? "rent" : "all"} />
        <FindRealtors />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
