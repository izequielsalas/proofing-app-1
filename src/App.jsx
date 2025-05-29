import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ProofViewer from './components/ProofViewer';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-navy text-navy py-6 shadow">
        <h1 className="text-3xl font-bold text-center">
          Printshop Proofing App
        </h1>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <Auth />
        <Dashboard />
        <ProofViewer />
      </main>
    </div>
  );
}

export default App;
