package Balio.web.rest.dtos;

import Balio.web.model.entities.BankConnection;
import Balio.web.model.entities.BankTransactionRule;

import org.springframework.stereotype.Component;

@Component
public class BankConverter {

    public BankConnectionDto toConnectionDto(BankConnection connection) {
        BankConnectionDto dto = new BankConnectionDto();
        dto.setId(connection.getId().toString());
        dto.setAccountId(connection.getAccount().getId().toString());
        dto.setProvider(connection.getProvider());
        dto.setLastSync(connection.getLastSync());
        dto.setConsentExpires(connection.getConsentExpires());
        dto.setLinked(true);
        return dto;
    }

    public BankRuleResponseDto toRuleResponseDto(BankTransactionRule rule) {
        BankRuleResponseDto dto = new BankRuleResponseDto();
        dto.setId(rule.getId().toString());
        dto.setAccountId(rule.getAccount().getId().toString());
        dto.setAccountName(rule.getAccount().getName());
        dto.setNamePattern(rule.getNamePattern());
        dto.setBankCategory(rule.getBankCategory());
        dto.setTransactionType(rule.getTransactionType());
        dto.setMappedName(rule.getMappedName());
        dto.setPriority(rule.getPriority());

        if (rule.getMappedCategory() != null) {
            dto.setMappedCategoryId(rule.getMappedCategory().getId().toString());
            dto.setMappedCategoryName(rule.getMappedCategory().getName());
        }

        return dto;
    }
}
