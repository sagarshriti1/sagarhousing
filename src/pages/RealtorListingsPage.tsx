import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeaturedListings from "@/components/FeaturedListings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const RealtorListingsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="container py-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
        <FeaturedListings realtorId={id} />
      </main>
      <Footer />
    </div>
  );
};

export default RealtorListingsPage;
