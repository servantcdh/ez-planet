import { useRouter } from "@tanstack/react-router";

import { useAuthStore } from "@/store/auth.store";

import { Button, Icon } from "../atoms";

interface HeaderUtilProps {
  className?: string;
  isSubPath?: boolean;
}

function HeaderUtil({ className, isSubPath }: HeaderUtilProps) {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      clearAuth();
      router.navigate({ to: "/login", search: () => ({ next: undefined }) });
    }
  };

  return (
    <div className={`header__util${className ? ` ${className}` : ""}`}>
      {!isSubPath && (
        <>
          <Button style="transparent">
            <Icon iconType="icon-guide-ol" />
          </Button>
          <Button style="transparent">
            <Icon iconType="icon-bell" />
          </Button>
          <Button style="transparent" onClick={handleLogout}>
            <Icon iconType="icon-user" />
          </Button>
        </>
      )}
      {isSubPath && (
        <Button style="transparent" onClick={() => router.history.back()}>
          <Icon iconType="icon-cancel" />
        </Button>
      )}
    </div>
  );
}

export default HeaderUtil;
