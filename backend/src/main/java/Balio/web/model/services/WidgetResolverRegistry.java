package Balio.web.model.services;

import Balio.web.enums.WidgetType;
import Balio.web.model.Exceptions.ChartWidgetInvalidException;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class WidgetResolverRegistry {

    private final Map<WidgetType, WidgetDataResolver> resolvers = new EnumMap<>(WidgetType.class);

    public WidgetResolverRegistry(List<WidgetDataResolver> resolverList) {
        for (WidgetDataResolver resolver : resolverList) {
            resolvers.put(resolver.supports(), resolver);
        }
    }

    public WidgetDataResolver get(WidgetType type) {
        WidgetDataResolver resolver = resolvers.get(type);
        if (resolver == null) {
            throw new ChartWidgetInvalidException("No resolver registered for widget type: " + type);
        }
        return resolver;
    }
}
