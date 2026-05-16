import { Avatar } from "@/components/orbit/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  CaretDown,
  Gear,
  SignOut,
  ToggleLeft,
  ToggleRight,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { localSettingDialog } from "./local-setting-dialog";
import { useSession } from "./session-provider";

export default function NavigationProfile() {
  const { resolvedTheme, forcedTheme, setTheme } = useTheme();
  const { session, isLoading } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  const theme = forcedTheme ?? resolvedTheme;

  const onLogoutClicked = useCallback(() => {
    router.push("/signout");
  }, [router]);

  const onThemeToggleClicked = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      setTheme(theme === "dark" ? "light" : "dark");

      // We don't want the dropdown to close
      e.stopPropagation();
      e.preventDefault();
    },
    [theme, setTheme]
  );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger>
        <div
          className={cn(
            buttonVariants({
              size: "lg",
              variant: "ghost",
            }),
            "flex items-center justify-start gap-2 p-1"
          )}
        >
          <Avatar username={t("local.guest")} as="div" />
          {!isLoading && (
            <div className="flex-1 text-left text-sm">
              {session
                ? session.user.first_name + " " + session?.user.last_name
                : t("local.guest")}
            </div>
          )}

          {isLoading && (
            <div className="bg-muted h-4 w-16 animate-pulse rounded-sm" />
          )}
          <div>
            <CaretDown weight="bold" className="h-3 w-3" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[250px]">
        <div className="flex gap-2 border-b p-2">
          <Avatar size="lg" username={session?.user?.initials ?? t("local.guest")} />

          <div className="flex flex-col justify-center">
            <div className="text-sm font-semibold">
              {session
                ? session.user.first_name + " " + session?.user.last_name
                : t("local.guest")}
            </div>
            {session && <div className="text-sm">{session.user.email}</div>}
          </div>
        </div>

        <div className="p-2">
          <DropdownMenuItem
            className="justify-between"
            onClick={() => {
              localSettingDialog.show({}).then().catch();
            }}
          >
            {t("nav.localSetting")}
            <Gear size={20} />
          </DropdownMenuItem>

          {session && (
            <DropdownMenuItem
              className="justify-between"
              onClick={() => {
                router.push(`/account`);
              }}
            >
              {t("nav.accountSetting")}
              <Gear size={20} />
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="justify-between"
            onClick={onThemeToggleClicked}
          >
            {t("nav.theme")}
            {theme === "dark" ? (
              <ToggleRight weight="fill" size={20} />
            ) : (
              <ToggleLeft size={20} />
            )}
          </DropdownMenuItem>
          {session && (
            <DropdownMenuItem
              onClick={onLogoutClicked}
              className="justify-between"
            >
              {t("nav.logOut")} <SignOut size={20} />
            </DropdownMenuItem>
          )}
          {!session && (
            <DropdownMenuItem
              onClick={() => {
                router.push("/signin");
              }}
              className="justify-between"
            >
              {t("nav.logIn")}
            </DropdownMenuItem>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
