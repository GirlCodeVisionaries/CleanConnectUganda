import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Order from './pages/Order';
import MyBookings from './pages/MyBookings';
import PartnerDashboard from './pages/PartnerDashboard';
import PartnerOnboarding from './pages/PartnerOnboarding';
import PartnerEarnings from './pages/PartnerEarnings';
import AIChat from './pages/AIChat';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPartners from './pages/admin/AdminPartners';
import AdminPartnerDetail from './pages/admin/AdminPartnerDetail';
import AdminDocuments from './pages/admin/AdminDocuments';
import AdminBookings from './pages/admin/AdminBookings';
import AdminPayments from './pages/admin/AdminPayments';
import AdminPayouts from './pages/admin/AdminPayouts';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCategories from './pages/admin/AdminCategories';
import AdminActivity from './pages/admin/AdminActivity';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/order" element={<Order />} />
              <Route path="/bookings" element={<MyBookings />} />
              <Route path="/dashboard" element={<PartnerDashboard />} />
              <Route path="/partner/onboarding" element={<PartnerOnboarding />} />
              <Route path="/partner/earnings" element={<PartnerEarnings />} />
              <Route path="/ai-chat" element={<AIChat />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="partners" element={<AdminPartners />} />
                <Route path="partners/:id" element={<AdminPartnerDetail />} />
                <Route path="documents" element={<AdminDocuments />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="payouts" element={<AdminPayouts />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="activity" element={<AdminActivity />} />
              </Route>
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
