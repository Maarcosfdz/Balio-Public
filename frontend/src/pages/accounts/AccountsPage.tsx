import { useTranslation } from "react-i18next";

export default function AccountsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("accounts.title")}</h1>
      {/* TODO: lista de cuentas + crear/editar */}
      <p className="text-muted-foreground">Accounts placeholder</p>
    </div>
  );
}
