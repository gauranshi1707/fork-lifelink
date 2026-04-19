import { Siren } from "lucide-react";
import { ComingSoon } from "./placeholders/ComingSoon";

const Sos = () => (
  <ComingSoon
    title="Emergency SOS"
    description="One tap pinpoints your location and lists the nearest 24/7 hospitals and police stations."
    icon={Siren}
    accent="bg-gradient-emergency"
  />
);
export default Sos;
