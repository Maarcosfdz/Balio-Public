import { Building2, CreditCard, Wallet } from "lucide-react";
import type { AccountType } from "@/types";

export function typeIcon(type: AccountType) {
  if (type === "BANK") return <Building2 className="h-5 w-5" />;
  if (type === "CASH") return <Wallet className="h-5 w-5" />;
  return <CreditCard className="h-5 w-5" />;
}

export function typeBg(type: AccountType) {
  if (type === "BANK") return "bg-sky-100 text-sky-700";
  if (type === "CASH") return "bg-emerald-100 text-emerald-700";
  return "bg-violet-100 text-violet-700";
}

export function fmtAmount(n: number, currency: string, type?: "EXPENSE" | "INCOME") {
  const sign = type === "EXPENSE" ? "−" : type === "INCOME" ? "+" : "";
  const nf = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}${nf.format(Math.abs(n))} ${currency}`;
}

export function typeHeaderBg(type: AccountType) {
  if (type === "BANK") return "bg-gradient-to-br from-sky-400 to-sky-600";
  if (type === "CASH") return "bg-gradient-to-br from-emerald-400 to-emerald-600";
  return "bg-gradient-to-br from-violet-400 to-violet-600";
}
