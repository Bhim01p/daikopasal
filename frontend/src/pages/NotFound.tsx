import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
export default function NotFound() {
  return (
    <div className="container standard-page empty-state">
      <span className="eyebrow">404</span>
      <h1>A little off the path.</h1>
      <p>We couldn’t find this page. Let’s get you back to the shop.</p>
      <Link className="button dark" to="/">
        Back to home <ArrowRight size={17} />
      </Link>
    </div>
  );
}
