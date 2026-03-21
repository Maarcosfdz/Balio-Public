package Balio.web.rest.dtos;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class TransactionLinkDto {

    @NotNull
    private UUID transactionId;

    public UUID getTransactionId() { return transactionId; }
    public void setTransactionId(UUID transactionId) { this.transactionId = transactionId; }
}
