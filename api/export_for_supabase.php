<?php
/**
 * Self-contained Supabase export — upload ONLY this file to public_html/api/
 * (overwrites or creates export_for_supabase.php next to existing api.php)
 *
 * Test: https://sfdm.xyz/api/export_for_supabase.php?import_secret=madrasha-supabase-import
 */
ob_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db_connect.php';

$secret = $_GET['import_secret'] ?? '';
$expected = getenv('LEGACY_IMPORT_SECRET') ?: 'madrasha-supabase-import';

if ($secret !== $expected) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Invalid import secret.']);
    exit;
}

date_default_timezone_set('Asia/Dhaka');

function export_teachers_for_supabase(mysqli $conn): array {
    $teachers = $conn->query("SELECT * FROM teachers")->fetch_all(MYSQLI_ASSOC);
    $weekly = $conn->query(
        "SELECT TeacherIndex FROM routine WHERE Subject IS NOT NULL AND Subject != '' AND TeacherIndex IS NOT NULL"
    )->fetch_all(MYSQLI_ASSOC);
    $counts = [];
    foreach ($weekly as $row) {
        if (!empty($row['TeacherIndex'])) {
            $counts[$row['TeacherIndex']] = ($counts[$row['TeacherIndex']] ?? 0) + 1;
        }
    }
    foreach ($teachers as &$t) {
        unset($t['Password'], $t['password'], $t['NickName']);
        $t['weeklyClassCount'] = $counts[$t['IndexNo']] ?? 0;
    }
    unset($t);
    return $teachers;
}

try {
    $teachers = export_teachers_for_supabase($conn);
    $routine = $conn->query(
        "SELECT Day, Period, Class, Subject, TeacherIndex FROM routine ORDER BY Day, Period, Class"
    )->fetch_all(MYSQLI_ASSOC);
    $leaves = $conn->query(
        "SELECT TeacherIndex, LeaveStart, LeaveEnd, LeaveType, Comment FROM leaves ORDER BY LeaveStart DESC"
    )->fetch_all(MYSQLI_ASSOC);
    $reports = $conn->query(
        "SELECT * FROM reports ORDER BY ReportDate DESC, id DESC LIMIT 50000"
    )->fetch_all(MYSQLI_ASSOC);
    $students = $conn->query(
        "SELECT id, Roll, Name, Gender, Class FROM students ORDER BY Class, Roll"
    )->fetch_all(MYSQLI_ASSOC);
    $monthly = $conn->query(
        "SELECT id, student_id, year, month, days_present, comment FROM student_monthly_attendance"
    )->fetch_all(MYSQLI_ASSOC);
    $monitoring_team = $conn->query("SELECT * FROM monitoring_team")->fetch_all(MYSQLI_ASSOC);
    $special_messages = $conn->query("SELECT MessageKey, MessageValue FROM special_messages")->fetch_all(MYSQLI_ASSOC);
    $saved_messages = $conn->query("SELECT id, message_text FROM saved_messages ORDER BY id")->fetch_all(MYSQLI_ASSOC);
    $duty_history = $conn->query("SELECT * FROM duty_history")->fetch_all(MYSQLI_ASSOC);
    $temporary_duties = $conn->query("SELECT * FROM temporary_duties")->fetch_all(MYSQLI_ASSOC);

    echo json_encode([
        'status' => 'success',
        'exported_at' => date('c'),
        'counts' => [
            'teachers' => count($teachers),
            'routine' => count($routine),
            'leaves' => count($leaves),
            'reports' => count($reports),
            'students' => count($students),
            'student_monthly_attendance' => count($monthly),
        ],
        'data' => [
            'teachers' => $teachers,
            'routine' => $routine,
            'leaves' => $leaves,
            'reports' => $reports,
            'students' => $students,
            'student_monthly_attendance' => $monthly,
            'monitoring_team' => $monitoring_team,
            'special_messages' => $special_messages,
            'saved_messages' => $saved_messages,
            'duty_history' => $duty_history,
            'temporary_duties' => $temporary_duties,
        ],
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}

if (isset($conn)) {
    $conn->close();
}
