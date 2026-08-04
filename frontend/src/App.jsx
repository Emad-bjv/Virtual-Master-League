import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainDashboard from './pages/MainDashboard';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
