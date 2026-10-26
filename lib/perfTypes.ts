export interface ChartPoint {
  name: string;
  current: number;
  predicted?: number;
  applied?: number;
  target?: number;
}

export interface LabeledValue {
  label: string;
  value: string;
}

export interface AlertItem {
  level: string;
  text: string;
}

export interface BatchRow {
  id: number;
  batchNo: string;
  quantity: number;
  component: string;
  productionStarted: string;
  productionCompleted: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  plannedProfit: number;
  actualProfit: number;
  loss: number;
  customerId: string;
  project: string;
  supervisorId: string;
  status?: string;
}

export interface DashboardData {
  batchPartNo: string;
  activePartNo: string;
  batchStart: string;
  batchFinish: string;
  downtimeT: string;
  downtimeC: string;
  plannedTime: string;
  plannedTimeRemaining: string;
  productionQuantity: number;
  plannedProfit: number;
  rawMaterials: number;
  onJobPart: number;
  partsProduced: number;
  cycleTime: number;
  rejectedParts: number;
  goodParts: number;
  actualProfit: number;
  capitalLoss: number;
  operatorDelay: number;
  productionDelay: number;
  plannedDuration: string;
  currentDuration: string;
  operatingLossPerMinute: number;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  machineOn: boolean;
  productionRunning: boolean;
  progress: number;
  predictedOEE: number;
  aiSuggestedSpeed: number;
  speedStatus: string;
  confidence: number;
  oeeChart: ChartPoint[];
  speedChart: ChartPoint[];
  profitChart: ChartPoint[];
  batches: BatchRow[];
  customerId?: string;
  project?: string;
  assembly?: string;
  component?: string;
  supervisorId?: string;
  operatorId?: string;
  machineName: string;
  machines: string[];
  plc: string;
  systemStatus: string;
  aiModel: string;
  cctvUrl: string;
  batchId: string;
  batchStatus: string;
  operatorName: string;
  availabilityNote: string;
  performanceNote: string;
  qualityNote: string;
  oeeNote: string;
  predictedProgress: number;
  syncRate: string;
  aiSimulation: string;
  aiInsight: string;
  aiMaintenance: LabeledValue[];
  energy: LabeledValue[];
  alerts: AlertItem[];
  busInfo: string;
  jitter: string;
  parts: BatchRow[];
}

export type DashboardMessage =
  | { type: "dashboard:data"; payload: DashboardData }
  | { type: "dashboard:update"; payload: Partial<DashboardData> }
  | { type: string; payload?: unknown };

export interface DashboardCommand {
  type: "dashboard:command";
  command: "load-all" | "start" | "stop" | "reset" | "set-speed" | "select-machine" | "acknowledge-alerts";
  payload?: Record<string, unknown>;
}

export const EMPTY_DASHBOARD: DashboardData = {
  batchPartNo: "",
  activePartNo: "",
  batchStart: "",
  batchFinish: "",
  downtimeT: "",
  downtimeC: "",
  plannedTime: "",
  plannedTimeRemaining: "",
  productionQuantity: 0,
  plannedProfit: 0,
  rawMaterials: 0,
  onJobPart: 0,
  partsProduced: 0,
  cycleTime: 0,
  rejectedParts: 0,
  goodParts: 0,
  actualProfit: 0,
  capitalLoss: 0,
  operatorDelay: 0,
  productionDelay: 0,
  plannedDuration: "",
  currentDuration: "",
  operatingLossPerMinute: 0,
  availability: 0,
  performance: 0,
  quality: 0,
  oee: 0,
  machineOn: false,
  productionRunning: false,
  progress: 0,
  predictedOEE: 0,
  aiSuggestedSpeed: 0,
  speedStatus: "",
  confidence: 0,
  oeeChart: [],
  speedChart: [],
  profitChart: [],
  batches: [],
  machineName: "",
  machines: [],
  plc: "",
  systemStatus: "",
  aiModel: "",
  cctvUrl: "",
  batchId: "",
  batchStatus: "",
  operatorName: "",
  availabilityNote: "",
  performanceNote: "",
  qualityNote: "",
  oeeNote: "",
  predictedProgress: 0,
  syncRate: "",
  aiSimulation: "",
  aiInsight: "",
  aiMaintenance: [],
  energy: [],
  alerts: [],
  busInfo: "",
  jitter: "",
  parts: [],
};
