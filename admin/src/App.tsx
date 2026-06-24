import { Dashboard } from '@/pages/Dashboard';
import { Settings } from '@/pages/Settings/index';
import { SignIn } from '@/pages/SignIn';
import { Menu } from '@/pages/Menu';
import { Promotions } from '@/pages/Promotions';
import { CateringPacks } from '@/pages/CateringPacks';
import { StoreLocations } from '@/pages/StoreLocations';
import { WholesaleProducts } from '@/pages/WholesaleProducts';
import { WholesaleTiers } from '@/pages/WholesaleTiers';
import { Categories } from '@/pages/Categories';
import { DraftOrders } from '@/pages/Sales/DraftOrders';
import { SalesOrdersPage } from '@/pages/Sales/SalesOrdersPage';
import { SalesOrderDetailsPage } from '@/pages/Sales/SalesOrderDetailsPage';
import { RedirectTestOrdersToSalesOrders } from '@/pages/Sales/RedirectTestOrdersToSalesOrders';
import { RedirectTestOrderDetailsToSalesOrderDetails } from '@/pages/Sales/RedirectTestOrderDetailsToSalesOrderDetails';
import { ArchivedOrders } from '@/pages/Sales/ArchivedOrders';
import { SalesOrderModeProvider } from '@/contexts/SalesOrderModeContext';
import {
  HashRouter as Router,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { Emails } from './pages/Emails';
import { BlogPosts } from './pages/BlogPosts';
import { FeaturedReviewsPage } from './pages/FeaturedReviewsPage';
import { Feedbacks } from './pages/Feedbacks';
import { LocalizationPage } from './pages/LocalizationPage';
import { UserProfile } from './pages/UserProfile';
import { Partners } from './pages/Partners';
import { FranchiseInterests } from './pages/FranchiseInterests';
import JobApplications from './pages/JobApplications';
import { JobListings } from './pages/JobListings';
import ResourcesHub from './pages/ResourcesHub/ResourcesHub';
import Taxonomies from './pages/ResourcesHub/Taxonomies';
import MenuAcademy from './pages/ResourcesHub/MenuAcademy';

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
      <SalesOrderModeProvider>
      <Routes>
        {user ? (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/localization" element={<LocalizationPage />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/catering-packs" element={<CateringPacks />} />
            <Route path="/store-locations" element={<StoreLocations />} />
            <Route path="/wholesale-products" element={<WholesaleProducts />} />
            <Route path="/wholesale-tiers" element={<WholesaleTiers />} />
            <Route path="/blog-posts" element={<BlogPosts />} />
            <Route path="/featured-reviews" element={<FeaturedReviewsPage />} />
            <Route path="/feedbacks" element={<Feedbacks />} />
            <Route path="/emails" element={<Emails />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/interests/franchise" element={<FranchiseInterests type="franchise" />} />
            <Route path="/interests/consultation" element={<FranchiseInterests type="consultation" />} />
            <Route path="/interests/catering_enquiries" element={<FranchiseInterests type="catering_enquiry" />} />
            <Route path="/wholesale_enquiries" element={<FranchiseInterests type="wholesale_enquiry" />} />
            <Route path="/interests/consultations" element={<Navigate to="/interests/consultation" replace />} />
            <Route path="/sales/orders" element={<Navigate to="/sales/orders/pickup" replace />} />
            <Route path="/sales/orders/:orderType/:orderId" element={<SalesOrderDetailsPage />} />
            <Route path="/sales/orders/:orderType" element={<SalesOrdersPage />} />
            <Route
              path="/sales/test-orders/:orderType/:orderId"
              element={<RedirectTestOrderDetailsToSalesOrderDetails />}
            />
            <Route
              path="/sales/test-orders/:orderType"
              element={<RedirectTestOrdersToSalesOrders />}
            />
            <Route
              path="/sales/test-orders"
              element={<Navigate to="/sales/orders/pickup" replace />}
            />
            <Route
              path="/sales/draft-orders"
              element={<Navigate to="/sales/draft-orders/pickup" replace />}
            />
            <Route path="/sales/draft-orders/:orderType" element={<DraftOrders />} />
            <Route
              path="/sales/archived-orders"
              element={<Navigate to="/sales/archived-orders/pickup" replace />}
            />
            <Route path="/sales/archived-orders/:orderType" element={<ArchivedOrders />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/job-applications/:applicationId" element={<JobApplications />} />
            <Route path="/job-applications" element={<JobApplications />} />
            <Route path="/job-listings" element={<JobListings />} />
            <Route path="/franchise/resources-hub" element={<ResourcesHub />} />
            <Route path="/franchise/menu-academy" element={<MenuAcademy />} />
            <Route path="/franchise/taxonomies" element={<Taxonomies />} />
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
      </SalesOrderModeProvider>
    </Router>
  );
}

export default App;
