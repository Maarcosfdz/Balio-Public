package Balio.web.rest.dtos;

import Balio.web.enums.AccountType;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class AccountSummaryDto {

    private String id;
    private String name;
    private AccountType type;
    private String currency;
    private BigDecimal balance;
    @JsonProperty("isDefault")
    private boolean isDefault;
    private boolean syncDeletedTransactions;
}
