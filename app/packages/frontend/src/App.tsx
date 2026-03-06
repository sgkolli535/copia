import React, { useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ProfileEditor from './pages/ProfileEditor';
import EstatePlan from './pages/EstatePlan';
import ScenarioExplorer from './pages/ScenarioExplorer';
import AuditTrail from './pages/AuditTrail';
import MoneyEventIntake from './pages/MoneyEventIntake';
import MobilityAnalysis from './pages/MobilityAnalysis';
import PermittedActionsExplorer from './pages/PermittedActionsExplorer';
import Chat from './pages/Chat';
import { emitEvent, getEventLog } from './store/analytics';

export default function App() {
  const sessionStartRef = useRef(Date.now());

  useEffect(() => {
    const handleUnload = () => {
      const log = getEventLog();
      emitEvent({
        type: 'session_ended',
        durationMs: Date.now() - sessionStartRef.current,
        scenariosExplored: log.filter((e) => e.type === 'scenario_explored').length,
        citationsExpanded: log.filter((e) => e.type === 'citation_expanded').length,
        timestamp: new Date().toISOString(),
        sessionId: 'prototype',
      });
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return (
    <div className="min-h-screen bg-cream-50">
      <Sidebar />
      <main className="ml-sidebar min-h-screen">
        <div className="max-w-content mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<ProfileEditor />} />
            <Route path="/estate-plan" element={<EstatePlan />} />
            <Route path="/scenarios" element={<ScenarioExplorer />} />
            <Route path="/audit" element={<AuditTrail />} />
            <Route path="/money-event" element={<MoneyEventIntake />} />
            <Route path="/mobility" element={<MobilityAnalysis />} />
            <Route path="/actions" element={<PermittedActionsExplorer />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
