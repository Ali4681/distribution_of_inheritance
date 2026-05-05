import { BlockType } from "./enums";
import { Heir } from "./heir.types";

export interface BlockedHeir {
  id: string;
  heirId: string;
  blockedById: string;
  blockReason: string;
  blockType: BlockType;
  heir: Heir;
  blockedBy: Heir;
}
