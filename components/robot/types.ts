export type Velocity = "fast" | "slow";

export type GripperAction = "open" | "close" | "idle";

export type RobotLogLevel = "info" | "warn" | "error";

export type RobotLog = {
  id: number;
  time: string;
  level: RobotLogLevel;
  msg: string;
  meta?: string;
};

export type JointLimit = { min: number; max: number };

export type PositionPreset = "home" | "retreat" | "a" | "b";

export type Pose = {
  x: number | null;
  y: number | null;
  z: number | null;
  roll: number | null;
  pitch: number | null;
  yaw: number | null;
};

export type ProgramId = "packing" | "labelling" | "riveting" | "cutting";

export const JOINT_COUNT = 6;

export const JOINT_LIMITS: JointLimit[] = Array.from({ length: JOINT_COUNT }, () => ({ min: 0, max: 360 }));

export const HOME_JOINTS = [0, 15, 180, 230, 0, 55];

export const RETREAT_JOINTS = [0, 30, 180, 200, 0, 40];

export function nowTime(): string {
  return new Date().toLocaleTimeString("en-IN", { hour12: true });
}

export function pushLog(prev: RobotLog[], msg: string, level: RobotLogLevel = "info", meta = "robot"): RobotLog[] {
  return [{ id: Date.now() + Math.random(), time: nowTime(), level, msg, meta }, ...prev].slice(0, 50);
}
