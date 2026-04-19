import { Pill } from "lucide-react";
import { ComingSoon } from "./placeholders/ComingSoon";

const Reminders = () => (
  <ComingSoon
    title="Smart Medicine Reminders"
    description="Schedule doses, get gentle nudges, and notify a family contact if a dose is missed. Coming up after we enable accounts."
    icon={Pill}
    accent="bg-accent"
  />
);
export default Reminders;
