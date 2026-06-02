import { Dashboard } from '@/pages/Dashboard';
import { Settings } from '@/pages/Settings/index';
import { SignIn } from '@/pages/SignIn';
import { Menu } from '@/pages/Menu';
import { Promotions } from '@/pages/Promotions';
import { CateringPacks } from '@/pages/CateringPacks';
import { CateringBoxes } from '@/pages/CateringBoxes';
import { StoreLocations } from '@/pages/StoreLocations';
import { WholesaleProducts } from '@/pages/WholesaleProducts';
import { Categories } from '@/pages/Categories';
import { DraftOrders } from '@/pages/Sales/DraftOrders';
import { Orders } from '@/pages/Sales/Orders';
import { ArchivedOrders } from '@/pages/Sales/ArchivedOrders';
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from 'react-router-dom';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { FeaturedReviewsPage } from './pages/FeaturedReviewsPage';
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
            <Route path="/menu" element={<Menu />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/catering-packs" element={<CateringPacks />} />
            <Route path="/catering-boxes" element={<CateringBoxes />} />
            <Route path="/store-locations" element={<StoreLocations />} />
            <Route path="/wholesale-products" element={<WholesaleProducts />} />
            <Route path="/featured-reviews" element={<FeaturedReviewsPage />} />
            <Route path="/sales/orders" element={<Orders />} />
            <Route path="/sales/draft-orders" element={<DraftOrders />} />
            <Route path="/sales/archived-orders" element={<ArchivedOrders />} />
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
