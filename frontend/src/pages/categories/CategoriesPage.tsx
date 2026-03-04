import { useTranslation } from "react-i18next";

export default function CategoriesPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("categories.title")}</h1>
      {/* TODO: lista de categorías + crear/editar */}
      <p className="text-muted-foreground">Categories placeholder</p>
    </div>
  );
}
