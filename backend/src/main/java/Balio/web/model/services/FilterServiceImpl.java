package Balio.web.model.services;

import Balio.web.enums.TransactionType;
import Balio.web.model.Exceptions.FilterInvalidException;
import Balio.web.model.Exceptions.InstanceNotFoundException;
import Balio.web.model.Exceptions.UserNotFoundException;
import Balio.web.model.entities.Filter;
import Balio.web.model.entities.FilterDao;
import Balio.web.model.entities.Transaction;
import Balio.web.model.entities.User;
import Balio.web.model.entities.UserDao;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class FilterServiceImpl implements FilterService {

    private final UserDao userDao;
    private final FilterDao filterDao;
    private final TransactionService transactionService;
    private final ObjectMapper objectMapper;

    public FilterServiceImpl(UserDao userDao, FilterDao filterDao,
                             TransactionService transactionService, ObjectMapper objectMapper) {
        this.userDao = userDao;
        this.filterDao = filterDao;
        this.transactionService = transactionService;
        this.objectMapper = objectMapper;
    }

    @Override
    public Filter createFilter(UUID userId, String name, String definition) {

        User user = userDao.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (name == null || name.isBlank()) {
            throw new FilterInvalidException("Filter name is required");
        }
        if (definition == null || definition.isBlank()) {
            throw new FilterInvalidException("Filter definition is required");
        }

        validateDefinitionJson(definition);

        Filter filter = new Filter(name.trim(), definition, user);
        filterDao.save(filter);
        return filter;
    }

    @Override
    public void deleteFilter(UUID userId, UUID filterId) throws InstanceNotFoundException {

        Filter filter = filterDao.findByIdAndUserId(filterId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Filter", filterId));

        filterDao.delete(filter);
    }

    @Override
    public Filter modifyFilter(UUID userId, UUID filterId, String name, String definition)
            throws InstanceNotFoundException {

        Filter filter = filterDao.findByIdAndUserId(filterId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Filter", filterId));

        if (name != null) {
            if (name.isBlank()) {
                throw new FilterInvalidException("Filter name cannot be blank");
            }
            filter.setName(name.trim());
        }
        if (definition != null) {
            if (definition.isBlank()) {
                throw new FilterInvalidException("Filter definition cannot be blank");
            }
            validateDefinitionJson(definition);
            filter.setDefinition(definition);
        }

        filterDao.save(filter);
        return filter;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Filter> findAllByUserId(UUID userId) {
        return filterDao.findAllByUserIdOrderByNameAsc(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Filter findByIdAndUserId(UUID filterId, UUID userId) throws InstanceNotFoundException {
        return filterDao.findByIdAndUserId(filterId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Filter", filterId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Transaction> applyFilter(UUID userId, UUID filterId) throws InstanceNotFoundException {

        Filter filter = filterDao.findByIdAndUserId(filterId, userId)
                .orElseThrow(() -> new InstanceNotFoundException("Filter", filterId));

        return parseAndExecute(userId, filter.getDefinition());
    }

    // ── Helpers ─────────────────────────────────────────────

    /**
     * Validates that the definition string is well-formed JSON and only contains
     * recognised keys: type, accountId, categoryId, startDate, endDate.
     */
    private void validateDefinitionJson(String definition) {
        try {
            JsonNode root = objectMapper.readTree(definition);
            if (!root.isObject()) {
                throw new FilterInvalidException("Filter definition must be a JSON object");
            }

            root.fieldNames().forEachRemaining(field -> {
                if (!isKnownField(field)) {
                    throw new FilterInvalidException("Unknown filter field: " + field);
                }
            });

            // Validate date formats if present
            if (root.has("startDate")) {
                parseDateField(root.get("startDate").asText(), "startDate");
            }
            if (root.has("endDate")) {
                parseDateField(root.get("endDate").asText(), "endDate");
            }

        } catch (JsonProcessingException e) {
            throw new FilterInvalidException("Filter definition is not valid JSON");
        }
    }

    private boolean isKnownField(String field) {
        return "type".equals(field) || "accountId".equals(field) || "categoryId".equals(field)
                || "startDate".equals(field) || "endDate".equals(field);
    }

    private void parseDateField(String value, String fieldName) {
        try {
            LocalDate.parse(value);
        } catch (DateTimeParseException e) {
            throw new FilterInvalidException("Invalid date format for " + fieldName + ": " + value);
        }
    }

    /**
     * Parses the JSON definition and delegates to {@link TransactionService#findFiltered}.
     */
    private List<Transaction> parseAndExecute(UUID userId, String definition) {
        try {
            JsonNode root = objectMapper.readTree(definition);

            TransactionType type = null;
            UUID accountId = null;
            UUID categoryId = null;
            LocalDate startDate = null;
            LocalDate endDate = null;

            if (root.has("type") && !root.get("type").isNull()) {
                type = TransactionType.valueOf(root.get("type").asText());
            }
            if (root.has("accountId") && !root.get("accountId").isNull()) {
                accountId = UUID.fromString(root.get("accountId").asText());
            }
            if (root.has("categoryId") && !root.get("categoryId").isNull()) {
                categoryId = UUID.fromString(root.get("categoryId").asText());
            }
            if (root.has("startDate") && !root.get("startDate").isNull()) {
                startDate = LocalDate.parse(root.get("startDate").asText());
            }
            if (root.has("endDate") && !root.get("endDate").isNull()) {
                endDate = LocalDate.parse(root.get("endDate").asText());
            }

            return transactionService.findFiltered(userId, type, accountId, categoryId, startDate, endDate);

        } catch (JsonProcessingException e) {
            throw new FilterInvalidException("Failed to parse filter definition");
        }
    }
}
