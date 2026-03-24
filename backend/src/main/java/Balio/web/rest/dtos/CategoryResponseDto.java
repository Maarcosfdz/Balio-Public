package Balio.web.rest.dtos;

import Balio.web.enums.TransactionType;

public class CategoryResponseDto {

    private String id;
    private String name;
    private TransactionType type; // EXPENSE / INCOME
    private String iconName;
    private String iconBgColor;
    private String userId;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public TransactionType getType() { return type; }
    public void setType(TransactionType type) { this.type = type; }

    public String getIconName() { return iconName; }
    public void setIconName(String iconName) { this.iconName = iconName; }

    public String getIconBgColor() { return iconBgColor; }
    public void setIconBgColor(String iconBgColor) { this.iconBgColor = iconBgColor; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

}
