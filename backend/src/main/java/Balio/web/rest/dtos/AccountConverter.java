package Balio.web.rest.dtos;

import Balio.web.model.entities.Account;
import java.util.UUID;

import org.springframework.stereotype.Component;

@Component
public class AccountConverter {

    public AccountResponseDto toResponseDto(Account account) {
        AccountResponseDto dto = new AccountResponseDto();
        dto.setId(account.getId().toString());
        dto.setName(account.getName());
        dto.setType(account.getType());
        dto.setCurrency(account.getCurrency());
        dto.setBalance(account.getBalance());
        return dto;
    }

    public AccountSummaryDto toSummaryDto(Account account, UUID defaultAccountId) {
        AccountSummaryDto dto = new AccountSummaryDto();
        dto.setId(account.getId().toString());
        dto.setName(account.getName());
        dto.setType(account.getType());
        dto.setCurrency(account.getCurrency());
        dto.setBalance(account.getBalance());
        dto.setDefault(defaultAccountId != null && defaultAccountId.equals(account.getId()));
        return dto;
    }
}
