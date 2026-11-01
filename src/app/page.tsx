import { ALL_SESSIONS } from "@/content";
import { SessionHubView } from "@/components/session-hub-view";

export default function HomePage() {
  return <SessionHubView sessions={ALL_SESSIONS} />;
}
