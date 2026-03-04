import { useTranslation } from "react-i18next";

export default function TransactionsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("transactions.title")}</h1>
      {/* TODO: lista de transacciones + filtros + crear */}
      <p className="text-muted-foreground">Transactions placeholder</p>
    </div>
  );
}
