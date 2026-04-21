import { Link } from "react-router-dom";
import { Heart } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="mt-20 border-t border-border/60 bg-muted/40">
      <div className="container flex flex-col gap-6 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
              <Heart className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg">LifeLink</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            Community-first tools for mental health, medication, donors, emergencies, and your private health records.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <div>
            <h3 className="font-semibold text-foreground">Care</h3>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>
                <Link to="/chat" className="hover:text-primary">
                  Mental health chat
                </Link>
              </li>
              <li>
                <Link to="/reminders" className="hover:text-primary">
                  Medicine reminders
                </Link>
              </li>
              <li>
                <Link to="/donors" className="hover:text-primary">
                  Blood donors
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Emergency</h3>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>
                <Link to="/sos" className="hover:text-emergency">
                  SOS
                </Link>
              </li>
              <li>
                <Link to="/vault" className="hover:text-primary">
                  Health vault
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">About</h3>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-primary">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-primary">
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        LifeLink is not a medical service. In an emergency, always call your local emergency number.
      </div>
    </footer>
  );
};
