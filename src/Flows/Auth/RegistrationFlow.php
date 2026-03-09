<?php

declare(strict_types=1);

namespace App\Flows\Auth;

use App\Repositories\UserRepository;

class RegistrationFlow
{
    public function __construct(private UserRepository $users)
    {
    }

    public function register(array $input): array
    {
        $fullName = trim((string) ($input['full_name'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $phone = trim((string) ($input['phone'] ?? ''));
        $role = (string) ($input['role'] ?? 'client');
        $password = (string) ($input['password'] ?? '');

        $errors = [];

        if ($fullName === '' || $email === '' || $phone === '' || $password === '') {
            $errors[] = 'All fields are required.';
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Invalid email address.';
        }
        if (!in_array($role, ['client', 'runner', 'both'], true)) {
            $errors[] = 'Invalid role selected.';
        }
        if (strlen($password) < 8) {
            $errors[] = 'Password must be at least 8 characters long.';
        }

        if ($errors !== []) {
            return ['ok' => false, 'errors' => $errors];
        }

        if ($this->users->findByEmail($email)) {
            return ['ok' => false, 'errors' => ['Email already registered.']];
        }

        $userId = $this->users->create($fullName, $email, $phone, password_hash($password, PASSWORD_DEFAULT), $role);

        return ['ok' => true, 'user_id' => $userId, 'role' => $role];
    }
}
