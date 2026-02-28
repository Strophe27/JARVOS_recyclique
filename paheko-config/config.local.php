<?php
namespace Paheko;

// Activation OIDC Paheko en dev/local (story 14.2).
// Secrets injectes via variables d'environnement; aucune valeur sensible en dur.
// En local HTTP, forcer HTTPS a off pour que le cookie de session ne soit pas "Secure".
$_SERVER['HTTPS'] = 'off';
ini_set('session.cookie_secure', '0');
ini_set('session.cookie_httponly', '1');

/**
 * Return a trimmed env value, or null when undefined/empty.
 */
function paheko_env_or_null(string $key): ?string
{
    $value = getenv($key);
    if ($value === false) {
        return null;
    }

    $trimmed = trim((string) $value);
    return $trimmed === '' ? null : $trimmed;
}

/**
 * Parse a strict boolean env value.
 */
function paheko_env_bool(string $key): ?bool
{
    $value = paheko_env_or_null($key);
    if ($value === null) {
        return null;
    }

    $parsed = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if ($parsed === null) {
        throw new RuntimeException(sprintf(
            'Invalid boolean value for %s. Use true/false/1/0.',
            $key
        ));
    }

    return $parsed;
}

$secretKey = paheko_env_or_null('PAHEKO_SECRET_KEY');
if ($secretKey !== null && !defined('SECRET_KEY')) {
    define('SECRET_KEY', $secretKey);
}

$oidcClientUrl = paheko_env_or_null('PAHEKO_OIDC_CLIENT_URL');
if ($oidcClientUrl !== null && !defined('OIDC_CLIENT_URL')) {
    define('OIDC_CLIENT_URL', $oidcClientUrl);
}

$oidcClientId = paheko_env_or_null('PAHEKO_OIDC_CLIENT_ID');
if ($oidcClientId !== null && !defined('OIDC_CLIENT_ID')) {
    define('OIDC_CLIENT_ID', $oidcClientId);
}

$oidcClientSecret = paheko_env_or_null('PAHEKO_OIDC_CLIENT_SECRET');
if ($oidcClientSecret !== null && !defined('OIDC_CLIENT_SECRET')) {
    define('OIDC_CLIENT_SECRET', $oidcClientSecret);
}

$matchEmail = paheko_env_bool('PAHEKO_OIDC_CLIENT_MATCH_EMAIL');
if ($matchEmail !== null && !defined('OIDC_CLIENT_MATCH_EMAIL')) {
    define('OIDC_CLIENT_MATCH_EMAIL', $matchEmail);
}

if (!defined('WWW_URL')) {
    define('WWW_URL', 'http://localhost:8080/');
}
if (!defined('ADMIN_URL')) {
    define('ADMIN_URL', 'http://localhost:8080/admin/');
}
