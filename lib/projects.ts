export type ProjectState = "active" | "paused" | "blocked" | "partial" | "shipped" | "dormant" | "archived" | "unknown";

export type TrackedProject = {
  name: string;
  fullName: string;
  group: "core" | "professional";
};

export const trackedProjects: TrackedProject[] = [
  { name: "Cockpit", fullName: "gODtECH-Ctl-Create/Cockpit", group: "core" },
  { name: "ABE-TechLab-Operations", fullName: "gODtECH-Ctl-Create/ABE-TechLab-Operations", group: "core" },
  { name: "A-B-E-TechLab-website", fullName: "gODtECH-Ctl-Create/A-B-E-TechLab-website", group: "core" },
  { name: "ABE-invoice-Gen", fullName: "gODtECH-Ctl-Create/ABE-invoice-Gen", group: "core" },
  { name: "ABEmail-Mail", fullName: "gODtECH-Ctl-Create/ABEmail-Mail", group: "professional" },
  { name: "commitmeplanner", fullName: "gODtECH-Ctl-Create/commitmeplanner", group: "core" },
  { name: "lead-engine", fullName: "gODtECH-Ctl-Create/lead-engine", group: "core" },
  { name: "Cloud-Infrastructure-Platform", fullName: "gODtECH-Ctl-Create/Cloud-Infrastructure-Platform", group: "core" },
  { name: "MortgageOps", fullName: "gODtECH-Ctl-Create/MortgageOps", group: "core" },
  { name: "gODtECH-FORGE", fullName: "gODtECH-Ctl-Create/gODtECH-FORGE", group: "core" },
  { name: "RepoOps", fullName: "gODtECH-Ctl-Create/RepoOps", group: "core" },
  { name: "gODtECH-Steward", fullName: "gODtECH-Ctl-Create/gODtECH-Steward", group: "core" },
  { name: "HUSTLEVERSE", fullName: "gODtECH-Ctl-Create/HUSTLEVERSE", group: "core" },
  { name: "gODtECH-Bot", fullName: "gODtECH-Ctl-Create/gODtECH-Bot", group: "core" },
  { name: "gODtECH-CLI-Identity", fullName: "gODtECH-Ctl-Create/gODtECH-CLI-Identity", group: "core" },
  { name: "Content-OS", fullName: "gODtECH-Ctl-Create/Content-OS", group: "core" },
  { name: "Att", fullName: "gODtECH-Ctl-Create/Att", group: "core" },
  { name: "School-LN-CM", fullName: "gODtECH-Ctl-Create/School-LN-CM", group: "core" },
  { name: "NOT-HEALTH-OS", fullName: "gODtECH-Ctl-Create/NOT-HEALTH-OS", group: "core" },
  { name: "StackPilot", fullName: "gODtECH-Ctl-Create/StackPilot", group: "core" },
  { name: "SAYRR", fullName: "gODtECH-Ctl-Create/SAYRR", group: "core" },
  { name: "THE-BLACK-CROWN", fullName: "gODtECH-Ctl-Create/THE-BLACK-CROWN", group: "core" },
  { name: "techtrack", fullName: "gODtECH-Ctl-Create/techtrack", group: "core" },
  { name: "waste2light_web", fullName: "gODtECH-Ctl-Create/waste2light_web", group: "professional" },
  { name: "Waste2Work", fullName: "gODtECH-Ctl-Create/Waste2Work", group: "professional" },
  { name: "wast2work-test-enviroment-742d69aa", fullName: "gODtECH-Ctl-Create/wast2work-test-enviroment-742d69aa", group: "professional" },
  { name: "cyfamod-sms-landing", fullName: "gODtECH-Ctl-Create/cyfamod-sms-landing", group: "professional" },
  { name: "nanoclick-platform", fullName: "gODtECH-Ctl-Create/nanoclick-platform", group: "professional" },
  { name: "proqurement", fullName: "gODtECH-Ctl-Create/proqurement", group: "professional" }
];