import { Dashboard } from '@/pages/Dashboard';
import { Settings } from '@/pages/Settings';
import { SignIn } from '@/pages/SignIn';
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from 'react-router-dom';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { LocalizationPage } from './pages/LocalizationPage';
import { UserProfile } from './pages/UserProfile';

export function App() {
  const { user, isLoading } = useSupabaseAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {user ? (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/localization" element={<LocalizationPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/sign-in"
              element={<Navigate to="/dashboard" replace />}
            />
          </>
        ) : (
          <>
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="*" element={<Navigate to="/sign-in" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
