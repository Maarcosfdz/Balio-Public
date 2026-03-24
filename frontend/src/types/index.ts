// ============================================
// Enums (mirror del backend como const objects)
// ============================================

export const AccountType = {
  CASH: "CASH",
  BANK: "BANK",
  OTHER: "OTHER",
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const TransactionType = {
  EXPENSE: "EXPENSE",
  INCOME: "INCOME",
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

// ============================================
// Auth DTOs
// ============================================

export interface UserDto {
  nickname: string;
  email: string;
  password?: string;
}

export interface LoginParamsDto {
  email: string;
  password: string;
}

export interface ChangePasswordParamsDto {
  oldPassword: string;
  newPassword: string;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

export interface AuthenticatedUserDto {
  id: string;
  nickname: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  preferredCurrency: string;
}

// ============================================
// Account DTOs
// ============================================

export interface AccountDto {
  name?: string;
  type?: AccountType;
  currency?: string;
  setDefault?: boolean;
}

export interface AccountSummaryDto {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  isDefault: boolean;
}

export interface AccountResponseDto {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
}

export interface AccountDeleteOptions {
  deleteTransactions?: boolean;
}

// ============================================
// Bank DTOs
// ============================================

export interface BankConnectionDto {
  id: string;
  accountId: string;
  provider: string | null;
  lastSync: string | null;
  consentExpires: string | null;
  linked: boolean;
}

export interface BankSyncResultDto {
  imported: number;
  syncedAccounts: number;
}

export interface BankRuleDto {
  namePattern?: string;
  bankCategory?: string;
  transactionType?: TransactionType;
  mappedName?: string;
  mappedCategoryId?: string;
  priority?: number;
  applyToExisting?: boolean;
  applyWindowDays?: number;
}

export interface BankRuleResponseDto {
  id: string;
  accountId: string;
  accountName: string;
  namePattern: string | null;
  bankCategory: string | null;
  transactionType: TransactionType | null;
  mappedName: string | null;
  mappedCategoryId: string | null;
  mappedCategoryName: string | null;
  priority: number;
  appliedTransactions: number;
}

// ============================================
// Transaction DTOs
// ============================================

export interface TransactionDto {
  name: string;
  amount: number;
  accountId?: string;
  type?: TransactionType;
  date?: string;
  categoryId?: string;
  affectsBalance?: boolean;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
}

export interface TransactionSummaryDto {
  id: string;
  name: string;
  type: TransactionType;
  amount: number;
  date: string;
  accountName?: string;
  categoryName?: string;
  categoryId?: string | null;
  currency?: string;
  originalCurrency?: string;
  originalAmount?: number;
}

export interface TransactionSummaryDtoWithCategoryIds extends TransactionSummaryDto {
  // helper alias — same shape
}

export interface TransactionResponseDto {
  id: string;
  name: string;
  amount: number;
  date: string;
  type: TransactionType;
  affectsBalance: boolean;
  accountId?: string | null;
  accountName?: string | null;
  accountCurrency?: string;
  categoryId: string | null;
  categoryName: string | null;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
}

export interface TransactionFilters {
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}

export interface TransactionPage {
  content: TransactionSummaryDto[];
  totalPages: number;
  totalElements: number;
  number: number;   // 0-based page index
  size: number;
}

export interface CategoryPage {
  content: CategorySummaryDto[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export interface FilterPage {
  content: FilterSummaryDto[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

// ============================================
// Category DTOs
// ============================================

export interface CategoryDto {
  name: string;
  type?: TransactionType;
  iconName?: string | null;
  iconBgColor?: string | null;
}

export interface CategorySummaryDto {
  id: string;
  name: string;
  type?: TransactionType;
  iconName?: string | null;
  iconBgColor?: string | null;
}

export interface CategoryResponseDto {
  id: string;
  name: string;
  type: TransactionType;
  iconName?: string | null;
  iconBgColor?: string | null;
  userId: string;
}

// ============================================
// Filter DTOs
// ============================================

export interface FilterDto {
  name: string;
  definition: string;
}

export interface FilterUpdateDto {
  name?: string;
  definition?: string;
}

export interface FilterSummaryDto {
  id: string;
  name: string;
}

export interface FilterResponseDto {
  id: string;
  name: string;
  definition: string;
}

// ============================================
// Goal DTOs
// ============================================

export interface GoalDto {
  name: string;
  targetAmount: number;
  iconName?: string | null;
  iconBgColor?: string | null;
}

export interface GoalUpdateDto {
  name?: string;
  targetAmount?: number;
  iconName?: string | null;
  iconBgColor?: string | null;
}

export interface GoalSummaryDto {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  iconName?: string | null;
  iconBgColor?: string | null;
}

export interface GoalResponseDto {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  iconName?: string | null;
  iconBgColor?: string | null;
}

export interface GoalAmountDto {
  amount: number;
}

// ============================================
// Budget DTOs
// ============================================

export const BudgetPeriodicity = {
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  FOUR_MONTHLY: "FOUR_MONTHLY",
  BIANNUAL: "BIANNUAL",
  ANNUAL: "ANNUAL",
} as const;
export type BudgetPeriodicity = (typeof BudgetPeriodicity)[keyof typeof BudgetPeriodicity];

export interface BudgetDto {
  name: string;
  periodicity: BudgetPeriodicity;
  startDate: string;
  iconName?: string | null;
  iconBgColor?: string | null;
}

export interface BudgetUpdateDto {
  name?: string;
  periodicity?: BudgetPeriodicity;
  startDate?: string;
  iconName?: string | null;
  iconBgColor?: string | null;
}

export interface BudgetSummaryDto {
  id: string;
  name: string;
  periodicity: BudgetPeriodicity;
  startDate: string;
  iconName?: string | null;
  iconBgColor?: string | null;
  periodStart: string;
  periodEnd: string;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  usagePercent: number;
  prevTotalBudget: number;
  prevTotalSpent: number;
  categoryCount: number;
}

export interface BudgetCategoryLinkedDto {
  id: string;
  name: string;
}

export interface BudgetCategoryTransactionDto {
  id: string;
  name: string;
  amount: number;
  date: string;
  categoryName: string | null;
  manual: boolean;
}

export interface BudgetCategoryResponseDto {
  id: string;
  name: string;
  maxAmount: number;
  displayOrder: number;
  spent: number;
  remaining: number;
  usagePercent: number;
  linkedCategories: BudgetCategoryLinkedDto[];
  transactions: BudgetCategoryTransactionDto[];
}

export interface BudgetResponseDto {
  id: string;
  name: string;
  periodicity: BudgetPeriodicity;
  startDate: string;
  iconName?: string | null;
  iconBgColor?: string | null;
  periodStart: string;
  periodEnd: string;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  usagePercent: number;
  prevTotalBudget: number;
  prevTotalSpent: number;
  categories: BudgetCategoryResponseDto[];
}

export interface BudgetCategoryDto {
  name: string;
  maxAmount: number;
  linkedCategoryIds?: string[];
}

export interface BudgetCategoryUpdateDto {
  name?: string;
  maxAmount?: number;
  linkedCategoryIds?: string[];
}

// ============================================
// Scheduled Transaction DTOs
// ============================================

export interface ScheduledTransactionDto {
  name: string;
  amount: number;
  type: TransactionType;
  accountId?: string;
  categoryId?: string;
  affectsBalance?: boolean;
  freqYears: number;
  freqMonths: number;
  freqWeeks: number;
  freqDays: number;
  startDate: string;
}

export interface ScheduledTransactionUpdateDto {
  name?: string;
  amount?: number;
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  affectsBalance?: boolean;
  freqYears?: number;
  freqMonths?: number;
  freqWeeks?: number;
  freqDays?: number;
  startDate?: string;
  active?: boolean;
}

export interface ScheduledTransactionResponseDto {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  affectsBalance: boolean;
  freqYears: number;
  freqMonths: number;
  freqWeeks: number;
  freqDays: number;
  startDate: string;
  lastExecution: string | null;
  nextExecution: string | null;
  active: boolean;
  accountId: string | null;
  accountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
}

export interface ScheduledTransactionPage {
  content: ScheduledTransactionResponseDto[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

// ============================================
// CSV Import/Export DTOs
// ============================================

export interface CsvImportRuleDto {
  pattern: string;
  categoryId: string;
  transactionType?: string; // "EXPENSE" | "INCOME" | undefined (both)
  mappedName?: string;
}

// ============================================
// Transaction Batch Rule DTOs
// ============================================

export interface TransactionBatchRuleDto {
  // Filters
  nameContains?: string;
  categoryIds?: string[];
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  // Actions
  newName?: string;
  newCategoryId?: string;
}

export interface CsvImportResultDto {
  imported: number;
  skipped: number;
  errors: string[];
}

// ============================================
// Error DTOs
// ============================================

export interface ErrorResponseDto {
  globalError: string;
  fieldErrors?: FieldErrorDto[];
}

export interface FieldErrorDto {
  fieldName: string;
  message: string;
}
