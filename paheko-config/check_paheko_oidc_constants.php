<?php
declare(strict_types=1);

require '/var/www/paheko/config.local.php';

echo 'match_email=' . (defined('OIDC_CLIENT_MATCH_EMAIL') ? (OIDC_CLIENT_MATCH_EMAIL ? 'true' : 'false') : 'undefined') . PHP_EOL;
echo 'oidc_url=' . (defined('OIDC_CLIENT_URL') ? OIDC_CLIENT_URL : 'undefined') . PHP_EOL;
echo 'oidc_id=' . (defined('OIDC_CLIENT_ID') ? OIDC_CLIENT_ID : 'undefined') . PHP_EOL;
echo 'oidc_secret_len=' . (defined('OIDC_CLIENT_SECRET') ? strlen((string) OIDC_CLIENT_SECRET) : -1) . PHP_EOL;
