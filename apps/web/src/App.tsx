import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SellWithUsPage from './pages/SellWithUsPage';
import ApplicationFormPage from './pages/ApplicationFormPage';
import ActivationPage from './pages/ActivationPage';
import ProductPage from './pages/ProductPage';
import SearchPage from './pages/SearchPage';
import CategoryPage from './pages/CategoryPage';
import SellerProfilePage from './pages/SellerProfilePage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import SellerLoginPage from './pages/seller/SellerLoginPage';
import SellerDashboardPage from './pages/seller/SellerDashboardPage';
import AddListingPage from './pages/seller/AddListingPage';
import OnboardingTour, { shouldShowOnboarding } from './components/OnboardingTour';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);

  return (
    <BrowserRouter>
      {showOnboarding && <OnboardingTour onDone={() => setShowOnboarding(false)} />}
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/sell" element={<SellWithUsPage />} />
        <Route path="/apply" element={<ApplicationFormPage />} />
        <Route path="/activate" element={<ActivationPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/category/:name" element={<CategoryPage />} />

        {/* Seller app routes MUST come before /seller/:id */}
        <Route path="/seller/login" element={<SellerLoginPage />} />
        <Route path="/seller/dashboard" element={<SellerDashboardPage />} />
        <Route path="/seller/listings/new" element={<AddListingPage />} />

        {/* Public seller profile (parametric — after specific paths) */}
        <Route path="/seller/:id" element={<SellerProfilePage />} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
