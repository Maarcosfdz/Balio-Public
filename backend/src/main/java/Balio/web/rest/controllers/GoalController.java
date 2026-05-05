package Balio.web.rest.controllers;

import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.Goal;
import Balio.web.model.services.GoalService;
import Balio.web.rest.dtos.GoalAmountDto;
import Balio.web.rest.dtos.GoalConverter;
import Balio.web.rest.dtos.GoalDto;
import Balio.web.rest.dtos.GoalResponseDto;
import Balio.web.rest.dtos.GoalSummaryDto;
import Balio.web.rest.dtos.GoalUpdateDto;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/goal")
public class GoalController {

    private static final Logger log = LoggerFactory.getLogger(GoalController.class);

    private final GoalService goalService;
    private final GoalConverter goalConverter;

    public GoalController(GoalService goalService, GoalConverter goalConverter) {
        this.goalService = goalService;
        this.goalConverter = goalConverter;
    }

    // ── LIST (summary) ───────────────────────────────────────────────────

    @GetMapping
    public List<GoalSummaryDto> getAllGoals(@RequestAttribute UUID userId) {
        return goalService.findAllByUserId(userId).stream()
                .map(goalConverter::toSummaryDto)
                .toList();
    }

    // ── DETAIL ───────────────────────────────────────────────────────────

    @GetMapping("/{goalId}")
    public GoalResponseDto getGoal(@RequestAttribute UUID userId,
                                   @PathVariable UUID goalId) throws InstanceNotFoundException {
        Goal goal = goalService.findByIdAndUserId(goalId, userId);
        return goalConverter.toResponseDto(goal);
    }

    // ── CREATE ───────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<GoalResponseDto> createGoal(@RequestAttribute UUID userId,
                                                      @Validated @RequestBody GoalDto dto) {

        Goal goal = goalService.createGoal(
                userId, dto.getName(), dto.getTargetAmount(),
                dto.getIconName(), dto.getIconBgColor(), dto.getLinkedAccountIds());

        log.info("Goal created: goalId={}, userId={}", goal.getId(), userId);

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}")
                .buildAndExpand(goal.getId()).toUri();

        return ResponseEntity.created(location).body(goalConverter.toResponseDto(goal));
    }

    // ── UPDATE ───────────────────────────────────────────────────────────

    @PutMapping("/{goalId}")
    public GoalResponseDto updateGoal(@RequestAttribute UUID userId,
                                      @PathVariable UUID goalId,
                                      @Validated @RequestBody GoalUpdateDto dto)
            throws InstanceNotFoundException {

        Goal goal = goalService.modifyGoal(
                userId, goalId, dto.getName(), dto.getTargetAmount(),
                dto.getIconName(), dto.getIconBgColor(), dto.getLinkedAccountIds());
        return goalConverter.toResponseDto(goal);
    }

    // ── DELETE ────────────────────────────────────────────────────────────

    @DeleteMapping("/{goalId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGoal(@RequestAttribute UUID userId,
                           @PathVariable UUID goalId) throws InstanceNotFoundException {
        goalService.deleteGoal(userId, goalId);
        log.info("Goal deleted: goalId={}, userId={}", goalId, userId);
    }

    // ── ADD MONEY ────────────────────────────────────────────────────────

    @PostMapping("/{goalId}/add")
    public GoalResponseDto addMoney(@RequestAttribute UUID userId,
                                    @PathVariable UUID goalId,
                                    @Validated @RequestBody GoalAmountDto dto)
            throws InstanceNotFoundException {

        Goal goal = goalService.addMoney(userId, goalId, dto.getAmount());
        return goalConverter.toResponseDto(goal);
    }

    // ── WITHDRAW MONEY ───────────────────────────────────────────────────

    @PostMapping("/{goalId}/withdraw")
    public GoalResponseDto withdrawMoney(@RequestAttribute UUID userId,
                                         @PathVariable UUID goalId,
                                         @Validated @RequestBody GoalAmountDto dto)
            throws InstanceNotFoundException {

        Goal goal = goalService.withdrawMoney(userId, goalId, dto.getAmount());
        return goalConverter.toResponseDto(goal);
    }
}
