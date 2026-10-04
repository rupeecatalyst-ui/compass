import { FieldInventoryPanel } from "@/components/catalyst-one/field-control-master/field-inventory-panel";
import { listFieldInventoryEntries } from "@/lib/field-control-master/field-inventory-catalogue";

export default function FieldInventoryPage() {
  const entries = listFieldInventoryEntries();
  return <FieldInventoryPanel entries={entries} />;
}
