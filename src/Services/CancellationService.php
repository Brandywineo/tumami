<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;

class CancellationService
{
    public function __construct(private WalletService $walletService)
    {
    }

    public function apply(array $task, int $actorId): void
    {
        $status = $task['status'];
        $fee = (float) $task['runner_fee'];
        $clientId = (int) $task['client_id'];
        $runnerId = (int) ($task['runner_id'] ?? 0);
        $cancelledByClient = $actorId === $clientId;

        if ($status === 'posted') {
            $this->walletService->recordEntry($clientId, (int) $task['id'], 'credit', 'refund', $fee, 'CANCEL_POSTED_FULL_REFUND');
            return;
        }

        if (!in_array($status, ['accepted', 'in_progress'], true)) {
            throw new RuntimeException('Cancellation policy not supported for this state.');
        }

        if ($runnerId <= 0) {
            $this->walletService->recordEntry($clientId, (int) $task['id'], 'credit', 'refund', $fee, 'CANCEL_NO_RUNNER_REFUND');
            return;
        }

        if ($cancelledByClient) {
            if ($status === 'accepted') {
                $runnerPart = round($fee * 0.10, 2);
            } else {
                $runnerPart = round($fee * 0.40, 2);
            }
            $clientPart = round($fee - $runnerPart, 2);
            $commission = round($runnerPart * 0.10, 2);
            $runnerNet = round($runnerPart - $commission, 2);

            if ($clientPart > 0) {
                $this->walletService->recordEntry($clientId, (int) $task['id'], 'credit', 'refund', $clientPart, 'CANCEL_CLIENT_REFUND');
            }
            if ($runnerNet > 0) {
                $this->walletService->recordEntry($runnerId, (int) $task['id'], 'credit', 'task_earning', $runnerNet, 'CANCEL_COMPENSATION');
            }
            if ($commission > 0) {
                $this->walletService->recordEntry(1, (int) $task['id'], 'credit', 'commission', $commission, 'CANCEL_COMPENSATION_COMMISSION');
            }
            return;
        }

        $this->walletService->recordEntry($clientId, (int) $task['id'], 'credit', 'refund', $fee, 'CANCEL_RUNNER_FULL_REFUND');
        $penalty = $status === 'in_progress' ? 150.00 : 50.00;
        $this->walletService->recordEntry($runnerId, (int) $task['id'], 'debit', 'penalty', $penalty, 'CANCEL_RUNNER_PENALTY');
    }
}
