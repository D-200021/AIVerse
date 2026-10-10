import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import OfficeSimulationPage from "./pages/OfficeSimulationPage.jsx";
import { PxButton } from "./atoms/index.jsx";

const API_BASE = "https://aiverse-yicr.onrender.com/api";

function Gate() {
  const { status, user, retry } = useAuth();
  if (status === "loading") return <div className="h-full grid place-items-center px-title">LOADING…</div>;
  if (status === "offline") {
    return (
      <div className="h-full grid place-items-center p-4">
        <div className="px-panel p-4 max-w-sm flex flex-col gap-3 items-start">
          <h1 className="px-title">CAN'T REACH THE SERVER</h1>
          <p className="text-[14px] text-ink5">Start the backend (<code>npm start</code> in <code>backend/</code>) and try again.</p>
          <PxButton variant="primary" onClick={retry}>retry</PxButton>
        </div>
      </div>
    );
  }
  if (status !== "authed") return <AuthPage />;
  // key= remounts the whole office when the account changes, so no data leaks between users.
  return <OfficeSimulationPage key={user.id} apiBase={API_BASE} roomId={user.id} />;
}

export default function App() {
  return <AuthProvider apiBase={API_BASE}><Gate /></AuthProvider>;
}
