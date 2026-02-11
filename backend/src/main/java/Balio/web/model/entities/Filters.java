package Balio.web.model.entities;

public class Filters {
    private String category;
    private String dateRange;

    public Filters(String category, String dateRange) {
        this.category = category;
        this.dateRange = dateRange;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDateRange() {
        return dateRange;
    }

    public void setDateRange(String dateRange) {
        this.dateRange = dateRange;
    }
}