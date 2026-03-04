import { useTranslation } from "react-i18next";

export default function FiltersPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("filters.title")}</h1>
      {/* TODO: lista de filtros guardados + crear/aplicar */}
      <p className="text-muted-foreground">Filters placeholder</p>
    </div>
  );
}
