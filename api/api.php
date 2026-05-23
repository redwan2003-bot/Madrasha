<?php
// FINAL FIX: Start output buffering to catch any stray notices or warnings.
ob_start();

// Set headers for JSON response and allow cross-origin requests AT THE VERY TOP
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Include the database connection and functions files
require_once 'db_connect.php';
require_once 'functions.php';

// A simple router based on the 'action' parameter from GET or POST
$action = isset($_REQUEST['action']) ? $_REQUEST['action'] : '';
$response = [];

try {
    // Handle incoming requests using a switch statement
    switch ($action) {
        // --- CLASS MONITORING APP ACTIONS ---
        case 'get_all_data':
            $all_data = get_all_data($conn);
            // We now filter the monitoring report directly in the API for index.html
            $filtered_report_result = get_filtered_monitoring_report($conn, date('Y-m-d'));
            if ($filtered_report_result['status'] === 'success') {
                $all_data['monitoringReport'] = $filtered_report_result['data'];
            }
            $response = ['status' => 'success', 'data' => $all_data];
            break;

        case 'login':
            $password = $_POST['password'] ?? '';
            $response = teacher_login($conn, $password);
            break;

        case 'checkPassword':
            $password = $_POST['password'] ?? '';
            $response = check_admin_password($conn, $password);
            break;
        
        case 'monitorLogin':
            $index = $_POST['index'] ?? '';
            $password = $_POST['password'] ?? '';
            $response = monitor_login($conn, $index, $password);
            break;

        case 'reassignDuty':
            $data = [
                'teamLeadPassword' => $_POST['teamLeadPassword'] ?? '',
                'date'             => $_POST['date'] ?? date('Y-m-d'),
                'period'           => $_POST['period'] ?? '',
                'newMonitorIndex'  => $_POST['newMonitorIndex'] ?? ''
            ];
            $response = reassign_duty($conn, $data);
            break;
            
        case 'submitAttendance':
            $report_data = [
                'Date'           => $_POST['Date'] ?? date('Y-m-d'),
                'Time'           => $_POST['Time'] ?? date('H:i:s'),
                'Period'         => $_POST['Period'] ?? '',
                'Class'          => $_POST['Class'] ?? '',
                'TeacherName'    => $_POST['TeacherName'] ?? '',
                'NumberOfAttend' => isset($_POST['NumberOfAttend']) ? (int)$_POST['NumberOfAttend'] : 0,
                'monitorReport'  => $_POST['monitorReport'] ?? 'N/A',
                'monitorIndex'   => $_POST['monitorIndex'] ?? 'N/A'
            ];
            $response = submit_attendance_report($conn, $report_data);
            break;
        
        case 'submitLeave':
            $leave_data = [
                'index'      => $_POST['index'] ?? '',
                'leaveStart' => $_POST['leaveStart'] ?? '',
                'leaveEnd'   => $_POST['leaveEnd'] ?? '',
                'leaveType'  => $_POST['leaveType'] ?? '',
                'comment'    => $_POST['comment'] ?? ''
            ];
            $response = submit_leave_request($conn, $leave_data);
            break;
            
        case 'getIndividualLeaveCard':
            $index = $_POST['index'] ?? '';
            $response = get_individual_leave_card($conn, $index);
            break;

        // --- OFFICE PANEL ACTIONS ---

        case 'office_login':
            $password = $_POST['password'] ?? '';
            $response = office_login($conn, $password);
            break;
        
        // MODIFICATION START: Separated the actions to call the correct function for each task.
        case 'getRoutineAndAttendanceForPeriod': // This specific action is for the office panel's daily attendance form
            $date = $_REQUEST['date'] ?? '';
            $period = $_REQUEST['period'] ?? '';
            $className = $_REQUEST['className'] ?? '';
            // Call the NEW function 'get_teachers_for_period' to solve the issue.
            $response = get_teachers_for_period($conn, $date, $period, $className);
            break;

        case 'getRoutineAndAttendanceForDate': // This is the OLD general action. We keep it to avoid breaking other pages.
            $date = $_REQUEST['date'] ?? '';
            $period = $_REQUEST['period'] ?? '';
            $className = $_REQUEST['className'] ?? '';
            // It still calls the OLD function 'get_routine_and_attendance'.
            $response = get_routine_and_attendance($conn, $date, $period, $className);
            break;
        // MODIFICATION END

        case 'submitSingleDailyAttendance':
        case 'batchSubmitDailyAttendance':
            $reports = isset($_POST['reports']) ? json_decode($_POST['reports'], true) : [json_decode($_POST['report'], true)];
            $response = submit_daily_attendance($conn, $reports);
            break;

        case 'get_students_by_class': 
            $className = $_GET['className'] ?? '';
            $response = get_students_by_class($conn, $className);
            break;

        case 'submit_monthly_attendance':
            $year = $_POST['year'] ?? date('Y');
            $month = $_POST['month'] ?? date('m');
            $className = $_POST['className'] ?? '';
            $attendanceData = isset($_POST['attendanceData']) ? json_decode($_POST['attendanceData'], true) : [];
            $response = submit_monthly_attendance($conn, $year, $month, $className, $attendanceData);
            break;

        // --- ADMIN PANEL ACTIONS ---

        case 'adminLogin':
            $password = $_POST['password'] ?? '';
            $response = admin_login($conn, $password);
            break;

        case 'getAllDataForAdmin':
            $response = get_all_data_for_admin($conn);
            break;

        case 'getTeacherForAdmin':
            $index = $_POST['index'] ?? '';
            $response = get_teacher_for_admin($conn, $index);
            break;

        case 'addLeaveInfo':
        case 'batchAddLeaveInfo': 
             $reports = isset($_POST['reports']) ? json_decode($_POST['reports'], true) : [$_POST];
             $success_count = 0;
             $last_error = '';

             foreach ($reports as $report_data) {
                 $leave_data = [
                     'index'      => $report_data['teacherIndex'] ?? '',
                     'leaveStart' => $report_data['leaveStart'] ?? '',
                     'leaveEnd'   => $report_data['leaveEnd'] ?? '',
                     'leaveType'  => $report_data['leaveType'] ?? '',
                     'comment'    => $report_data['comment'] ?? ''
                 ];

                 $result = submit_leave_request($conn, $leave_data);
                 if ($result['status'] === 'success') {
                     $success_count++;
                 } else {
                     $last_error = $result['message'];
                 }
             }

             if ($success_count > 0) {
                 $response = ['status' => 'success', 'message' => $success_count . 'টি ছুটির তথ্য সফলভাবে জমা হয়েছে।'];
             } else {
                 throw new Exception('কোনো ছুটির তথ্য জমা দেওয়া সম্ভব হয়নি। ' . $last_error);
             }
             break;
        
        case 'updateSystemMessage':
            $key = $_POST['messageKey'] ?? '';
            $message = $_POST['newMessage'] ?? '';
            $response = update_system_message($conn, $key, $message);
            break;

        case 'addNewSavedMessage':
            $message = $_POST['newMessage'] ?? '';
            $response = add_new_saved_message($conn, $message);
            break;

        case 'deleteMessage':
            $id = $_POST['messageId'] ?? '';
            $response = delete_message($conn, $id);
            break;

        case 'updateMonitorDuty':
            $data = [
                'teacherIndex' => $_POST['teacherIndex'] ?? '',
                'teacherName'  => $_POST['teacherName'] ?? '',
                'monitorDay'   => $_POST['monitorDay'] ?? '',
                'monComment'   => $_POST['monComment'] ?? '',
                'status'       => $_POST['status'] ?? 'On'
            ];
            $response = update_monitor_duty($conn, $data);
            break;

        case 'updateTeacherInfo':
            $data = [
                'IndexNo'    => $_POST['Index'] ?? '',
                'TeacherFN'  => $_POST['TeacherFN'] ?? '',
                'TcrAddress' => $_POST['TcrAddress'] ?? '',
                'TeacherSub' => $_POST['TeacherSub'] ?? '',
                'MobileNo'   => $_POST['MobileNo'] ?? ''
            ];
            $response = update_teacher_info($conn, $data);
            break;
        
        case 'getMonitoringDataForDate':
            $date = $_POST['date'] ?? date('Y-m-d');
            $response = get_monitoring_data_for_date($conn, $date);
            break;
        
        case 'adminReassignDuty':
             $data = [
                 'date'            => $_POST['date'] ?? date('Y-m-d'),
                 'period'          => $_POST['period'] ?? '',
                 'newMonitorIndex' => $_POST['newMonitorIndex'] ?? ''
             ];
             $response = admin_reassign_duty($conn, $data);
             break;
        
        case 'generateReport':
            $report_subtype = $_POST['reportSubtype'] ?? '';
            $timeframe = $_POST['timeframe'] ?? 'daily';
            $date = $_POST['date'] ?? date('Y-m-d');
            $month = $_POST['month'] ?? date('m');
            $year = $_POST['year'] ?? date('Y');
            $response = generate_report($conn, $report_subtype, $timeframe, $date, $month, $year);
            break;
            
        case 'export_for_supabase':
            $secret = $_REQUEST['import_secret'] ?? '';
            $expected = getenv('LEGACY_IMPORT_SECRET') ?: 'madrasha-supabase-import';
            if ($secret !== $expected) {
                throw new Exception('Invalid import secret.');
            }
            $response = export_for_supabase($conn);
            break;

        case 'batchSubmitReports':
            $reports = isset($_POST['reports']) ? json_decode($_POST['reports'], true) : [];
            $success_count = 0;
            $last_error = '';

            if (empty($reports)) {
                throw new Exception('কোনো রিপোর্ট পাওয়া যায়নি।');
            }

            foreach ($reports as $report_data) {
                $data_to_submit = [
                    'Date'           => $report_data['Date'] ?? date('Y-m-d'),
                    'Time'           => date('H:i:s'),
                    'Period'         => $report_data['Period'] ?? '',
                    'Class'          => $report_data['Class'] ?? '',
                    'TeacherName'    => $report_data['ClassTeacher'] ?? '',
                    'NumberOfAttend' => $report_data['NumberOfAttend'] ?? 0,
                    'monitorReport'  => $report_data['MonitoReport'] ?? 'N/A',
                    'monitorIndex'   => $report_data['MonitorIndex'] ?? 'N/A'
                ];
                $result = submit_attendance_report($conn, $data_to_submit);
                if ($result['status'] === 'success') {
                    $success_count++;
                } else {
                    $last_error = $result['message'];
                }
            }

            if ($success_count > 0) {
                $response = ['status' => 'success', 'message' => $success_count . 'টি রিপোর্ট সফলভাবে জমা হয়েছে।'];
            } else {
                throw new Exception('কোনো রিপোর্ট জমা দেওয়া সম্ভব হয়নি। ' . $last_error);
            }
            break;

        default:
            throw new Exception('Invalid action provided.');
    }
} catch (Exception $e) {
    // If any error occurs, catch it and create a JSON error response.
    $response = [
        'status'  => 'error',
        'message' => 'PHP Error: ' . $e->getMessage()
    ];
    http_response_code(500); // Internal Server Error
}

// Close the database connection
if (isset($conn)) {
    $conn->close();
}

// Clean any stray output (like notices/warnings) that might have been generated.
ob_end_clean();

// Send the final JSON response.
echo json_encode($response);
?>
