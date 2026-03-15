<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\UserRepository;
use RuntimeException;

class RunnerAvailabilityService
{
    public function __construct(private UserRepository $users)
    {
    }

    public function status(int $runnerId, int $onlineWindowSeconds = 90): array
    {
        $profile = $this->users->runnerAvailability($runnerId);
        if (!$profile) {
            throw new RuntimeException('Runner profile not found.');
        }

        $updatedAt = $profile['location_updated_at'] ?? null;
        $isOnline = false;
        if ($updatedAt) {
            $timestamp = strtotime((string) $updatedAt);
            if ($timestamp !== false) {
                $isOnline = (time() - $timestamp) <= $onlineWindowSeconds;
            }
        }

        return [
            'is_available' => (int) $profile['is_available'] === 1,
            'is_online' => $isOnline,
            'location_updated_at' => $updatedAt,
        ];
    }

    public function setAvailability(int $runnerId, bool $isAvailable): array
    {
        $this->users->setRunnerAvailability($runnerId, $isAvailable);

        return $this->status($runnerId);
    }
}

