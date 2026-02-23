package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;

public class TransactionSummaryDto {

    private String id;
    private String name;
    private TransactionType type;
    private BigDecimal amount;
    private LocalDate date;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public TransactionType getType() { return type; }
    public void setType(TransactionType type) { this.type = type; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
}
