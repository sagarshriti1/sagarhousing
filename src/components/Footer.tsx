import { Home } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="bg-primary text-primary-foreground">
    <div className="container py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-4">
            <Home className="h-6 w-6 text-accent" />
            <span className="font-display text-xl font-bold">HomeQuest</span>
          </Link>
          <p className="text-primary-foreground/70 text-sm">
            Your trusted partner in finding the perfect home. Browse thousands of listings across the nation.
          </p>
        </div>
        {[
          { title: "Company", links: ["About Us", "Careers", "Press", "Blog"] },
          { title: "Resources", links: ["Help Center", "Advertise", "Agent Finder", "Mortgage Calculator"] },
          { title: "Legal", links: ["Terms of Service", "Privacy Policy", "Cookie Policy", "Fair Housing"] },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="font-display font-semibold mb-4">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link}>
                  <Link to="/" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-sm text-primary-foreground/50">
        © 2026 HomeQuest. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
