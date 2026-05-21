<?php
// Copy to db_connect.php and fill in your cPanel MySQL credentials (never commit db_connect.php).

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

$servername = "localhost";
$username = "YOUR_DB_USER";
$password = "YOUR_DB_PASSWORD";
$dbname = "YOUR_DB_NAME";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection failed: ' . $conn->connect_error
    ]);
    die();
}

if (!$conn->set_charset("utf8mb4")) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Error loading character set utf8mb4: ' . $conn->error
    ]);
    die();
}
