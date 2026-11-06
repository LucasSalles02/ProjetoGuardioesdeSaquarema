import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute, AdminRoute, PermissionRoute } from "./RouteGuards";
import AppLayout from "../layouts/AppLayout";
import Aprender from "../pages/Aprender";
import Conquistas from "../pages/Conquistas";
import Conta from "../pages/Conta";
import Dashboard from "../pages/Dashboard";
import GestaoConteudo from "../pages/GestaoConteudo";
import Jogos from "../pages/Jogos";
import MeuProgresso from "../pages/MeuProgresso";
import MissoesDiarias from "../pages/MissoesDiarias";
import ModuloAprender from "../pages/ModuloAprender";
import AdminDashboard from "../pages/AdminDashboard";
import AdminSchools from "../pages/AdminSchools";
import AdminUsers from "../pages/AdminUsers";
import AdminLogin from "../pages/AdminLogin";
import TelaBoasVindas from "../pages/TelaBoasVindas";
import AdminUserForm from "../pages/AdminUserForm";
import SchoolManagement from "../pages/SchoolManagement";
import SchoolClasses from "../pages/SchoolClasses";
import SelectSchool from "../pages/SelectSchool";
import FirstAccess from "../pages/FirstAccess";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/primeiro-acesso" element={<FirstAccess />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<TelaBoasVindas />} />
        <Route path="/cadastro" element={<Navigate to="/login" replace />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/selecionar-unidade" element={<SelectSchool />} />
        <Route element={<AppLayout />}><Route element={<PermissionRoute />}>
          <Route index element={<Dashboard />} />
          <Route path="/gestao-escolar" element={<SchoolManagement />} />
          <Route path="/gestao-escolar/turmas" element={<SchoolClasses />} />
          <Route path="/gestao-escolar/turmas/:classId" element={<SchoolClasses />} />
          <Route path="/gestao-escolar/alunos" element={<SchoolClasses />} />
          <Route path="/missoes" element={<MissoesDiarias />} />
          <Route path="/aprender" element={<Aprender />} />
          <Route path="/aprender/:moduloId" element={<ModuloAprender />} />
          <Route path="/conquistas" element={<Conquistas />} />
          <Route path="/progresso" element={<MeuProgresso />} />
          <Route path="/conta" element={<Conta />} />
          <Route path="/jogos" element={<Jogos />} />
        </Route></Route>
      </Route>

      <Route element={<AdminRoute />}>
        <Route element={<AppLayout />}><Route element={<PermissionRoute />}>
          <Route path="/admin/unidades-escolares" element={<AdminSchools />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/destaques" element={<Navigate to="/gestao?aba=destaques" replace />} />
          <Route path="/admin/usuarios" element={<AdminUsers />} />
          <Route path="/admin/usuarios/novo" element={<AdminUserForm />} />
          <Route path="/admin/usuarios/:userId/editar" element={<AdminUsers />} />
          <Route path="/gestao" element={<GestaoConteudo />} />
        </Route></Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

