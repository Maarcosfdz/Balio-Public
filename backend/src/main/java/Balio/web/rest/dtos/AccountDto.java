package Balio.web.rest.dtos;

import Balio.web.enums.AccountType;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AccountDto {

    @Size(max = 80)
    private String name;

    private AccountType type; // CASH / BANK / OTHER

    @Size(max = 3)
    private String currency;

    private Boolean setDefault;

    private Boolean syncDeletedTransactions;
}
