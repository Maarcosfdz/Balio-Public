package Balio.web.rest.dtos;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
public class BankConnectionDto {

    private String id;
    private String accountId;
    private String provider;
    private Instant lastSync;
    private Instant consentExpires;
    private boolean linked;
}
