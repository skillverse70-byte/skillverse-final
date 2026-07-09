import { useLocation, useNavigate } from "react-router-dom";

export function useRouteTab(validTabs, defaultTab, options = {}) {
  const {
    paramName = "tab",
    replace = true,
    omitDefaultFromUrl = false,
  } = options;
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get(paramName);
  const activeTab = validTabs.includes(tabParam) ? tabParam : defaultTab;

  const setActiveTab = (nextTab) => {
    const targetTab = validTabs.includes(nextTab) ? nextTab : defaultTab;
    const nextParams = new URLSearchParams(location.search);

    if (omitDefaultFromUrl && targetTab === defaultTab) {
      nextParams.delete(paramName);
    } else {
      nextParams.set(paramName, targetTab);
    }

    const nextSearch = nextParams.toString();

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace },
    );
  };

  return {
    activeTab,
    setActiveTab,
    tabParamName: paramName,
  };
}
