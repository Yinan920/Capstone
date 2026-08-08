import { Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import AppShell from './components/layout/AppShell';
import RequireAuth from './components/auth/RequireAuth';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Upgrade from './pages/Upgrade';
import Competitors from './pages/Competitors';
import Alerts from './pages/Alerts';
import ReplyStudio from './pages/ReplyStudio';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="upload" element={<Upload />} />
        <Route path="competitors" element={<Competitors />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="reply" element={<ReplyStudio />} />
        <Route path="upgrade" element={<Upgrade />} />
      </Route>
    </Routes>
  );
}
