import { useStudioContext } from "@/context/driver-provider";
import { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";

import { scc } from "@/core/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../../../ui/context-menu";

export default function ContextMenuERD({
  schemaName,
  tableName,
  children,
}: PropsWithChildren<{ schemaName: string; tableName: string }>) {
  const { databaseDriver } = useStudioContext();
  const { t } = useTranslation();

  const handleEditTable = () => {
    scc.tabs.openBuiltinSchema({
      schemaName: schemaName,
      tableName: tableName,
    });
  };

  const handleOpenTableData = () => {
    scc.tabs.openBuiltinTable({ tableName: tableName, schemaName: schemaName });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleOpenTableData}>
          {t("erd.exploreTableData")}
        </ContextMenuItem>
        {databaseDriver.getFlags().supportCreateUpdateTable && (
          <ContextMenuItem onClick={handleEditTable}>
            {t("erd.editTable")}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
