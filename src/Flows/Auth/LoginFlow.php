<?php

declare(strict_types=1);

namespace App\Flows\Auth;

use App\Repositories\UserRepository;

class LoginFlow
{
    public function __construct(private UserRepository $users)
    {
    }

    public function authenticate(string $email, string $password): array
    {
        $normalizedEmail = strtolower(trim($email));
        $user = $this->users->findByEmail($normalizedEmail);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            return ['ok' => false, 'error' => 'Invalid login credentials.'];
        }

        if ($user['account_status'] !== 'active') {
            return ['ok' => false, 'error' => 'Your account is not active.'];
        }

        return ['ok' => true, 'user' => $user];
    }
}
