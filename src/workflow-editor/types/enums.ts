export enum StateCategory {
  New = 1,
  Open = 2,
  Pending = 3,
  Resolved = 4,
  Closed = 5,
}

export enum StateType {
  Initial = 1,
  Normal = 2,
  Parallel = 3,
  Terminal = 4,
}

export enum TriggerType {
  Manual = 1,
  Event = 2,
  Timer = 3,
}

export enum VersionStatus {
  Draft = 1,
  Published = 2,
  Archived = 3,
}
