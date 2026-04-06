package Balio.web.rest.dtos;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
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
}
