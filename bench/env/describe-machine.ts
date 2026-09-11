// ===========================================================================
// describe-machine.ts — what the numbers were taken on.
//
// A count does not depend on the machine, and this lane publishes counts. It
// is recorded anyway so that a figure can be traced to a run, and so that the
// day somebody publishes a millisecond the provenance is already there.
// ===========================================================================
import { cpus, totalmem, arch, platform, release } from "node:os";

export interface MachineDescription {
  readonly platform: string;
  readonly release: string;
  readonly arch: string;
  readonly cpu: string;
  readonly cores: number;
  readonly memoryGb: number;
  readonly node: string;
}

export function describeMachine(): MachineDescription {
  const all = cpus();
  return {
    platform: platform(),
    release: release(),
    arch: arch(),
    cpu: all[0]?.model.trim() ?? "unknown",
    cores: all.length,
    memoryGb: Math.round((totalmem() / 1024 ** 3) * 10) / 10,
    node: process.version,
  };
}
