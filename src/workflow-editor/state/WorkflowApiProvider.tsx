import { type ReactNode, createContext } from 'react';
import type { IWorkflowApiClient } from '../types';

const WorkflowApiContext = createContext<IWorkflowApiClient | null>(null);
WorkflowApiContext.displayName = 'WorkflowApiContext';
export { WorkflowApiContext };

export function WorkflowApiProvider({
  client,
  children,
}: {
  client: IWorkflowApiClient;
  children: ReactNode;
}) {
  return (
    <WorkflowApiContext.Provider value={client}>
      {children}
    </WorkflowApiContext.Provider>
  );
}
