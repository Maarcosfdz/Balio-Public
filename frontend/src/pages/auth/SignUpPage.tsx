import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/config/routes";
import { GradientButton } from "@/components/ui/gradient-button";
import AuthCardLayout from "./components/AuthCardLayout";
import {
  getApiErrorPayload,
  hasStrongPassword,
  isValidEmail,
  mapBackendFieldErrors,
} from "./authFormUtils";

interface SignUpFormState {
  nickname: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

interface SignUpFieldErrors {
  nickname?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptedTerms?: string;
  form?: string;
}

export default function SignUpPage() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<SignUpFormState>({
    nickname: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  });
  const [errors, setErrors] = useState<SignUpFieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = useMemo(
    () =>
      isSubmitting ||
      !form.nickname.trim() ||
      !form.email.trim() ||
      !form.password.trim() ||
      !form.confirmPassword.trim(),
    [form.confirmPassword, form.email, form.nickname, form.password, isSubmitting]
  );

  const validate = (): SignUpFieldErrors => {
    const nextErrors: SignUpFieldErrors = {};

    const trimmedNickname = form.nickname.trim();
    const trimmedEmail = form.email.trim();

    if (!trimmedNickname) {
      nextErrors.nickname = t("auth.errors.required");
    } else if (trimmedNickname.length > 60) {
      nextErrors.nickname = t("auth.errors.nicknameMaxLength");
    }

    if (!trimmedEmail) {
      nextErrors.email = t("auth.errors.required");
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = t("auth.errors.invalidEmail");
    }

    if (!form.password) {
      nextErrors.password = t("auth.errors.required");
    } else if (form.password.length < 8) {
      nextErrors.password = t("auth.errors.passwordMinLength");
    } else if (form.password.length > 255) {
      nextErrors.password = t("auth.errors.passwordMaxLength");
    } else if (!hasStrongPassword(form.password)) {
      nextErrors.password = t("auth.errors.passwordPattern");
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = t("auth.errors.required");
    } else if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = t("auth.errors.passwordMismatch");
    }

    if (!form.acceptedTerms) {
      nextErrors.acceptedTerms = t("auth.errors.acceptTerms");
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
      await signUp({
        nickname: form.nickname.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error) {
      const payload = getApiErrorPayload(error);
      const fieldErrors = mapBackendFieldErrors(payload?.fieldErrors);

      const nextErrors: SignUpFieldErrors = {
        nickname: fieldErrors.nickname,
        email: fieldErrors.email,
        password: fieldErrors.password,
      };

      if (payload?.code === "project.exceptions.DuplicateInstanceException") {
        nextErrors.email = t("auth.errors.emailInUse");
      }

      if (!nextErrors.nickname && !nextErrors.email && !nextErrors.password) {
        nextErrors.form = t("auth.signUpError");
      }

      setErrors(nextErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCardLayout
      title={t("auth.signUpTitle")}
      subtitle={t("auth.signUpSubtitle")}
      closeLabel={t("auth.close")}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="nickname" className="text-sm font-semibold text-slate-700">
            {t("auth.nickname")}
          </label>
          <input
            id="nickname"
            type="text"
            autoComplete="nickname"
            value={form.nickname}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, nickname: event.target.value }))
            }
            className="h-12 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
            placeholder={t("auth.placeholders.nickname")}
            maxLength={60}
          />
          {errors.nickname ? <p className="text-sm text-red-600">{errors.nickname}</p> : null}
        </div>

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
          <label htmlFor="password" className="text-sm font-semibold text-slate-700">
            {t("auth.password")}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">
            {t("auth.confirmPassword")}
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
            }
            className="h-12 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
            placeholder={t("auth.placeholders.confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p className="text-sm text-red-600">{errors.confirmPassword}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.acceptedTerms}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, acceptedTerms: event.target.checked }))
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{t("auth.acceptTerms")}</span>
          </label>
          {errors.acceptedTerms ? (
            <p className="text-sm text-red-600">{errors.acceptedTerms}</p>
          ) : null}
        </div>

        <GradientButton
          type="submit"
          disabled={isDisabled}
          weight="normal"
          className="mt-2 h-12 w-full rounded-lg text-sm"
        >
          {isSubmitting ? t("auth.submitting") : t("auth.signUp")}
        </GradientButton>

        {errors.form ? <p className="text-sm text-red-600">{errors.form}</p> : null}
      </form>

      <div className="mt-6 border-t border-slate-200 pt-4 text-center text-sm text-slate-500">
        <span>{t("auth.hasAccount")} </span>
        <Link to={ROUTES.LOGIN} className="font-semibold text-blue-600 hover:underline">
          {t("auth.login")}
        </Link>
      </div>
    </AuthCardLayout>
  );
}
