<?php

declare(strict_types=1);

namespace App\Flows\UserSettings;

use App\Repositories\UserRepository;

class PasswordFlow
{
    public function __construct(private UserRepository $users)
    {
    }

    public function changePassword(int $userId, string $currentPassword, string $newPassword, string $confirmPassword): array
    {
        $user = $this->users->findById($userId);
        if (!$user) {
            return ['ok' => false, 'error' => 'User account not found.'];
        }

        if (!password_verify($currentPassword, $user['password_hash'])) {
            return ['ok' => false, 'error' => 'Current password is incorrect.'];
        }

        if (strlen($newPassword) < 8) {
            return ['ok' => false, 'error' => 'New password must be at least 8 characters long.'];
        }

        if ($newPassword !== $confirmPassword) {
            return ['ok' => false, 'error' => 'New password and confirmation do not match.'];
        }

        if (password_verify($newPassword, $user['password_hash'])) {
            return ['ok' => false, 'error' => 'New password must be different from current password.'];
        }

        $this->users->updatePasswordHash($userId, password_hash($newPassword, PASSWORD_DEFAULT));

        return ['ok' => true];
    }
}
