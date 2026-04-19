import { UserRound } from "lucide-react";
import { ComingSoon } from "./placeholders/ComingSoon";

const Auth = () => (
  <ComingSoon
    title="Sign in to Aidly"
    description="A free account unlocks Reminders, the Donor Finder, and your Health Vault. We'll enable secure sign-in next."
    icon={UserRound}
    accent="bg-gradient-primary"
  />
);
export default Auth;
