package Balio.web.rest.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class GoalDto {

    @NotBlank
    @Size(max = 80)
    private String name;

    @NotNull
    @Positive
    private BigDecimal targetAmount;

    @Size(max = 60)
    private String iconName;

    @Size(max = 20)
    private String iconBgColor;

    private List<UUID> linkedAccountIds;
}
