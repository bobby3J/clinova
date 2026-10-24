import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { StudySessionProvider } from "./context/StudySessionContext";
import { SidebarProvider } from "./context/SidebarContext";
import AuthGate from "./components/auth/AuthGate";
import Onboarding from "./pages/Onboarding/Onboarding";
import SignIn from "./pages/SignIn/SignIn";
import SignUp from "./pages/SignUp/SignUp";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import Home from "./pages/Home/Home";
import SessionSetup from "./pages/StudyWithMe/SessionSetup";
import ActiveSession from "./pages/StudyWithMe/ActiveSession";
import BreakScreen from "./pages/StudyWithMe/BreakScreen";
import Profile from "./pages/Profile/Profile";
import Settings from "./pages/Settings/Settings";
import Progress from "./pages/Progress/Progress";
import Flashcards from "./pages/Flashcards/Flashcards";
import StudyLibrary from "./pages/StudyLibrary/StudyLibrary";
import AiPractice from "./pages/AiPractice/AiPractice";
import Support from "./pages/Support/Support";
import NewTicket from "./pages/Support/NewTicket";
import TicketDetail from "./pages/Support/TicketDetail";

export default function App() {
  return (
    <AuthProvider>
      <StudySessionProvider>
      <SidebarProvider>
        <Router>
          <Routes>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            {/* Matches AppServiceProvider::boot()'s
                /password-reset/$token?email=... exactly — don't rename
                this path without updating that closure too. */}
            <Route path="/password-reset/:token" element={<ResetPassword />} />

            <Route element={<AuthGate />}>
              {/* Authenticated, not public — see SignUp.tsx's post-register
                  navigate() and Onboarding.tsx's own docblock for why this
                  moved here from the pre-auth route group it started in. */}
              <Route path="/welcome" element={<Onboarding />} />
              <Route path="/" element={<Home />} />
              <Route path="/study-with-me" element={<SessionSetup />} />
              <Route path="/study-with-me/active" element={<ActiveSession />} />
              <Route path="/study-with-me/break" element={<BreakScreen />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/study-library" element={<StudyLibrary />} />
              <Route path="/ai-practice" element={<AiPractice />} />
              <Route path="/support" element={<Support />} />
              <Route path="/support/new" element={<NewTicket />} />
              <Route path="/support/:id" element={<TicketDetail />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </SidebarProvider>
      </StudySessionProvider>
    </AuthProvider>
  );
}
