package Balio.web.rest.dtos;

import Balio.web.model.entities.Transaction;

import org.springframework.stereotype.Component;

@Component
public class TransactionConverter {

    public TransactionResponseDto toResponseDto(Transaction transaction) {
        TransactionResponseDto dto = new TransactionResponseDto();
        dto.setId(transaction.getId().toString());
        dto.setName(transaction.getName());
        dto.setAmount(transaction.getAmount());
        dto.setDate(transaction.getDate());
        dto.setType(transaction.getType());
        dto.setAffectsBalance(transaction.isAffectsBalance());

        if (transaction.getAccount() != null) {
            dto.setAccountId(transaction.getAccount().getId().toString());
            dto.setAccountName(transaction.getAccount().getName());
            dto.setAccountCurrency(transaction.getAccount().getCurrency());
        }
        if (transaction.getCategory() != null) {
            dto.setCategoryId(transaction.getCategory().getId().toString());
            dto.setCategoryName(transaction.getCategory().getName());
        }
        dto.setBankCategory(transaction.getBankCategory());

        // Currency info
        dto.setOriginalAmount(transaction.getOriginalAmount());
        dto.setOriginalCurrency(transaction.getOriginalCurrency());
        dto.setExchangeRate(transaction.getExchangeRate());

        return dto;
    }

    public TransactionSummaryDto toSummaryDto(Transaction transaction) {
        TransactionSummaryDto dto = new TransactionSummaryDto();
        dto.setId(transaction.getId().toString());
        dto.setName(transaction.getName());
        dto.setType(transaction.getType());
        dto.setAmount(transaction.getAmount());
        dto.setDate(transaction.getDate());

        if (transaction.getAccount() != null) {
            dto.setAccountName(transaction.getAccount().getName());
            dto.setCurrency(transaction.getAccount().getCurrency());
        }
        if (transaction.getCategory() != null) {
            dto.setCategoryName(transaction.getCategory().getName());
            dto.setCategoryId(transaction.getCategory().getId().toString());
        }

        // Only set original currency info when cross-currency
        String acctCurrency = transaction.getAccount() != null
                ? transaction.getAccount().getCurrency() : "EUR";
        if (!acctCurrency.equals(transaction.getOriginalCurrency())) {
            dto.setOriginalCurrency(transaction.getOriginalCurrency());
            dto.setOriginalAmount(transaction.getOriginalAmount());
        }

        return dto;
    }
}
