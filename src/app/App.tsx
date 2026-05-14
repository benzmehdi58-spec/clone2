import { RouterProvider } from "react-router";
import { router } from "./routes";
import { useEffect } from "react";
import "../styles/scrollbar.css";
import "../styles/fonts.css";

export default function App() {
  // Force dark mode on document body
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return <RouterProvider router={router} />;
}
