import { FieldControlMasterView } from "@/components/catalyst-one/field-control-master";
import { CreateFieldDraftDialog } from "@/components/catalyst-one/field-control-master/create-field-draft-dialog";

export default function FieldControlMasterPage() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateFieldDraftDialog />
      </div>
      <FieldControlMasterView />
    </div>
  );
}
