import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { isSupabaseConfigured } from './supabaseClient';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#fef2f2', color: '#991b1b', minHeight: '100vh' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>🚨 Uygulama Çöktü (Runtime Error)</h1>
          <p>Uygulama çalışırken beklenmedik bir hata oluştu. Beyaz ekran yerine bu hatayı görüyorsunuz:</p>
          <pre style={{ backgroundColor: '#fee2e2', padding: '20px', borderRadius: '8px', overflowX: 'auto', marginTop: '20px', fontWeight: 'bold' }}>
            {String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

if (!isSupabaseConfigured) {
  root.render(
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#eff6ff', color: '#1e3a8a', minHeight: '100vh', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'black', marginBottom: '20px' }}>⚠️ SUPABASE BAĞLANTISI BULUNAMADI</h1>
      <p style={{ fontSize: '18px', maxWidth: '600px', lineHeight: '1.6' }}>
        Vercel'deki <b>Environment Variables</b> (Ortam Değişkenleri) ayarlarında <code>VITE_SUPABASE_URL</code> veya <code>VITE_SUPABASE_ANON_KEY</code> eksik.
      </p>
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
        <p style={{ fontWeight: 'bold', color: '#dc2626' }}>ÖNEMLİ: Vercel'e bu değişkenleri ekledikten sonra mutlaka "Redeploy" yapmalısınız!</p>
      </div>
    </div>
  );
} else {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
