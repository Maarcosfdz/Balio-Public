# Custom Icons

You can add your own icons to this folder and register them in `customIcons.ts`.

1. Create a React icon component in this folder (SVG component).
2. Export it from `customIcons.ts` inside `CUSTOM_ICON_REGISTRY`.
3. It will appear automatically in the global icon picker.

Example:

```tsx
import { MyTravelIcon } from "./MyTravelIcon";

export const CUSTOM_ICON_REGISTRY = {
  myTravel: MyTravelIcon,
} as const;
```
