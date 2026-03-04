import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
      {/* TODO: perfil, cambiar contraseña, idioma */}
      <p className="text-muted-foreground">Settings placeholder</p>
    </div>
  );
}
