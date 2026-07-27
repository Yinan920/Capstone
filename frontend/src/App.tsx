import { Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import AppShell from './components/layout/AppShell';
import Dashboard from './pages/Dashboard';
import Competitors from './pages/Competitors';
import Alerts from './pages/Alerts';
import ReplyStudio from './pages/ReplyStudio';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="competitors" element={<Competitors />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="reply" element={<ReplyStudio />} />
      </Route>
    </Routes>
  );
}
