// src/App.jsx
import { HashRouter, Routes, Route } from 'react-router-dom';
import ProjectorView from './pages/ProjectorView.jsx';
import VotingPage from './pages/VotingPage.jsx';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ProjectorView />} />
        <Route path="/votar" element={<VotingPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
