import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useSession } from "@/api/hooks";
import { useAccountUi } from "./AccountSheets";

/** Nothing is gated behind sign-up: on a first visit we only ask for a nickname, over the page. */
export function GuestGate() {
  const { data: session, isSuccess } = useSession();
  const { askNickname } = useAccountUi();
  useEffect(() => {
    if (isSuccess && session === null) askNickname();
  }, [isSuccess, session, askNickname]);
  return <Outlet />;
}
