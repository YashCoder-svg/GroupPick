import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { motion, MotionConfig } from 'framer-motion';
import Navbar from './components/common/Navbar.jsx';
import Footer from './components/common/Footer.jsx';

import LandingPage from './pages/LandingPage.jsx';
import CreateGroupPage from './pages/CreateGroupPage.jsx';
import JoinStepperPage from './pages/JoinStepperPage.jsx';
import GroupLobbyPage from './pages/GroupLobbyPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import FairnessHistoryPage from './pages/FairnessHistoryPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <MotionConfig reducedMotion="user">
            <BrowserRouter>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/create" element={<CreateGroupPage />} />
                  <Route path="/join/:code" element={<JoinStepperPage />} />
                  <Route path="/lobby/:code" element={<GroupLobbyPage />} />
                  <Route path="/results/:code" element={<ResultsPage />} />
                  <Route path="/fairness/:code" element={<FairnessHistoryPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </MotionConfig>
      </AuthProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
