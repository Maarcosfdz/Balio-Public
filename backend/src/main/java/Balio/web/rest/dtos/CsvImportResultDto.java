package Balio.web.rest.dtos;

import java.util.ArrayList;
import java.util.List;

public class CsvImportResultDto {

    private int imported;
    private int skipped;
    private List<String> errors = new ArrayList<>();

    public CsvImportResultDto() {}

    public CsvImportResultDto(int imported, int skipped, List<String> errors) {
        this.imported = imported;
        this.skipped = skipped;
        this.errors = errors;
    }

    public int getImported() { return imported; }
    public void setImported(int imported) { this.imported = imported; }

    public int getSkipped() { return skipped; }
    public void setSkipped(int skipped) { this.skipped = skipped; }

    public List<String> getErrors() { return errors; }
    public void setErrors(List<String> errors) { this.errors = errors; }
}
