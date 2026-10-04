import { FieldControlMasterModuleNav } from "@/components/catalyst-one/field-control-master/field-control-master-module-nav";

export default function FieldControlMasterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <FieldControlMasterModuleNav />
      {children}
    </div>
  );
}
