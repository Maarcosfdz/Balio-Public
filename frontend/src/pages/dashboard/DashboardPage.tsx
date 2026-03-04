import { useTranslation } from "react-i18next";

export default function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
      {/* TODO: cards de balance, gráficos, transacciones recientes */}
      <p className="text-muted-foreground">Dashboard placeholder</p>
    </div>
  );
}
