import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/config/routes";
import AuthCardLayout from "./components/AuthCardLayout";
import { getApiErrorPayload, isValidEmail, mapBackendFieldErrors } from "./authFormUtils";

interface LoginFormState {
  email: string;
  password: string;
}

interface LoginFieldErrors {
  email?: string;
  password?: string;
  form?: string;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<LoginFormState>({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = useMemo(
    () => isSubmitting || !form.email.trim() || !form.password.trim(),
    [form.email, form.password, isSubmitting]
  );

  const validate = (): LoginFieldErrors => {
    const nextErrors: LoginFieldErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = t("auth.errors.required");
    } else if (!isValidEmail(form.email.trim())) {
      nextErrors.email = t("auth.errors.invalidEmail");
    }

    if (!form.password.trim()) {
      nextErrors.password = t("auth.errors.required");
    }

    return nextErrors;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await login({
        email: form.email.trim(),
        password: form.password,
      });
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error) {
      const payload = getApiErrorPayload(error);
      const fieldErrors = mapBackendFieldErrors(payload?.fieldErrors);

      if (Object.keys(fieldErrors).length > 0) {
        setErrors({
          email: fieldErrors.email,
          password: fieldErrors.password,
        });
      } else {
        setErrors({ password: t("auth.loginError") });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCardLayout
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      closeLabel={t("auth.close")}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-semibold text-slate-700">
            {t("auth.email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            className="h-12 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
            placeholder={t("auth.placeholders.email")}
          />
          {errors.email ? <p className="text-sm text-red-600">{errors.email}</p> : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-semibold text-slate-700">
              {t("auth.password")}
            </label>
            <span className="text-xs font-medium text-blue-600">
              {t("auth.forgotPassword")}
            </span>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="h-12 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
              placeholder={t("auth.placeholders.password")}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword ? t("auth.hidePassword") : t("auth.showPassword")
              }
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password ? <p className="text-sm text-red-600">{errors.password}</p> : null}
        </div>

        <button
          type="submit"
          disabled={isDisabled}
          className="mt-2 h-12 w-full rounded-lg bg-gradient-to-r from-blue-600 to-emerald-500 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? t("auth.submitting") : t("auth.login")}
        </button>

        {errors.form ? <p className="text-sm text-red-600">{errors.form}</p> : null}
      </form>

      <div className="mt-6 border-t border-slate-200 pt-4 text-center text-sm text-slate-500">
        <span>{t("auth.noAccount")} </span>
        <Link to={ROUTES.SIGNUP} className="font-semibold text-blue-600 hover:underline">
          {t("auth.signUp")}
        </Link>
      </div>
    </AuthCardLayout>
  );
}
