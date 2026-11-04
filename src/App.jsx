import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SchoolProvider } from "./context/SchoolContext";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SchoolProvider><AppRoutes /></SchoolProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
