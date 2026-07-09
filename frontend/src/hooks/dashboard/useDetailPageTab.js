import { useRouteTab } from "./useRouteTab";

export function useDetailPageTab(validTabs, defaultTab) {
  return useRouteTab(validTabs, defaultTab, {
    paramName: "tab",
    replace: true,
    omitDefaultFromUrl: true,
  });
}
