<?php
declare(strict_types=1);

namespace Paheko;

require_once '/var/www/paheko/include/init.php';

$email = getenv('PAHEKO_TEST_MEMBER_EMAIL') ?: 'oidc.test@local.dev';
$u = Users::getFromLogin($email);

echo 'lookup=' . $email . PHP_EOL;
echo 'found=' . ($u ? 'true' : 'false') . PHP_EOL;
if ($u) {
    echo 'user_id=' . $u->id() . PHP_EOL;
}
