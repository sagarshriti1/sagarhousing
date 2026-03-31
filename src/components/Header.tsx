import { useState } from "react";
import { Link } from "react-router-dom";
import { Home, Menu, X, Heart, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <Home className="h-6 w-6 text-accent" />
          <span className="font-display text-xl font-bold text-foreground">HomeQuest</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Buy</Link>
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Rent</Link>
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sell</Link>
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Estimate</Link>
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Agents</Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="icon">
            <Heart className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">Sign In</Button>
        </div>

        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card animate-fade-in">
          <nav className="container py-4 flex flex-col gap-3">
            <Link to="/" className="text-sm font-medium py-2 text-foreground">Buy</Link>
            <Link to="/" className="text-sm font-medium py-2 text-foreground">Rent</Link>
            <Link to="/" className="text-sm font-medium py-2 text-foreground">Sell</Link>
            <Link to="/" className="text-sm font-medium py-2 text-foreground">Estimate</Link>
            <Link to="/" className="text-sm font-medium py-2 text-foreground">Agents</Link>
            <Button size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 mt-2">Sign In</Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
