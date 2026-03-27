<?php

declare(strict_types=1);

namespace App\Services;

final class DarajaService
{
    private string $consumerKey;
    private string $consumerSecret;
    private string $shortCode;
    private string $passKey;
    private string $callbackUrl;
    private string $environment;
    private string $b2cInitiatorName;
    private string $b2cInitiatorPassword;
    private string $b2cResultUrl;
    private string $b2cTimeoutUrl;

    public function __construct()
    {
        $this->consumerKey = trim((string) (getenv('DARAJA_CONSUMER_KEY') ?: ''));
        $this->consumerSecret = trim((string) (getenv('DARAJA_CONSUMER_SECRET') ?: ''));
        $this->shortCode = trim((string) (getenv('DARAJA_SHORTCODE') ?: ''));
        $this->passKey = trim((string) (getenv('DARAJA_PASSKEY') ?: ''));
        $this->callbackUrl = trim((string) (getenv('DARAJA_CALLBACK_URL') ?: ''));
        $this->environment = trim((string) (getenv('DARAJA_ENV') ?: 'sandbox'));
        $this->b2cInitiatorName = trim((string) (getenv('DARAJA_B2C_INITIATOR_NAME') ?: ''));
        $this->b2cInitiatorPassword = trim((string) (getenv('DARAJA_B2C_INITIATOR_PASSWORD') ?: ''));
        $this->b2cResultUrl = trim((string) (getenv('DARAJA_B2C_RESULT_URL') ?: ''));
        $this->b2cTimeoutUrl = trim((string) (getenv('DARAJA_B2C_TIMEOUT_URL') ?: ''));
    }

    public function configured(): bool
    {
        return $this->consumerKey !== ''
            && $this->consumerSecret !== ''
            && $this->shortCode !== ''
            && $this->passKey !== ''
            && $this->callbackUrl !== '';
    }

    public function stkPush(string $phoneNumber, float $amount, string $accountReference, string $description): array
    {
        if (!$this->configured()) {
            return ['ok' => false, 'error' => 'Daraja configuration is incomplete. Add DARAJA_CONSUMER_KEY, DARAJA_CONSUMER_SECRET, DARAJA_SHORTCODE, DARAJA_PASSKEY, and DARAJA_CALLBACK_URL to .env'];
        }

        $accessToken = $this->accessToken();
        if ($accessToken === null) {
            return ['ok' => false, 'error' => 'Unable to get Daraja access token. Check your keys and network.'];
        }

        $timestamp = gmdate('YmdHis');
        $password = base64_encode($this->shortCode . $this->passKey . $timestamp);

        $payload = [
            'BusinessShortCode' => $this->shortCode,
            'Password' => $password,
            'Timestamp' => $timestamp,
            'TransactionType' => 'CustomerPayBillOnline',
            'Amount' => (int) ceil($amount),
            'PartyA' => $phoneNumber,
            'PartyB' => $this->shortCode,
            'PhoneNumber' => $phoneNumber,
            'CallBackURL' => $this->callbackUrl,
            'AccountReference' => $accountReference,
            'TransactionDesc' => $description,
        ];

        $response = $this->postJson($this->baseUrl() . '/mpesa/stkpush/v1/processrequest', $payload, [
            'Authorization: Bearer ' . $accessToken,
        ]);

        if (!is_array($response)) {
            return ['ok' => false, 'error' => 'Invalid response from Daraja STK push.'];
        }

        $accepted = ((string) ($response['ResponseCode'] ?? '') === '0');

        return [
            'ok' => $accepted,
            'response' => $response,
            'error' => $accepted ? null : ((string) ($response['errorMessage'] ?? $response['ResponseDescription'] ?? 'Daraja STK push rejected request.')),
            'reference' => (string) ($response['CheckoutRequestID'] ?? ''),
        ];
    }

    public function b2cWithdraw(string $phoneNumber, float $amount, string $remarks): array
    {
        if (!$this->configuredB2c()) {
            return ['ok' => false, 'error' => 'Daraja B2C configuration is incomplete. Add DARAJA_B2C_INITIATOR_NAME, DARAJA_B2C_INITIATOR_PASSWORD, DARAJA_B2C_RESULT_URL, and DARAJA_B2C_TIMEOUT_URL to .env'];
        }

        $accessToken = $this->accessToken();
        if ($accessToken === null) {
            return ['ok' => false, 'error' => 'Unable to get Daraja access token. Check your keys and network.'];
        }

        $securityCredential = base64_encode($this->b2cInitiatorPassword);
        $payload = [
            'InitiatorName' => $this->b2cInitiatorName,
            'SecurityCredential' => $securityCredential,
            'CommandID' => 'BusinessPayment',
            'Amount' => (int) ceil($amount),
            'PartyA' => $this->shortCode,
            'PartyB' => $phoneNumber,
            'Remarks' => $remarks,
            'QueueTimeOutURL' => $this->b2cTimeoutUrl,
            'ResultURL' => $this->b2cResultUrl,
            'Occasion' => 'Tumami Wallet Withdrawal',
        ];

        $response = $this->postJson($this->baseUrl() . '/mpesa/b2c/v1/paymentrequest', $payload, [
            'Authorization: Bearer ' . $accessToken,
        ]);

        if (!is_array($response)) {
            return ['ok' => false, 'error' => 'Invalid response from Daraja B2C request.'];
        }

        $accepted = ((string) ($response['ResponseCode'] ?? '') === '0');
        return [
            'ok' => $accepted,
            'response' => $response,
            'error' => $accepted ? null : ((string) ($response['errorMessage'] ?? $response['ResponseDescription'] ?? 'Daraja B2C rejected request.')),
            'reference' => (string) ($response['ConversationID'] ?? $response['OriginatorConversationID'] ?? ''),
        ];
    }

    public function configuredB2c(): bool
    {
        return $this->configured()
            && $this->b2cInitiatorName !== ''
            && $this->b2cInitiatorPassword !== ''
            && $this->b2cResultUrl !== ''
            && $this->b2cTimeoutUrl !== '';
    }

    private function accessToken(): ?string
    {
        $url = $this->baseUrl() . '/oauth/v1/generate?grant_type=client_credentials';

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_HTTPHEADER => [
                'Authorization: Basic ' . base64_encode($this->consumerKey . ':' . $this->consumerSecret),
            ],
        ]);

        $raw = curl_exec($ch);
        if ($raw === false) {
            curl_close($ch);
            return null;
        }

        $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($statusCode >= 400) {
            return null;
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded) || !isset($decoded['access_token'])) {
            return null;
        }

        return (string) $decoded['access_token'];
    }

    private function postJson(string $url, array $payload, array $headers = []): ?array
    {
        $ch = curl_init($url);
        $requestHeaders = array_merge([
            'Content-Type: application/json',
        ], $headers);

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_THROW_ON_ERROR),
            CURLOPT_HTTPHEADER => $requestHeaders,
        ]);

        $raw = curl_exec($ch);
        if ($raw === false) {
            curl_close($ch);
            return null;
        }

        curl_close($ch);

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    private function baseUrl(): string
    {
        return $this->environment === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
    }
}
