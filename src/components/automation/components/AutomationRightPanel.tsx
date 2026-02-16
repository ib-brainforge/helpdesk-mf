import { type FC, useState } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { BaseButton, BaseInput } from '@brainforgeau/components';
import { addToast } from '@heroui/react';

export const AutomationRightPanel: FC = () => {
  const [testTicketId, setTestTicketId] = useState('');

  const handleTest = () => {
    addToast({
      title: 'Coming soon',
      description: 'Rule testing will be available soon',
      severity: 'warning',
    });
  };

  return (
    <div className="space-y-6">
      {/* Example Rules Section */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Some example rules</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-4 text-sm">
            <div className="pb-3 border-b border-divider">
              <p className="font-medium mb-1">Auto-assign high priority tickets</p>
              <p className="text-gray-600 dark:text-gray-400">
                When a ticket is created with High or Critical priority, assign it to the senior support team.
              </p>
            </div>
            <div className="pb-3 border-b border-divider">
              <p className="font-medium mb-1">Notify on unassigned tickets</p>
              <p className="text-gray-600 dark:text-gray-400">
                Send an email notification when a ticket remains unassigned for more than 30 minutes.
              </p>
            </div>
            <div className="pb-3 border-b border-divider">
              <p className="font-medium mb-1">Close resolved tickets automatically</p>
              <p className="text-gray-600 dark:text-gray-400">
                After 48 hours with no response from requester, automatically close tickets marked as Resolved.
              </p>
            </div>
            <div className="pb-3 border-b border-divider">
              <p className="font-medium mb-1">Tag tickets by keywords</p>
              <p className="text-gray-600 dark:text-gray-400">
                Automatically add tags based on subject keywords like "password", "access", or "bug".
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">Escalate overdue tickets</p>
              <p className="text-gray-600 dark:text-gray-400">
                When a ticket exceeds its SLA deadline, increase priority and notify management.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Testing Section */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Testing your rules</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Test how this automation rule would apply to an existing ticket.
            </p>
            <BaseInput
              label="Ticket ID"
              placeholder="Enter ticket ID"
              value={testTicketId}
              onChange={(e) => setTestTicketId(e.target.value)}
            />
            <BaseButton
              color="primary"
              className="w-full"
              onPress={handleTest}
              isDisabled={!testTicketId}
            >
              Test
            </BaseButton>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
