import TournamentOverview from "../../components/TournamentOverview";
import TournamentManager from "../../components/hanbee/TournamentManager";
import TournamentReviewQueue from "../../components/hanbee/TournamentReviewQueue";
import TournamentResults from "../../components/hanbee/TournamentResults";

export default function HanbeeTournamentPage() {
  return <div><TournamentOverview /><TournamentManager /><TournamentReviewQueue /><TournamentResults /></div>;
}
