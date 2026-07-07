import { useLocation, useNavigate } from "react-router-dom";

export function useWorkspaceTab(validTabs, defaultTab) {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get("tab");
  const activeTab = validTabs.includes(tabParam) ? tabParam : defaultTab;

  const setActiveTab = (nextTab) => {
    const targetTab = validTabs.includes(nextTab) ? nextTab : defaultTab;
    const nextParams = new URLSearchParams(location.search);
    nextParams.set("tab", targetTab);
    navigate(
      {
        pathname: location.pathname,
        search: `?${nextParams.toString()}`,
      },
      { replace: true },
    );
  };

  return {
    activeTab,
    setActiveTab,
  };
}

