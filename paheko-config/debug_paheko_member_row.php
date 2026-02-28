<?php
declare(strict_types=1);

$dbPath = '/var/www/paheko/data/association.sqlite';
$email = getenv('PAHEKO_TEST_MEMBER_EMAIL') ?: 'oidc.test@local.dev';

$db = new SQLite3($dbPath);
$db->busyTimeout(5000);

$stmt = $db->prepare('SELECT id, id_category, nom, email, password, date_login, date_updated FROM users WHERE email = :email LIMIT 1;');
$stmt->bindValue(':email', $email, SQLITE3_TEXT);
$res = $stmt->execute();
$row = $res ? $res->fetchArray(SQLITE3_ASSOC) : false;

echo 'lookup=' . $email . PHP_EOL;
if (!$row) {
    echo "found=false\n";
    exit(0);
}

echo "found=true\n";
foreach ($row as $k => $v) {
    echo $k . '=' . ($v === null ? 'null' : (string)$v) . PHP_EOL;
}
