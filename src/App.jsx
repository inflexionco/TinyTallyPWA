import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { childService } from './services/db';
import ChildProfileSetup from './components/ChildProfileSetup';
import Dashboard from './components/Dashboard';
import LogFeed from './components/LogFeed';
import LogDiaper from './components/LogDiaper';
import LogSleep from './components/LogSleep';
import LogWeight from './components/LogWeight';
import LogMedicine from './components/LogMedicine';
import LogPumping from './components/LogPumping';
import LogTummyTime from './components/LogTummyTime';
import History from './components/History';
import Milestones from './components/Milestones';
import Settings from './components/Settings';

function App() {
  const [child, setChild] = useState(null);
  const [allChildren, setAllChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      const children = await childService.getAllChildren();
      setAllChildren(children);

      if (children.length === 0) {
        setChild(null);
      } else {
        // Try to load the active child from localStorage
        const activeChildId = childService.getActiveChildId();

        if (activeChildId) {
          const activeChild = children.find(c => c.id === parseInt(activeChildId));
          if (activeChild) {
            setChild(activeChild);
          } else {
            // Active child not found, use first child
            setChild(children[0]);
            childService.setActiveChildId(children[0].id);
          }
        } else {
          // No active child set, use first child
          setChild(children[0]);
          childService.setActiveChildId(children[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading child profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChildCreated = async (newChildId) => {
    await loadChildren();
    if (newChildId) {
      childService.setActiveChildId(newChildId);
    }
  };

  const handleSwitchChild = (childId) => {
    const selectedChild = allChildren.find(c => c.id === childId);
    if (selectedChild) {
      setChild(selectedChild);
      childService.setActiveChildId(childId);
    }
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
        <Route path="/" element={<Dashboard child={child} allChildren={allChildren} onSwitchChild={handleSwitchChild} />} />
        <Route path="/log-feed" element={<LogFeed child={child} />} />
        <Route path="/log-diaper" element={<LogDiaper child={child} />} />
        <Route path="/log-sleep" element={<LogSleep child={child} />} />
        <Route path="/log-weight" element={<LogWeight child={child} />} />
        <Route path="/log-medicine" element={<LogMedicine child={child} />} />
        <Route path="/log-pumping" element={<LogPumping child={child} />} />
        <Route path="/log-tummy-time" element={<LogTummyTime child={child} />} />
        <Route path="/history" element={<History child={child} />} />
        <Route path="/milestones" element={<Milestones child={child} />} />
        <Route path="/settings" element={<Settings child={child} allChildren={allChildren} onChildUpdated={loadChildren} onChildCreated={handleChildCreated} onSwitchChild={handleSwitchChild} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
