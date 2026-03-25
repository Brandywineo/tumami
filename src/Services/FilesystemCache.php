<?php

declare(strict_types=1);

namespace App\Services;

use JsonException;
use RuntimeException;

class FilesystemCache
{
    private string $cacheDir;

    public function __construct(?string $cacheDir = null)
    {
        $this->cacheDir = $cacheDir ?? sys_get_temp_dir() . '/tumami-cache';
    }

    /**
     * @template T
     * @param callable():T $callback
     * @return T
     */
    public function remember(string $key, int $ttlSeconds, callable $callback): mixed
    {
        $cacheFile = $this->cacheFile($key);
        $cached = $this->read($cacheFile);
        if ($cached !== null) {
            return $cached;
        }

        $value = $callback();
        $this->write($cacheFile, $ttlSeconds, $value);

        return $value;
    }

    private function cacheFile(string $key): string
    {
        return $this->cacheDir . '/' . hash('sha256', $key) . '.json';
    }

    private function ensureCacheDir(): void
    {
        if (is_dir($this->cacheDir)) {
            return;
        }

        if (!mkdir($concurrentDirectory = $this->cacheDir, 0775, true) && !is_dir($concurrentDirectory)) {
            throw new RuntimeException('Unable to create cache directory.');
        }
    }

    private function read(string $cacheFile): mixed
    {
        if (!is_file($cacheFile) || !is_readable($cacheFile)) {
            return null;
        }

        $raw = file_get_contents($cacheFile);
        if ($raw === false || $raw === '') {
            return null;
        }

        try {
            $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return null;
        }

        if (!is_array($decoded) || !isset($decoded['expires_at'])) {
            return null;
        }

        if ((int) $decoded['expires_at'] < time()) {
            return null;
        }

        return $decoded['value'] ?? null;
    }

    private function write(string $cacheFile, int $ttlSeconds, mixed $value): void
    {
        $this->ensureCacheDir();

        $payload = [
            'expires_at' => time() + max(1, $ttlSeconds),
            'value' => $value,
        ];

        try {
            $json = json_encode($payload, JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            throw new RuntimeException('Unable to encode cache payload.', 0, $e);
        }

        $tempFile = $cacheFile . '.' . uniqid('tmp-', true);
        if (file_put_contents($tempFile, $json, LOCK_EX) === false) {
            @unlink($tempFile);
            throw new RuntimeException('Unable to write cache payload.');
        }

        rename($tempFile, $cacheFile);
    }
}
