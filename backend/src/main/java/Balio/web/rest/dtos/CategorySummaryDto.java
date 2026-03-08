package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;

public class CategorySummaryDto {

    private String id;
    private String name;
    private TransactionType type;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public TransactionType getType() { return type; }
    public void setType(TransactionType type) { this.type = type; }
}
