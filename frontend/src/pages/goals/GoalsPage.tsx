import { useTranslation } from "react-i18next";

export default function GoalsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("goals.title")}</h1>
      {/* TODO: lista de metas + crear/editar + progreso */}
      <p className="text-muted-foreground">Goals placeholder</p>
    </div>
  );
}
