import { Routes, Route, Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { User } from './lib/auth';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Scale, ExternalLink, Loader2 } from 'lucide-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerForm from './pages/CustomerForm';
import CustomerDetail from './pages/CustomerDetail';
import Orders from './pages/Orders';
import OrderForm from './pages/OrderForm';
import OrderDetail from './pages/OrderDetail';
import Settings from './pages/Settings';
import Templates from './pages/Templates';
import TemplateForm from './pages/TemplateForm';
import Reports from './pages/Reports';
import InvoiceView from './pages/InvoiceView';
import Login from './components/Login';
import { UIProvider } from './store/ui';
import TermsModal from './components/TermsModal';
import { initializeDatabaseCache } from './store/db';

const DBGatekeeper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeDatabaseCache()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error('DB Startup error', err);
        setError('فشل في تشغيل المحرك المحلي للبيانات. يرجى إعادة التشغيل.');
      });
  }, []);

  if (error) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center font-sans" dir="rtl">
        <ShieldCheck className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">خطأ فني في قاعدة البيانات المحمية</h2>
        <p className="text-slate-400 max-w-sm text-center">{error}</p>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-400 mt-4 text-center text-sm font-bold tracking-widest uppercase">Initializing Offline Engine...</p>
      </div>
    );
  }

  return <>{children}</>;
};

const TermsGatekeeper: React.FC<{ children: React.ReactNode, user: User }> = ({ children, user }) => {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkConsent = () => {
      const localVersion = localStorage.getItem('khayatpro_tos_version');
      const acceptedLocally = localStorage.getItem('khayatpro_tos_accepted') === 'true';
      
      if (acceptedLocally && localVersion === '2.1') {
        setAccepted(true);
      } else {
        setAccepted(false);
      }
      setChecking(false);
    };

    checkConsent();
  }, [user]);

  const handleAccept = async () => {
    setLoading(true);
    // Consent is strictly local in this architecture
    localStorage.setItem('khayatpro_tos_accepted', 'true');
    localStorage.setItem('khayatpro_tos_version', '2.1');
    localStorage.setItem('khayatpro_tos_accepted_at', new Date().toISOString());
    
    setAccepted(true);
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center z-[10000]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (accepted) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center font-sans" dir="rtl">
      {/* Use the comprehensive TermsModal as the primary gateway */}
      <TermsModal 
        isOpen={true} 
        onClose={() => {}} // Cannot be closed
        onAccept={handleAccept}
        showAcceptButton={true}
        isAccepting={loading}
      />
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      setAccessToken(null);
    };
    window.addEventListener('khayatpro-logout', handleLogout);
    return () => window.removeEventListener('khayatpro-logout', handleLogout);
  }, []);

  const handleLogin = (u: User, token: string | null) => {
    setUser(u);
    setAccessToken(token);
  };

  return (
    <DBGatekeeper>
      <UIProvider>
        <Routes>
          <Route 
            path="/*" 
            element={
              !user ? (
                <Login onLogin={handleLogin} />
              ) : (
                <TermsGatekeeper user={user}>
                  <Layout user={user} />
                </TermsGatekeeper>
              )
            }
          >
          <Route index element={<Dashboard />} />
          
          <Route path="customers">
            <Route index element={<Customers />} />
            <Route path="new" element={<CustomerForm />} />
            <Route path="edit/:id" element={<CustomerForm isEdit={true} />} />
            <Route path=":id" element={<CustomerDetail />} />
          </Route>

          <Route path="orders">
            <Route index element={<Orders />} />
            <Route path="new" element={<OrderForm />} />
            <Route path=":id" element={<OrderDetail />} />
            <Route path=":id/edit" element={<OrderForm isEdit={true} />} />
          </Route>

          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings user={user} />} />
          <Route path="settings/templates" element={<Templates />} />
          <Route path="settings/templates/new" element={<TemplateForm />} />
          <Route path="settings/templates/:id" element={<TemplateForm />} />
        </Route>
        
        {/* Invoice takes whole screen for printing */}
        <Route path="/invoice/:id" element={<InvoiceView />} />
        </Routes>
      </UIProvider>
    </DBGatekeeper>
  );
}

