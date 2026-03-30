package Balio.web.rest.dtos;

import Balio.web.model.entities.Goal;

import org.springframework.stereotype.Component;

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
        return dto;
    }
}
