import { BrowserRouter as Router, Routes, Route } from "react-router";

import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { AuthProvider } from "./context/AuthContext";
import AuthGate from "./components/auth/AuthGate";
import RequireRole from "./components/auth/RequireRole";
import SignIn from "./pages/AuthPages/SignIn";
import Home from "./pages/Dashboard/Home";
import StudyLibrary from "./pages/StudyLibrary/StudyLibrary";
import Flashcards from "./pages/Flashcards/Flashcards";
import SoundLibrary from "./pages/SoundLibrary/SoundLibrary";
import Users from "./pages/Users/Users";
import Lecturers from "./pages/Lecturers/Lecturers";
import Announcements from "./pages/Announcements/Announcements";
import ActivityLog from "./pages/ActivityLog/ActivityLog";
import Support from "./pages/Support/Support";
import SupportTicketDetail from "./pages/Support/TicketDetail";
import Settings from "./pages/Settings/Settings";
import Profile from "./pages/Profile/Profile";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/signin" element={<SignIn />} />

          <Route element={<AuthGate />}>
            <Route element={<AppLayout />}>
              {/* Full parity for admin and lecturer — no role check needed
                  on these three, since the backend already allows both
                  the same actions (see api/app/Domain/StudyLibrary and
                  Flashcards routes.php). */}
              <Route path="/study-library" element={<StudyLibrary />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />

              {/* Admin-only — RequireRole bounces a lecturer who types
                  one of these paths directly to Study Library, since the
                  backend already 403s them and a dead fetch-error page
                  would be a worse experience than a clean redirect. */}
              <Route element={<RequireRole roles={["admin"]} />}>
                <Route path="/" element={<Home />} />
                <Route path="/sounds" element={<SoundLibrary />} />
                <Route path="/users" element={<Users />} />
                <Route path="/lecturers" element={<Lecturers />} />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/activity-log" element={<ActivityLog />} />
                <Route path="/support" element={<Support />} />
                <Route path="/support/:id" element={<SupportTicketDetail />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
