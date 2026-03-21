import React, {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  AlignLeft,
  Eye,
  EyeOff,
  KeyRound,
  LayoutTemplate,
  Loader2,
  Pencil,
  Save,
  ShieldAlert,
  User,
  X,
} from "lucide-react";
import { authService } from "@/backend/authService";
import { useAuth } from "@/contexts/AuthContext";
import { ToastBanner, type ToastBannerTone } from "@/components/ui/toast-banner";
import { FieldError } from "@/components/ui/field-error";

// ── Small reusable components ────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            {icon}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
            {desc && <p className="text-xs text-slate-400">{desc}</p>}
          </div>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  required,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete="off"
        className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 pr-10 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

type Toast = { type: Extract<ToastBannerTone, "success" | "error">; message: string };

// ── Profile section ──────────────────────────────────────────────────────

function ProfileSection({ onToast }: { onToast: (t: Toast) => void }) {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();

  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [editingField, setEditingField] = useState<"nickname" | "email" | null>(null);
  const [loading, setLoading] = useState(false);
  const [nicknameError, setNicknameError] = useState("");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    setNickname(user?.nickname ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  const dirty =
    nickname.trim() !== (user?.nickname ?? "") ||
    email.trim() !== (user?.email ?? "");

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setNicknameError("");
    setEmailError("");
    if (!nickname.trim()) { setNicknameError(t("settings.errors.nicknameRequired")); return; }
    if (!email.trim()) { setEmailError(t("settings.errors.emailRequired")); return; }
    setLoading(true);
    try {
      const updated = await authService.updateProfile(user.id, {
        nickname: nickname.trim(),
        email: email.trim(),
      });
      updateUser({ id: user.id, nickname: updated.nickname, email: updated.email });
      setEditingField(null);
      onToast({ type: "success", message: t("settings.profileUpdated") });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setEmailError(t("settings.errors.emailInUse"));
      } else {
        setEmailError(t("common.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setNickname(user?.nickname ?? "");
    setEmail(user?.email ?? "");
    setEditingField(null);
  };

  const fields: Array<{
    key: "nickname" | "email";
    label: string;
    value: string;
    setter: (v: string) => void;
    type: string;
    fieldError: string;
  }> = [
    {
      key: "nickname",
      label: t("settings.nickname"),
      value: nickname,
      setter: setNickname,
      type: "text",
      fieldError: nicknameError,
    },
    {
      key: "email",
      label: t("settings.emailAddress"),
      value: email,
      setter: setEmail,
      type: "email",
      fieldError: emailError,
    },
  ];

  return (
    <SectionCard icon={<User className="h-5 w-5" />} title={t("settings.profileDetails")}>
      <form onSubmit={handleSave} className="space-y-4">
        {fields.map(({ key, label, value, setter, type, fieldError }) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {label}
            </label>
            <div className="flex items-center gap-2">
              {editingField === key ? (
                <input
                  autoFocus
                  type={type}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="h-10 w-full rounded-lg border border-sky-400 bg-sky-50/50 px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-sky-100"
                />
              ) : (
                <span className="flex h-10 flex-1 items-center rounded-lg border border-slate-100 bg-slate-50 px-3 text-sm font-medium text-slate-800">
                  {value}
                </span>
              )}
              <button
                type="button"
                onClick={() => setEditingField(editingField === key ? null : key)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                  editingField === key
                    ? "border-sky-300 bg-sky-50 text-sky-600"
                    : "border-slate-200 text-slate-400 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600"
                }`}
              >
                <Pencil className="btn-edit-icon h-4 w-4" />
              </button>
            </div>
            <FieldError message={fieldError} />
          </div>
        ))}

        {dirty && (
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleReset}
              className="btn-cancel-draw"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="squishy-save-simple"
            >
              {loading ? <Loader2 className="squishy-save-icon h-4 w-4 animate-spin" /> : <Save className="squishy-save-icon h-4 w-4" />}
              {t("common.save")}
            </button>
          </div>
        )}
      </form>
    </SectionCard>
  );
}

// ── Password section ─────────────────────────────────────────────────────

function PasswordSection({ onToast }: { onToast: (t: Toast) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [oldPwdError, setOldPwdError] = useState("");
  const [confirmPwdError, setConfirmPwdError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setOldPwdError("");
    setConfirmPwdError("");
    if (newPwd !== confirmPwd) {
      setConfirmPwdError(t("settings.errors.passwordMismatch"));
      return;
    }
    setLoading(true);
    try {
      await authService.changePassword(user.id, {
        oldPassword: oldPwd,
        newPassword: newPwd,
      });
      setOldPwd(""); setNewPwd(""); setConfirmPwd("");
      onToast({ type: "success", message: t("settings.passwordChanged") });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 400) {
        setOldPwdError(t("settings.errors.wrongPassword"));
      } else {
        setOldPwdError(t("common.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard
      icon={<KeyRound className="h-5 w-5" />}
      title={t("settings.changePassword")}
      desc={t("settings.changePwdDesc")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="oldPwd" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("settings.oldPassword")}
          </label>
          <PasswordInput id="oldPwd" value={oldPwd} onChange={setOldPwd} required />
          <FieldError message={oldPwdError} />
        </div>
        <div className="space-y-1">
          <label htmlFor="newPwd" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("settings.newPassword")}
          </label>
          <PasswordInput id="newPwd" value={newPwd} onChange={setNewPwd} required />
        </div>
        <div className="space-y-1">
          <label htmlFor="confirmPwd" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("settings.confirmPassword")}
          </label>
          <PasswordInput id="confirmPwd" value={confirmPwd} onChange={setConfirmPwd} required />
          <FieldError message={confirmPwdError} />
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={loading || !oldPwd || !newPwd || !confirmPwd}
            className="squishy-save-simple"
          >
            {loading ? <Loader2 className="squishy-save-icon h-4 w-4 animate-spin" /> : <Save className="squishy-save-icon h-4 w-4" />}
            {t("common.save")}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

// ── Navigation + Language ────────────────────────────────────────────────

type NavStyle = "vertical" | "horizontal";
type Lang = "es" | "en" | "gl";

const LANG_OPTIONS: { code: Lang; label: string; src: string }[] = [
  { code: "en", label: "English",    src: "/banderaGB.png" },
  { code: "es", label: "Spanish",    src: "/banderasES.png" },
  { code: "gl", label: "Galician",   src: "/banderasGL.png" },
];

function PreferencesSection({ onToast }: { onToast: (t: Toast) => void }) {
  const { t, i18n } = useTranslation();

  const savedNav = (localStorage.getItem("navStyle") as NavStyle | null) ?? "vertical";
  const [nav, setNav] = useState<NavStyle>(savedNav);
  const [navInitial, setNavInitial] = useState<NavStyle>(savedNav);

  const currentLang = (localStorage.getItem("language") as Lang | null)
    ?? (i18n.language?.slice(0, 2) as Lang)
    ?? "es";
  const [lang, setLang] = useState<Lang>(currentLang);
  const [langInitial, setLangInitial] = useState<Lang>(currentLang);

  const dirty = nav !== navInitial || lang !== langInitial;

  const handleSave = () => {
    localStorage.setItem("navStyle", nav);
    localStorage.setItem("language", lang);
    i18n.changeLanguage(lang);
    // Notify AppLayout to re-render with new navStyle
    window.dispatchEvent(new Event("balio:navstyle-changed"));
    setNavInitial(nav);
    setLangInitial(lang);
    onToast({ type: "success", message: t("common.saved") });
  };

  const handleReset = () => {
    setNav(navInitial);
    setLang(langInitial);
  };

  return (
    <div className="space-y-4">
      {/* Navigation Style */}
      <SectionCard
        icon={<LayoutTemplate className="h-5 w-5" />}
        title={t("settings.navigationStyle")}
        desc={t("settings.navDesc")}
      >
        <div className="flex gap-2">
          {(["vertical", "horizontal"] as NavStyle[]).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNav(n)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
                nav === n
                  ? "border-transparent bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow"
                  : "border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50"
              }`}
            >
              {n === "vertical" ? (
                <AlignLeft className="h-4 w-4" />
              ) : (
                <LayoutTemplate className="h-4 w-4" />
              )}
              {n === "vertical" ? t("settings.navVertical") : t("settings.navHorizontal")}
              {nav === n && (
                <span className="ml-1 flex h-3 w-3 items-center justify-center rounded-full bg-white/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              )}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Language */}
      <SectionCard
        icon={
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        }
        title={t("settings.language")}
        desc={t("settings.langDesc")}
      >
        <div className="flex flex-wrap gap-2">
          {LANG_OPTIONS.map(({ code, label, src }) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                lang === code
                  ? "border-transparent bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow"
                  : "border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50"
              }`}
            >
              <span className="overflow-hidden rounded-sm" style={{ lineHeight: 0 }}>
                <img src={src} alt={label} className="h-5 w-auto" />
              </span>
              {label}
              <span
                className={`ml-1 flex h-4 w-4 items-center justify-center rounded-full border-2 transition ${
                  lang === code ? "border-white bg-white/30" : "border-slate-300 bg-white"
                }`}
              >
                {lang === code && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Save/Reset */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={!dirty}
          className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          {t("settings.resetChanges")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty}
          className="squishy-save-btn"
        >
          {t("settings.savePreferences")}
        </button>
      </div>
    </div>
  );
}

// ── Danger Zone ──────────────────────────────────────────────────────────

function DangerSection() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const CONFIRM_WORD = i18n.language?.startsWith("en") ? "delete" : "eliminar";
  const canDelete = typed.toLowerCase() === CONFIRM_WORD;

  const openDialog = () => {
    setTyped("");
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setTyped("");
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  const handleDelete = () => {
    if (!canDelete) return;
    // TODO: call DELETE /user/{id} when endpoint is implemented
    closeDialog();
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-red-200 bg-red-50/50 shadow-sm">
        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="font-bold text-red-700">{t("settings.dangerZone")}</p>
              <p className="text-sm text-red-500">{t("settings.dangerDesc")}</p>
            </div>
          </div>
          <button
            onClick={openDialog}
            className="shrink-0 rounded-xl border-2 border-red-400 px-5 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"
          >
            {t("settings.deleteAccount")}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={closeDialog}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                </div>
                <h2 className="text-base font-bold text-slate-800">
                  {t("settings.deleteConfirmTitle")}
                </h2>
              </div>
              <button
                onClick={closeDialog}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-600">{t("settings.deleteConfirmDesc")}</p>

            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={t("settings.deleteTypePlaceholder")}
              className={`h-10 w-full rounded-lg border px-3 text-sm outline-none transition ${
                typed.length > 0 && !canDelete
                  ? "border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100"
                  : "border-slate-300 bg-slate-50 focus:border-red-400 focus:ring-2 focus:ring-red-100"
              }`}
            />

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-cancel-draw flex-1 justify-center"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete}
                className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("settings.deleteAccount")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { t } = useTranslation();
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (newToast: Toast) => {
    setToast(newToast);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{t("settings.title")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("settings.subtitle")}</p>
        </div>

        <ProfileSection onToast={showToast} />
        <PasswordSection onToast={showToast} />
        <PreferencesSection onToast={showToast} />
        <DangerSection />

        <p className="pb-4 text-center text-xs text-slate-300">
          Balio Finance © {new Date().getFullYear()}
        </p>
      </div>

      {toast ? (
        <ToastBanner
          tone={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      ) : null}
    </>
  );
}
