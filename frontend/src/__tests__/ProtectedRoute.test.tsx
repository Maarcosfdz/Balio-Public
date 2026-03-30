import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/app/ProtectedRoute";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";

const mockUseAuth = vi.mocked(useAuth);

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Route>
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProtectedRoute", () => {
  it("shows a loading spinner while auth is being determined", () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      signUp: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    renderProtectedRoute();

    // spinner is a div with animate-spin class
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
  });

  it("renders child route when user is authenticated", () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: "1", nickname: "Alice", email: "alice@example.com", preferredCurrency: "EUR" },
      login: vi.fn(),
      signUp: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    renderProtectedRoute();

    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("redirects to home when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      signUp: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    renderProtectedRoute();

    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
    expect(screen.getByText("Home page")).toBeInTheDocument();
  });
});
