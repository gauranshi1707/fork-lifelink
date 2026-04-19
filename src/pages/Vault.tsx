import { ShieldCheck } from "lucide-react";
import { ComingSoon } from "./placeholders/ComingSoon";

const Vault = () => (
  <ComingSoon
    title="Digital Health Vault"
    description="Securely upload prescriptions and reports, preview them in-app, and share with your doctor via expiring links."
    icon={ShieldCheck}
    accent="bg-primary-glow"
  />
);
export default Vault;
