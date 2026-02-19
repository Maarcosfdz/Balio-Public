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
        }
        if (transaction.getCategory() != null) {
            dto.setCategoryId(transaction.getCategory().getId().toString());
            dto.setCategoryName(transaction.getCategory().getName());
        }

        return dto;
    }

    public TransactionSummaryDto toSummaryDto(Transaction transaction) {
        TransactionSummaryDto dto = new TransactionSummaryDto();
        dto.setId(transaction.getId().toString());
        dto.setName(transaction.getName());
        dto.setType(transaction.getType());
        dto.setAmount(transaction.getAmount());
        dto.setDate(transaction.getDate());
        return dto;
    }
}
