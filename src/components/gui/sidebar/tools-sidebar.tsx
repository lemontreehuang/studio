"use client";
import { scc } from "@/core/command";
import ListButtonItem from "../list-button-item";
import { StackMinus, TreeStructure } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

export default function SettingSidebar() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col grow p-2">
      <ListButtonItem
        text={t("erd.relationalDiagram")}
        onClick={() => {
          scc.tabs.openBuiltinERD({});
        }}
        icon={TreeStructure}
      />
      <ListButtonItem
        text={t("erd.dropEmptyTables")}
        onClick={() => {
          scc.tabs.openBuiltinMassDropTable({});
        }}
        icon={StackMinus}
      />
    </div>
  );
}
