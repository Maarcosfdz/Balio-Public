package Balio.web.rest.dtos;

import Balio.web.model.entities.ScheduledTransaction;
import Balio.web.model.services.ScheduledTransactionService;
import org.springframework.stereotype.Component;

@Component
public class ScheduledTransactionConverter {

    private final ScheduledTransactionService scheduledTransactionService;

    public ScheduledTransactionConverter(ScheduledTransactionService scheduledTransactionService) {
        this.scheduledTransactionService = scheduledTransactionService;
    }

    public ScheduledTransactionResponseDto toResponseDto(ScheduledTransaction st) {
        ScheduledTransactionResponseDto dto = new ScheduledTransactionResponseDto();
        dto.setId(st.getId().toString());
        dto.setName(st.getName());
        dto.setAmount(st.getAmount());
        dto.setType(st.getType());
        dto.setAffectsBalance(st.isAffectsBalance());
        dto.setFreqYears(st.getFreqYears());
        dto.setFreqMonths(st.getFreqMonths());
        dto.setFreqWeeks(st.getFreqWeeks());
        dto.setFreqDays(st.getFreqDays());
        dto.setStartDate(st.getStartDate());
        dto.setLastExecution(st.getLastExecution());
        dto.setActive(st.isActive());

        if (st.isActive()) {
            dto.setNextExecution(scheduledTransactionService.calculateNextExecution(st));
        }

        if (st.getAccount() != null) {
            dto.setAccountId(st.getAccount().getId().toString());
            dto.setAccountName(st.getAccount().getName());
        }
        if (st.getCategory() != null) {
            dto.setCategoryId(st.getCategory().getId().toString());
            dto.setCategoryName(st.getCategory().getName());
        }

        return dto;
    }
}
