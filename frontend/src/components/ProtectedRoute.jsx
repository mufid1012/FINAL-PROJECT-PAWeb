import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false, userOnly = false }) => {
    const { isAuthenticated, isAdmin, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Prevent regular users from accessing admin pages
    if (adminOnly && !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    // Prevent admin from accessing user-only pages
    if (userOnly && isAdmin) {
        return <Navigate to="/admin" replace />;
    }

    return children;
};

export default ProtectedRoute;
