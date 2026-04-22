export enum StateCategory {
  New = 'New',
  Open = 'Open',
  Pending = 'Pending',
  Resolved = 'Resolved',
  Closed = 'Closed',
}

export enum StateType {
  Initial = 'Initial',
  Normal = 'Normal',
  Parallel = 'Parallel',
  Terminal = 'Terminal',
}

export enum TriggerType {
  Manual = 'Manual',
  Event = 'Event',
  Timer = 'Timer',
}

export enum VersionStatus {
  Draft = 'Draft',
  Published = 'Published',
  Archived = 'Archived',
}
