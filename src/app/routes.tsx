import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Alerts } from "./pages/Alerts";
import { AlertDetail } from "./pages/AlertDetail";
import { Explorer } from "./pages/Explorer";
import { Models } from "./pages/Models";
import { Settings } from "./pages/Settings";
import { Simulation } from "./pages/Simulation";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "alerts", Component: Alerts },
      { path: "alerts/:id", Component: AlertDetail },
      { path: "explorer", Component: Explorer },
      { path: "models", Component: Models },
      { path: "simulation", Component: Simulation },
      { path: "settings", Component: Settings },
    ],
  },
]);
