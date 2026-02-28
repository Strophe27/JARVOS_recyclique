<?php
declare(strict_types=1);

$dbPath = '/var/www/paheko/data/association.sqlite';
$email = getenv('PAHEKO_TEST_MEMBER_EMAIL') ?: 'oidc.test@local.dev';
$name = getenv('PAHEKO_TEST_MEMBER_NAME') ?: 'OIDC Test User';

$db = new SQLite3($dbPath);
$db->busyTimeout(5000);

$existsStmt = $db->prepare('SELECT id FROM users WHERE email = :email LIMIT 1;');
$existsStmt->bindValue(':email', $email, SQLITE3_TEXT);
$existsRes = $existsStmt->execute();
$existing = $existsRes ? $existsRes->fetchArray(SQLITE3_ASSOC) : false;

if ($existing && isset($existing['id'])) {
    echo "member_exists id=" . $existing['id'] . PHP_EOL;
    exit(0);
}

$idRes = $db->querySingle('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM users;', true);
$numeroRes = $db->querySingle('SELECT COALESCE(MAX(numero), 0) + 1 AS next_numero FROM users;', true);
$categoryRes = $db->querySingle('SELECT id FROM users_categories ORDER BY id ASC LIMIT 1;', true);

$nextId = (int) ($idRes['next_id'] ?? 1);
$nextNumero = (int) ($numeroRes['next_numero'] ?? 1);
$idCategory = (int) ($categoryRes['id'] ?? 1);
$passwordHash = password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT);
$now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');

$insert = $db->prepare('
    INSERT INTO users (
        id, id_category, date_login, date_updated, otp_secret, otp_recovery_codes, pgp_key,
        id_parent, is_parent, preferences, numero, nom, email, password, adresse,
        code_postal, ville, telephone, lettre_infos, date_inscription
    ) VALUES (
        :id, :id_category, NULL, :date_updated, NULL, NULL, NULL,
        NULL, 0, NULL, :numero, :nom, :email, :password, NULL,
        NULL, NULL, NULL, 0, :date_inscription
    );
');

$insert->bindValue(':id', $nextId, SQLITE3_INTEGER);
$insert->bindValue(':id_category', $idCategory, SQLITE3_INTEGER);
$insert->bindValue(':date_updated', $now, SQLITE3_TEXT);
$insert->bindValue(':numero', $nextNumero, SQLITE3_INTEGER);
$insert->bindValue(':nom', $name, SQLITE3_TEXT);
$insert->bindValue(':email', $email, SQLITE3_TEXT);
$insert->bindValue(':password', $passwordHash, SQLITE3_TEXT);
$insert->bindValue(':date_inscription', substr($now, 0, 10), SQLITE3_TEXT);

$ok = $insert->execute();

if (!$ok) {
    fwrite(STDERR, 'member_create_failed: ' . $db->lastErrorMsg() . PHP_EOL);
    exit(1);
}

echo "member_created id={$nextId} email={$email}" . PHP_EOL;
