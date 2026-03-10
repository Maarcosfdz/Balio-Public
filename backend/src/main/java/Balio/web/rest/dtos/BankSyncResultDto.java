package Balio.web.rest.dtos;

public class BankSyncResultDto {

    private int imported;

    public BankSyncResultDto() {
    }

    public BankSyncResultDto(int imported) {
        this.imported = imported;
    }

    public int getImported() { return imported; }
    public void setImported(int imported) { this.imported = imported; }
}
