// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProjectorView from './pages/ProjectorView.jsx';
import VotingPage from './pages/VotingPage.jsx';

function App() {
  return (
    <BrowserRouter basename="/premios">
      <Routes>
        <Route path="/" element={<ProjectorView />} />
        <Route path="/votar" element={<VotingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
