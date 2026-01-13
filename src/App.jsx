import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { childService } from './services/db';
import ChildProfileSetup from './components/ChildProfileSetup';
import Dashboard from './components/Dashboard';
import LogFeed from './components/LogFeed';
import LogDiaper from './components/LogDiaper';
import LogSleep from './components/LogSleep';
import History from './components/History';
import Settings from './components/Settings';

function App() {
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChild();
  }, []);

  const loadChild = async () => {
    try {
      const childData = await childService.getChild();
      setChild(childData);
    } catch (error) {
      console.error('Error loading child profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChildCreated = async () => {
    await loadChild();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading TinyTally...</p>
        </div>
      </div>
    );
  }

  if (!child) {
    return <ChildProfileSetup onChildCreated={handleChildCreated} />;
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <Routes>
        <Route path="/" element={<Dashboard child={child} />} />
        <Route path="/log-feed" element={<LogFeed child={child} />} />
        <Route path="/log-diaper" element={<LogDiaper child={child} />} />
        <Route path="/log-sleep" element={<LogSleep child={child} />} />
        <Route path="/history" element={<History child={child} />} />
        <Route path="/settings" element={<Settings child={child} onChildUpdated={loadChild} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
