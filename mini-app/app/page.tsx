import { description, title } from "@/lib/metadata";
import { generateMetadata } from "@/lib/farcaster-embed";
import Game from "@/components/game";

export { generateMetadata };

export default function Home() {
  // NEVER write anything here, only use this page to import components
  return <Game />;
}
