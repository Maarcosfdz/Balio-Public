package Balio.web.rest.dtos;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BankSyncResultDto {

    private int imported;
    private int syncedAccounts;

    public BankSyncResultDto() {
    }

    public BankSyncResultDto(int imported) {
        this.imported = imported;
        this.syncedAccounts = imported > 0 ? 1 : 0;
    }

    public BankSyncResultDto(int imported, int syncedAccounts) {
        this.imported = imported;
        this.syncedAccounts = syncedAccounts;
    }
}
