import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PublicRoute from "@/app/PublicRoute";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";

const mockUseAuth = vi.mocked(useAuth);

function renderPublicRoute() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<div>Login page</div>} />
        </Route>
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PublicRoute", () => {
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

    renderPublicRoute();

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });

  it("renders the public page when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      signUp: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    renderPublicRoute();

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard page")).not.toBeInTheDocument();
  });

  it("redirects to dashboard when user is already authenticated", () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: "1", nickname: "Alice", email: "alice@example.com", preferredCurrency: "EUR" },
      login: vi.fn(),
      signUp: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    renderPublicRoute();

    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });
});
