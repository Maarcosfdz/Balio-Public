package Balio.web.rest.dtos;

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

    public int getImported() { return imported; }
    public void setImported(int imported) { this.imported = imported; }

    public int getSyncedAccounts() { return syncedAccounts; }
    public void setSyncedAccounts(int syncedAccounts) { this.syncedAccounts = syncedAccounts; }
}
