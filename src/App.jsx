// App.jsx (build para producción)
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import VotingPage from './pages/VotingPage.jsx';
import ProjectorView from './pages/ProjectorView.jsx';
import ControlPanel from './pages/ControlPanel.jsx';
import ChristmasLayout from './components/ChristmasLayout.jsx';


function App() {
  const search = window.location.search;
  const params = new URLSearchParams(search);
  const isAdmin = params.get('admin') === 'true';

  if (!isAdmin) {
    // MODO PÚBLICO: solo ven la pantalla de votar
    return (
      <HashRouter>
        <Routes>
          <Route element={<ChristmasLayout />}>
            <Route path="/votar" element={<VotingPage />} />
            <Route path="/control" element={<ControlPanel />} />
            <Route path="*" element={<Navigate to="/votar" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    );
  }

  // MODO ADMIN: tú entras con ?admin=true y tienes todas las vistas
  return (
    <HashRouter>
      <Routes>
        <Route element={<ChristmasLayout />}>
          <Route path="/" element={<ProjectorView />} />
          <Route path="/votar" element={<VotingPage />} />
          <Route path="/control" element={<ControlPanel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;

