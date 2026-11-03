import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute, AdminRoute } from "./RouteGuards";
import AppLayout from "../layouts/AppLayout";
import Aprender from "../pages/Aprender";
import Conquistas from "../pages/Conquistas";
import Conta from "../pages/Conta";
import CriarPerfil from "../pages/CriarPerfil";
import Dashboard from "../pages/Dashboard";
import GestaoConteudo from "../pages/GestaoConteudo";
import Jogos from "../pages/Jogos";
import MeuProgresso from "../pages/MeuProgresso";
import MissoesDiarias from "../pages/MissoesDiarias";
import ModuloAprender from "../pages/ModuloAprender";
import AdminDashboard from "../pages/AdminDashboard";
import AdminLogin from "../pages/AdminLogin";
import TelaBoasVindas from "../pages/TelaBoasVindas";
import AdminUserForm from "../pages/AdminUserForm";
import FirstAccess from "../pages/FirstAccess";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/primeiro-acesso" element={<FirstAccess />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<TelaBoasVindas />} />
        <Route path="/cadastro" element={<CriarPerfil />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="/missoes" element={<MissoesDiarias />} />
          <Route path="/aprender" element={<Aprender />} />
          <Route path="/aprender/:moduloId" element={<ModuloAprender />} />
          <Route path="/conquistas" element={<Conquistas />} />
          <Route path="/progresso" element={<MeuProgresso />} />
          <Route path="/conta" element={<Conta />} />
          <Route path="/jogos" element={<Jogos />} />
        </Route>
      </Route>

      <Route element={<AdminRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/usuarios/novo" element={<AdminUserForm />} />
          <Route path="/admin/usuarios/:userId/editar" element={<AdminUserForm />} />
          <Route path="/gestao" element={<GestaoConteudo />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

