<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;

class TaskStateGuard
{
    public function assertTransitionAllowed(array $task, int $actorId, string $actorRole, string $targetState): void
    {
        $currentState = $task['status'];

        if (in_array($currentState, ['completed', 'cancelled'], true)) {
            throw new RuntimeException('Task is final and cannot be changed.');
        }

        switch ($currentState) {
            case 'posted':
                if ($targetState !== 'accepted' || !in_array($actorRole, ['runner', 'both'], true)) {
                    throw new RuntimeException('Invalid transition from posted state.');
                }
                return;

            case 'accepted':
                if ($targetState === 'in_progress') {
                    if ((int) $task['runner_id'] !== $actorId || !in_array($actorRole, ['runner', 'both'], true)) {
                        throw new RuntimeException('Only assigned runner can start this task.');
                    }
                    return;
                }

                if ($targetState === 'cancelled') {
                    $isOwner = (int) $task['client_id'] === $actorId || (int) $task['runner_id'] === $actorId;
                    if (!$isOwner) {
                        throw new RuntimeException('Only task owner can cancel this task.');
                    }
                    return;
                }

                throw new RuntimeException('Invalid transition from accepted state.');

            case 'in_progress':
                if ($targetState === 'awaiting_confirmation') {
                    if ((int) $task['runner_id'] !== $actorId || !in_array($actorRole, ['runner', 'both'], true)) {
                        throw new RuntimeException('Only assigned runner can complete execution stage.');
                    }
                    return;
                }

                if ($targetState === 'cancelled') {
                    $isOwner = (int) $task['client_id'] === $actorId || (int) $task['runner_id'] === $actorId;
                    if (!$isOwner) {
                        throw new RuntimeException('Only task owner can cancel this task.');
                    }
                    return;
                }

                throw new RuntimeException('Invalid transition from in_progress state.');

            case 'awaiting_confirmation':
                if ($targetState === 'completed') {
                    if ((int) $task['client_id'] !== $actorId || !in_array($actorRole, ['client', 'both'], true)) {
                        throw new RuntimeException('Only client can approve completion.');
                    }
                    return;
                }

                if ($targetState === 'disputed') {
                    if ((int) $task['client_id'] !== $actorId || !in_array($actorRole, ['client', 'both'], true)) {
                        throw new RuntimeException('Only client can open a dispute from confirmation state.');
                    }
                    return;
                }

                throw new RuntimeException('Invalid transition from awaiting_confirmation state.');

            case 'disputed':
                if ($targetState !== 'completed') {
                    throw new RuntimeException('Only completion is allowed from disputed state.');
                }
                return;

            default:
                throw new RuntimeException('Unknown task state.');
        }
    }
}
