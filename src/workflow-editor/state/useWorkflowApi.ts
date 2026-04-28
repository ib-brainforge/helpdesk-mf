import { useContext } from 'react';
import { WorkflowApiContext } from './WorkflowApiProvider';

export function useWorkflowApi() {
  const client = useContext(WorkflowApiContext);
  if (!client)
    throw new Error('useWorkflowApi must be used inside <WorkflowApiProvider>');
  return client;
}
