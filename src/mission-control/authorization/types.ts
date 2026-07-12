export type {
  MissionControlAuthPrincipal,
  MissionControlAuthorizationPort,
} from "../authentication/types";

export interface MissionControlRoleBinding {
  roleId: string;
  permissions: string[];
}
