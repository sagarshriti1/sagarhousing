import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturedListings from "@/components/FeaturedListings";
import Footer from "@/components/Footer";

const Index = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-1">
      <HeroSection />
      <FeaturedListings />
    </main>
    <Footer />
  </div>
);

export default Index;
