package Balio.web.rest.dtos;

import Balio.web.enums.AccountType;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class AccountResponseDto {

    private String id;
    private String name;
    private AccountType type;
    private String currency;
    private BigDecimal balance;
}
