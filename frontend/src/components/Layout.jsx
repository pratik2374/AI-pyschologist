import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="header-brand">
          <img src="/brain.svg" alt="" className="header-icon" />
          <h1 className="header-title">AI Psychologist</h1>
        </div>
        <nav className="header-nav">
          <span className="header-user">{user?.name || user?.email || "You"}</span>
          <button type="button" className="btn-logout" onClick={logout}>
            Logout
          </button>
        </nav>
      </header>
      <main className="layout-main">{children}</main>
    </div>
  );
}
