package Balio.web.rest.controllers;

import Balio.web.model.Exceptions.GoalInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.entities.Goal;
import Balio.web.model.entities.User;
import Balio.web.model.services.GoalService;
import Balio.web.rest.common.CommonControllerAdvice;
import Balio.web.rest.dtos.GoalConverter;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class GoalControllerTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID GOAL_ID = UUID.randomUUID();
    private static final String VALID_NAME = "Vacation Fund";
    private static final BigDecimal TARGET = new BigDecimal("1000.00");

    @Mock private GoalService goalService;

    private final GoalConverter goalConverter = new GoalConverter();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;
    private User testUser;
    private Goal testGoal;

    @BeforeEach
    void setUp() {
        GoalController controller = new GoalController(goalService, goalConverter);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new CommonControllerAdvice())
                .build();

        testUser = new User("Nick", "nick@example.com", "encodedPwd");
        setFieldViaReflection(testUser, "id", USER_ID);

        testGoal = new Goal(VALID_NAME, TARGET, testUser);
        setFieldViaReflection(testGoal, "id", GOAL_ID);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  GET /goal
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("GET /goal")
    class GetAllGoals {

        @Test
        @DisplayName("200 – returns list of goal summaries")
        void returnsList() throws Exception {
            Goal g2 = new Goal("Emergency", new BigDecimal("5000"), testUser);
            setFieldViaReflection(g2, "id", UUID.randomUUID());

            when(goalService.findAllByUserId(USER_ID)).thenReturn(List.of(testGoal, g2));

            mockMvc.perform(get("/goal")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].name", is(VALID_NAME)));
        }

        @Test
        @DisplayName("200 – returns empty list when no goals")
        void returnsEmptyList() throws Exception {
            when(goalService.findAllByUserId(USER_ID)).thenReturn(List.of());

            mockMvc.perform(get("/goal")
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  GET /goal/{goalId}
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("GET /goal/{goalId}")
    class GetGoalById {

        @Test
        @DisplayName("200 – returns goal detail")
        void returnsGoal() throws Exception {
            when(goalService.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(testGoal);

            mockMvc.perform(get("/goal/{goalId}", GOAL_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(GOAL_ID.toString())))
                    .andExpect(jsonPath("$.name", is(VALID_NAME)))
                    .andExpect(jsonPath("$.targetAmount", is(TARGET.doubleValue())));
        }

        @Test
        @DisplayName("404 – goal not found")
        void notFound() throws Exception {
            when(goalService.findByIdAndUserId(GOAL_ID, USER_ID))
                    .thenThrow(new InstanceNotFoundException("Goal", GOAL_ID));

            mockMvc.perform(get("/goal/{goalId}", GOAL_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  POST /goal
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("POST /goal")
    class CreateGoalEndpoint {

        @Test
        @DisplayName("201 – creates goal with valid data")
        void createsGoal() throws Exception {
            when(goalService.createGoal(eq(USER_ID), eq(VALID_NAME), any(BigDecimal.class), any(), any(), any()))
                    .thenReturn(testGoal);

            mockMvc.perform(post("/goal")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(goalJson(VALID_NAME, "1000.00")))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id", is(GOAL_ID.toString())))
                    .andExpect(jsonPath("$.name", is(VALID_NAME)));
        }

        @Test
        @DisplayName("400 – validation: name blank")
        void nameBlank() throws Exception {
            mockMvc.perform(post("/goal")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(goalJson("", "1000.00")))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – validation: targetAmount null")
        void targetNull() throws Exception {
            mockMvc.perform(post("/goal")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"Test\"}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – validation: targetAmount zero")
        void targetZero() throws Exception {
            mockMvc.perform(post("/goal")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(goalJson(VALID_NAME, "0")))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – validation: targetAmount negative")
        void targetNeg() throws Exception {
            mockMvc.perform(post("/goal")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(goalJson(VALID_NAME, "-100")))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – service throws GoalInvalidException")
        void serviceThrowsInvalid() throws Exception {
            when(goalService.createGoal(eq(USER_ID), any(), any(), any(), any(), any()))
                    .thenThrow(new GoalInvalidException("Name is required"));

            mockMvc.perform(post("/goal")
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(goalJson(VALID_NAME, "1000.00")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message", is("Name is required")));
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PUT /goal/{goalId}
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("PUT /goal/{goalId}")
    class UpdateGoalEndpoint {

        @Test
        @DisplayName("200 – updates goal name")
        void updatesName() throws Exception {
            Goal updated = new Goal("Updated", TARGET, testUser);
            setFieldViaReflection(updated, "id", GOAL_ID);

            when(goalService.modifyGoal(USER_ID, GOAL_ID, "Updated", null, null, null, null)).thenReturn(updated);

            mockMvc.perform(put("/goal/{goalId}", GOAL_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"Updated\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name", is("Updated")));
        }

        @Test
        @DisplayName("200 – updates targetAmount only")
        void updatesTarget() throws Exception {
            Goal updated = new Goal(VALID_NAME, new BigDecimal("2000.00"), testUser);
            setFieldViaReflection(updated, "id", GOAL_ID);

            when(goalService.modifyGoal(eq(USER_ID), eq(GOAL_ID), eq(null), any(BigDecimal.class), any(), any(), any()))
                    .thenReturn(updated);

            mockMvc.perform(put("/goal/{goalId}", GOAL_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"targetAmount\":2000.00}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.targetAmount", is(2000.00)));
        }

        @Test
        @DisplayName("404 – goal not found")
        void notFound() throws Exception {
            when(goalService.modifyGoal(eq(USER_ID), eq(GOAL_ID), any(), any(), any(), any(), any()))
                    .thenThrow(new InstanceNotFoundException("Goal", GOAL_ID));

            mockMvc.perform(put("/goal/{goalId}", GOAL_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"X\"}"))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("400 – name exceeds max length")
        void nameTooLong() throws Exception {
            String longName = "A".repeat(81);

            mockMvc.perform(put("/goal/{goalId}", GOAL_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"" + longName + "\"}"))
                    .andExpect(status().isBadRequest());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  DELETE /goal/{goalId}
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("DELETE /goal/{goalId}")
    class DeleteGoalEndpoint {

        @Test
        @DisplayName("204 – deletes goal successfully")
        void deletesGoal() throws Exception {
            doNothing().when(goalService).deleteGoal(USER_ID, GOAL_ID);

            mockMvc.perform(delete("/goal/{goalId}", GOAL_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNoContent());

            verify(goalService).deleteGoal(USER_ID, GOAL_ID);
        }

        @Test
        @DisplayName("404 – goal not found")
        void notFound() throws Exception {
            doThrow(new InstanceNotFoundException("Goal", GOAL_ID))
                    .when(goalService).deleteGoal(USER_ID, GOAL_ID);

            mockMvc.perform(delete("/goal/{goalId}", GOAL_ID)
                            .requestAttr("userId", USER_ID))
                    .andExpect(status().isNotFound());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  POST /goal/{goalId}/add
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("POST /goal/{goalId}/add")
    class AddMoneyEndpoint {

        @Test
        @DisplayName("200 – adds money successfully")
        void addsMoney() throws Exception {
            testGoal.setCurrentAmount(new BigDecimal("300.00"));
            when(goalService.addMoney(eq(USER_ID), eq(GOAL_ID), any(BigDecimal.class)))
                    .thenReturn(testGoal);

            mockMvc.perform(post("/goal/{goalId}/add", GOAL_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"amount\":300.00}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currentAmount", is(300.00)));
        }

        @Test
        @DisplayName("400 – amount null")
        void amountNull() throws Exception {
            mockMvc.perform(post("/goal/{goalId}/add", GOAL_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – amount zero")
        void amountZero() throws Exception {
            mockMvc.perform(post("/goal/{goalId}/add", GOAL_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"amount\":0}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("400 – amount negative")
        void amountNeg() throws Exception {
            mockMvc.perform(post("/goal/{goalId}/add", GOAL_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"amount\":-50}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("404 – goal not found")
        void notFound() throws Exception {
            when(goalService.addMoney(eq(USER_ID), eq(GOAL_ID), any()))
                    .thenThrow(new InstanceNotFoundException("Goal", GOAL_ID));

            mockMvc.perform(post("/goal/{goalId}/add", GOAL_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"amount\":100}"))
                    .andExpect(status().isNotFound());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  POST /goal/{goalId}/withdraw
    // ═══════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("POST /goal/{goalId}/withdraw")
    class WithdrawMoneyEndpoint {

        @Test
        @DisplayName("200 – withdraws money successfully")
        void withdrawsMoney() throws Exception {
            testGoal.setCurrentAmount(new BigDecimal("300.00"));
            when(goalService.withdrawMoney(eq(USER_ID), eq(GOAL_ID), any(BigDecimal.class)))
                    .thenReturn(testGoal);

            mockMvc.perform(post("/goal/{goalId}/withdraw", GOAL_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"amount\":200.00}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currentAmount", is(300.00)));
        }

        @Test
        @DisplayName("400 – insufficient funds")
        void insufficientFunds() throws Exception {
            when(goalService.withdrawMoney(eq(USER_ID), eq(GOAL_ID), any()))
                    .thenThrow(new GoalInvalidException("Insufficient funds"));

            mockMvc.perform(post("/goal/{goalId}/withdraw", GOAL_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"amount\":999}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message", is("Insufficient funds")));
        }

        @Test
        @DisplayName("400 – amount null")
        void amountNull() throws Exception {
            mockMvc.perform(post("/goal/{goalId}/withdraw", GOAL_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("404 – goal not found")
        void notFound() throws Exception {
            when(goalService.withdrawMoney(eq(USER_ID), eq(GOAL_ID), any()))
                    .thenThrow(new InstanceNotFoundException("Goal", GOAL_ID));

            mockMvc.perform(post("/goal/{goalId}/withdraw", GOAL_ID)
                            .requestAttr("userId", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"amount\":100}"))
                    .andExpect(status().isNotFound());
        }
    }

    /* ───── helpers ───── */

    private String goalJson(String name, String targetAmount) {
        return String.format("{\"name\":\"%s\",\"targetAmount\":%s}", name, targetAmount);
    }

    private static void setFieldViaReflection(Object target, String fieldName, Object value) {
        try {
            java.lang.reflect.Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException("Cannot set field " + fieldName, e);
        }
    }
}
