import { SelectableTable } from "@/components/selectable-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStudioContext } from "@/context/driver-provider";
import { useSchema } from "@/context/schema-provider";
import { DatabaseSchemaItem } from "@/drivers/base-driver";
import { Check, Spinner, Table, Trash, XCircle } from "@phosphor-icons/react";
import { ReactElement, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Toolbar, ToolbarButton } from "../toolbar";

function ConfirmDialog({
  selectedItems,
  onClose,
  onConfirm,
}: {
  selectedItems: DatabaseSchemaItem[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const { t } = useTranslation();

  return (
    <Dialog
      open
      onOpenChange={(openState) => {
        if (!openState) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle>{t("massDropTable.confirmTitle")}</DialogTitle>

        <div className="text-sm">
          {t("massDropTable.confirmDesc")}
          <div className="my-2 flex flex-wrap gap-2 font-mono">
            {selectedItems.map((t) => (
              <div className="bg-muted rounded p-1" key={t.name}>
                {t.name}
              </div>
            ))}
          </div>
          <p className="text-primary my-2 mt-8 font-serif text-2xl">
            ln(x) + e<sup>x-1</sup> - cos(x) = 0
          </p>
          <p className="my-2">{t("massDropTable.confirmSolve")}</p>
          <Input
            className="bg-surface"
            placeholder={t("massDropTable.confirmPlaceholder")}
            value={confirmText}
            onKeyDown={(e) => {
              if (e.key === "Enter" && confirmText === "confirm") {
                onConfirm();
              }
            }}
            onChange={(e) => {
              setConfirmText(e.currentTarget.value);
            }}
          />
        </div>

        <DialogFooter>
          <Button
            variant={"destructive"}
            onClick={() => {
              if (confirmText === "confirm") {
                onConfirm();
              }
            }}
          >
            {t("massDropTable.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MassDropTableTab() {
  const { databaseDriver } = useStudioContext();
  const { schema: initialSchema, currentSchemaName, refresh } = useSchema();
  const [schema] = useState(initialSchema);
  const [selectedSchema] = useState(currentSchemaName);
  const { t } = useTranslation();

  const [selectedItems, setSelectedItems] = useState<DatabaseSchemaItem[]>([]);
  const [currentSchema, setCurrentSchema] = useState<DatabaseSchemaItem[]>([]);

  const [itemStatusList, setItemStatusList] = useState<Record<string, string>>(
    {}
  );

  const [operationType, setOperationType] = useState<"drop" | "empty" | null>(
    null
  );

  const [completed, setCompleted] = useState(false);

  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    setSelectedItems([]);
    setCurrentSchema(
      schema[selectedSchema].sort((a, b) => a.name.localeCompare(b.name))
    );
  }, [schema, selectedSchema]);

  const dropSelectedTableClicked = useCallback(() => {
    setIsConfirming(true);
    setOperationType("drop");
  }, []);

  const emptySelectedTableClicked = useCallback(() => {
    setIsConfirming(true);
    setOperationType("empty");
  }, []);

  const performOperation = useCallback(
    async (items: DatabaseSchemaItem[]) => {
      if (!operationType) return;

      let statusList: Record<string, string> = {};

      for (const item of items) {
        if (operationType === "drop") {
          try {
            statusList = { ...statusList, [item.name]: t("massDropTable.statusDropping") };
            setItemStatusList(statusList);

            await databaseDriver.dropTable(currentSchemaName, item.name);

            statusList = { ...statusList, [item.name]: t("massDropTable.statusDropped") };
            setItemStatusList(statusList);
          } catch {
            statusList = { ...statusList, [item.name]: t("massDropTable.statusFailed") };
            setItemStatusList(statusList);
          }
        } else if (operationType === "empty") {
          try {
            statusList = { ...statusList, [item.name]: t("massDropTable.statusEmptying") };
            setItemStatusList(statusList);

            await databaseDriver.emptyTable(currentSchemaName, item.name);

            statusList = { ...statusList, [item.name]: t("massDropTable.statusEmptied") };
            setItemStatusList(statusList);
          } catch {
            statusList = { ...statusList, [item.name]: t("massDropTable.statusFailed") };
            setItemStatusList(statusList);
          }
        }
      }

      setCompleted(true);
      refresh();
    },
    [operationType, currentSchemaName, databaseDriver, refresh, t]
  );

  // How to render each row in the table
  const renderRowHandler = useCallback(
    (item: DatabaseSchemaItem) => {
      const status = itemStatusList[item.name] || "";
      let statusIcon: ReactElement | null = null;

      if (status === t("massDropTable.statusFailed"))
        statusIcon = (
          <XCircle size={16} className="mr-2 inline-block text-red-500" />
        );
      else if (status.includes("..."))
        statusIcon = (
          <Spinner size={16} className="mr-2 inline-block animate-spin" />
        );
      else if (
        status === t("massDropTable.statusDropped") ||
        status === t("massDropTable.statusEmptied")
      )
        statusIcon = (
          <Check size={16} className="mr-2 inline-block text-green-500" />
        );

      return (
        <>
          <td className="h-[40px] w-[300px] border-b px-2 py-2">
            <Table size={16} className="mr-2 inline-block" />
            {item.name}
          </td>
          <td className="h-[40px] w-[100px] border-b px-2 py-2 capitalize">
            {item.type}
          </td>
          <td className="h-[40px] border-b px-2 py-2">
            {statusIcon}
            {status}
          </td>
        </>
      );
    },
    [itemStatusList, t]
  );

  const extractItemKey = useCallback((item: DatabaseSchemaItem) => item.name, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {isConfirming && (
        <ConfirmDialog
          selectedItems={selectedItems}
          onClose={() => {
            setIsConfirming(false);
            setOperationType(null);
          }}
          onConfirm={() => {
            setIsConfirming(false);
            performOperation(selectedItems);
          }}
        />
      )}

      <div className="border-b pb-1">
        <h1 className="text-primary mb-1 border-b p-4 text-lg font-semibold">
          {t("massDropTable.title")}
        </h1>

        <div className="px-1">
          <Toolbar>
            <ToolbarButton
              disabled={selectedItems.length === 0 || completed}
              icon={<Trash size={16} className="text-red-500" />}
              text={t("massDropTable.dropSelected")}
              onClick={dropSelectedTableClicked}
              destructive
            />
            <ToolbarButton
              text={t("massDropTable.emptySelected")}
              disabled={selectedItems.length === 0 || completed}
              onClick={emptySelectedTableClicked}
              destructive
            />
          </Toolbar>
        </div>
      </div>

      <div className="relative flex-1 overflow-scroll">
        <SelectableTable
          headers={[
            { key: "name", text: t("massDropTable.colName"), width: "300px" },
            { key: "type", text: t("massDropTable.colType"), width: "100px" },
            { key: "status", text: t("massDropTable.colStatus") },
          ]}
          items={currentSchema}
          extractKey={extractItemKey}
          renderRow={renderRowHandler}
          selectedItems={selectedItems}
          onSelectedItemChanged={setSelectedItems}
          forceShowSelectedItem={!isConfirming && !!operationType}
          disabledSelection={!isConfirming && !!operationType}
        />
      </div>
    </div>
  );
}
