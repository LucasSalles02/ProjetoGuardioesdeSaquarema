import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { RewardProvider } from "./context/RewardContext";
import { SchoolProvider } from "./context/SchoolContext";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RewardProvider><SchoolProvider><AppRoutes /></SchoolProvider></RewardProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
