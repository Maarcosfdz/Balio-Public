package Balio.web.rest.dtos;

import Balio.web.model.entities.Goal;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class GoalConverter {

    public GoalResponseDto toResponseDto(Goal goal) {
        GoalResponseDto dto = new GoalResponseDto();
        dto.setId(goal.getId().toString());
        dto.setName(goal.getName());
        dto.setTargetAmount(goal.getTargetAmount());
        dto.setCurrentAmount(goal.getCurrentAmount());
        dto.setIconName(goal.getIconName());
        dto.setIconBgColor(goal.getIconBgColor());
        dto.setLinkedAccountIds(accountIds(goal));
        return dto;
    }

    public GoalSummaryDto toSummaryDto(Goal goal) {
        GoalSummaryDto dto = new GoalSummaryDto();
        dto.setId(goal.getId().toString());
        dto.setName(goal.getName());
        dto.setTargetAmount(goal.getTargetAmount());
        dto.setCurrentAmount(goal.getCurrentAmount());
        dto.setIconName(goal.getIconName());
        dto.setIconBgColor(goal.getIconBgColor());
        dto.setLinkedAccountIds(accountIds(goal));
        return dto;
    }

    private List<String> accountIds(Goal goal) {
        return goal.getLinkedAccounts().stream()
                .map(a -> a.getId().toString())
                .toList();
    }
}
