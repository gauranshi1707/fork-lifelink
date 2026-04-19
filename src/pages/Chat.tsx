import { MessageCircleHeart } from "lucide-react";
import { ComingSoon } from "./placeholders/ComingSoon";

const Chat = () => (
  <ComingSoon
    title="Anonymous Mental Health Chat"
    description="A safe space to talk, with instant crisis support when it matters. We'll wire this up next using a streaming AI companion and a region-aware helpline panel."
    icon={MessageCircleHeart}
    accent="bg-gradient-primary"
  />
);
export default Chat;
