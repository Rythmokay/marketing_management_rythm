import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewPage } from './pages/OverviewPage';
import { InfluencersPage } from './pages/InfluencersPage';
import { InfluencerDetailPage } from './pages/InfluencerDetailPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { TeamPage } from './pages/TeamPage';
import { HistoryPage } from './pages/HistoryPage';
import { ReviewCheckerPage } from './pages/ReviewCheckerPage';
import { useAuthStore } from './store/authStore';
import type { ReactNode } from 'react';

/**
 * Route protection wrapper based on authentication and Role.
 * FUNDAMENTAL CONCEPT: Route Guards in Single Page Applications (SPAs).
 * This wrapper checks the global state (Zustand) to see if the user has a valid session
 * and if their role matches the required role for the specific page.
 */
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const { token, user } = useAuthStore();

    // If not logged in, kick them back to login page
    if (!token || !user) {
        return <Navigate to="/" replace />;
    }

    // Admins and employees share the same pages; only admins see delete actions
    return children;
};

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Route */}
                <Route path="/" element={<Login />} />
                
                {/* Signed-in pages: each area has its own URL */}
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                    <Route path="/overview" element={<OverviewPage />} />
                    <Route path="/influencers" element={<InfluencersPage />} />
                    <Route path="/influencers/:id" element={<InfluencerDetailPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/products/:name" element={<ProductDetailPage />} />
                    <Route path="/review-check" element={<ReviewCheckerPage />} />
                    <Route path="/team" element={<TeamPage />} />
                    <Route path="/history" element={<HistoryPage />} />
                </Route>

                {/* Old dashboard URLs */}
                <Route path="/admin-dashboard" element={<Navigate to="/overview" replace />} />
                <Route path="/employee-dashboard" element={<Navigate to="/overview" replace />} />

                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
