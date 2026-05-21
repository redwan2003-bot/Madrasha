<?php
// Set the default timezone to Bangladesh time to ensure correct day calculation
date_default_timezone_set('Asia/Dhaka');

// IMPORTANT: Keep errors off for production to avoid corrupting JSON.
// error_reporting(0);
// ini_set('display_errors', 0);

/**
 * ==================================================================
 * CLASS MONITORING APP & OFFICE PANEL FUNCTIONS (EXISTING)
 * ==================================================================
 */

function get_week_number(DateTime $date) {
    return [
        'year' => (int)$date->format('o'),
        'week' => (int)$date->format('W')
    ];
}

function generate_duty_roster($conn, $for_date_str = null) {
    try {
        $today = $for_date_str ? new DateTime($for_date_str) : new DateTime();
        $days_of_week_bn = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
        $work_days_full = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার'];
        $teaching_periods = ['১ম ঘণ্টা', '২য় ঘণ্টা', '৩য় ঘণ্টা', '৪র্থ ঘণ্টা', '৫ম ঘণ্টা', '৬ষ্ঠ ঘণ্টা', '৭ম ঘণ্টা', '৮ম ঘণ্টা'];
        $today_str_bn = $days_of_week_bn[(int)$today->format('w')];

        if (!in_array($today_str_bn, $work_days_full)) return [];

        $all_teachers = get_all_teachers_with_class_counts($conn);
        $teacher_map = array_column($all_teachers, null, 'IndexNo');
        $monitoring_team_raw = $conn->query("SELECT * FROM monitoring_team")->fetch_all(MYSQLI_ASSOC);
        $on_leave_indices_data = get_todays_on_leave($conn, $today->format('Y-m-d'));
        $on_leave_indices = array_column($on_leave_indices_data, 'Index');

        $stmt_routine = $conn->prepare("SELECT Period, TeacherIndex FROM routine WHERE Day = ?");
        if (!$stmt_routine) throw new Exception('Duty Roster: Routine query failed to prepare.');
        $stmt_routine->bind_param("s", $today_str_bn);
        $stmt_routine->execute();
        $todays_routine = $stmt_routine->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_routine->close();
        
        $teacher_schedule = [];
        foreach ($todays_routine as $item) {
            if (!empty($item['TeacherIndex'])) {
                $teacher_schedule[$item['TeacherIndex']][] = $item['Period'];
            }
        }

        $todays_monitors = array_filter($monitoring_team_raw, function($m) use ($today_str_bn, $on_leave_indices) {
            return isset($m['MonitorDay'], $m['Status'], $m['TeacherIndex']) && 
                   strpos($m['MonitorDay'], $today_str_bn) !== false && 
                   $m['Status'] === 'On' && 
                   !in_array($m['TeacherIndex'], $on_leave_indices);
        });

        if (empty($todays_monitors)) return [];

        $last_week_date = (clone $today)->sub(new DateInterval('P7D'));
        $last_week_info = get_week_number($last_week_date);
        
        $stmt_history = $conn->prepare("SELECT TeacherIndex FROM duty_history WHERE Year = ? AND WeekNumber = ? AND DutyType = 'Double'");
        if (!$stmt_history) throw new Exception('Duty Roster: History query failed to prepare.');
        $stmt_history->bind_param("ii", $last_week_info['year'], $last_week_info['week']);
        $stmt_history->execute();
        $last_week_double_duty_indices = array_column($stmt_history->get_result()->fetch_all(MYSQLI_ASSOC), 'TeacherIndex');
        $stmt_history->close();

        foreach ($todays_monitors as &$monitor) {
            $teacher_details = $teacher_map[$monitor['TeacherIndex']] ?? null;
            $monitor['TeacherFN'] = $teacher_details['TeacherFN'] ?? 'Unknown';
            $off_periods_count = $teacher_details ? (count($teaching_periods) * count($work_days_full)) - $teacher_details['weeklyClassCount'] : 0;
            $monitor['priorityScore'] = (in_array($monitor['TeacherIndex'], $last_week_double_duty_indices) ? 1000 : 0) - $off_periods_count;
        }
        unset($monitor);

        usort($todays_monitors, function($a, $b) {
            return $a['priorityScore'] <=> $b['priorityScore'];
        });

        $duty_assignments = [];
        $num_monitors = count($todays_monitors);
        $num_periods = count($teaching_periods);

        if ($num_monitors >= $num_periods) {
            $assigned_monitors = array_slice($todays_monitors, 0, $num_periods);
            foreach ($assigned_monitors as $monitor) {
                $duty_assignments[] = ['name' => $monitor['TeacherFN'], 'index' => $monitor['TeacherIndex']];
            }
        } else {
            foreach ($todays_monitors as $monitor) {
                $duty_assignments[] = ['name' => $monitor['TeacherFN'], 'index' => $monitor['TeacherIndex']];
            }
            $remaining_duties = $num_periods - $num_monitors;
            for ($i = 0; $i < $remaining_duties; $i++) {
                $monitor = $todays_monitors[$i % $num_monitors];
                $duty_assignments[] = ['name' => $monitor['TeacherFN'], 'index' => $monitor['TeacherIndex']];
            }
        }

        $duty_roster = [];
        $unassigned_duties = $duty_assignments;
        srand((int)date('Ymd', $today->getTimestamp()));
        
        foreach ($teaching_periods as $period) {
            $available_monitors_for_period = array_filter($unassigned_duties, function($duty) use ($teacher_schedule, $period) {
                return !in_array($period, ($teacher_schedule[$duty['index']] ?? []));
            });
            
            $reindexed_available = array_values($available_monitors_for_period);

            $chosen_monitor = null;
            if (!empty($reindexed_available)) {
                $rand_index = rand(0, count($reindexed_available) - 1);
                $chosen_monitor = $reindexed_available[$rand_index];
            } elseif (!empty($unassigned_duties)) {
                $temp_array_for_reset = array_values($unassigned_duties);
                if (!empty($temp_array_for_reset)) {
                     $chosen_monitor = $temp_array_for_reset[0];
                }
            }

            if ($chosen_monitor) {
                $duty_roster[$period] = $chosen_monitor;
                $key_to_remove = -1;
                foreach($unassigned_duties as $key => $duty){
                    if($duty['index'] === $chosen_monitor['index'] && $duty['name'] === $chosen_monitor['name']){
                        $key_to_remove = $key;
                        break;
                    }
                }
                if($key_to_remove > -1){
                    unset($unassigned_duties[$key_to_remove]);
                }
            }
        }

        $current_week_info = get_week_number($today);
        $final_duty_counts = [];
        foreach ($duty_roster as $assignment) {
            if ($assignment) {
                $final_duty_counts[$assignment['index']] = ($final_duty_counts[$assignment['index']] ?? 0) + 1;
            }
        }

        $stmt_history_check = $conn->prepare("SELECT id FROM duty_history WHERE Year = ? AND WeekNumber = ? AND TeacherIndex = ?");
        $stmt_history_insert = $conn->prepare("INSERT INTO duty_history (Year, WeekNumber, TeacherIndex, DutyType) VALUES (?, ?, ?, ?)");
        
        if($stmt_history_check && $stmt_history_insert) {
            foreach ($todays_monitors as $monitor) {
                $stmt_history_check->bind_param("iis", $current_week_info['year'], $current_week_info['week'], $monitor['TeacherIndex']);
                $stmt_history_check->execute();
                if ($stmt_history_check->get_result()->num_rows === 0) {
                    $num_duties = $final_duty_counts[$monitor['TeacherIndex']] ?? 0;
                    $duty_type = $num_duties > 1 ? 'Double' : ($num_duties === 1 ? 'Single' : 'None');
                    $stmt_history_insert->bind_param("iiss", $current_week_info['year'], $current_week_info['week'], $monitor['TeacherIndex'], $duty_type);
                    $stmt_history_insert->execute();
                }
            }
            $stmt_history_check->close();
            $stmt_history_insert->close();
        }

        $stmt_temp = $conn->prepare("SELECT Period, TeacherIndex FROM temporary_duties WHERE DutyDate = ?");
        if (!$stmt_temp) throw new Exception('Duty Roster: Temporary duty query failed to prepare.');
        $stmt_temp->bind_param("s", $today->format('Y-m-d'));
        $stmt_temp->execute();
        $temp_duties = $stmt_temp->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_temp->close();

        if (!empty($temp_duties)) {
             foreach ($temp_duties as $duty) {
                 if (isset($duty_roster[$duty['Period']])) {
                     $new_monitor_info = $teacher_map[$duty['TeacherIndex']] ?? null;
                     if ($new_monitor_info) {
                         $duty_roster[$duty['Period']] = ['name' => $new_monitor_info['TeacherFN'], 'index' => $new_monitor_info['IndexNo']];
                     }
                 }
             }
        }
        
        return $duty_roster;
    } catch (Exception $e) {
        return [];
    }
}


function get_all_teachers_with_class_counts($conn) {
    $all_teachers = $conn->query("SELECT * FROM teachers")->fetch_all(MYSQLI_ASSOC);
    $weekly_routine_result = $conn->query("SELECT TeacherIndex FROM routine WHERE Subject IS NOT NULL AND Subject != '' AND TeacherIndex IS NOT NULL");
    $weekly_routine = $weekly_routine_result ? $weekly_routine_result->fetch_all(MYSQLI_ASSOC) : [];
    
    $class_counts = [];
    foreach ($weekly_routine as $class) {
        if (!empty($class['TeacherIndex'])) {
            $class_counts[$class['TeacherIndex']] = ($class_counts[$class['TeacherIndex']] ?? 0) + 1;
        }
    }

    foreach ($all_teachers as &$teacher) {
        $teacher['weeklyClassCount'] = $class_counts[$teacher['IndexNo']] ?? 0;
    }
    unset($teacher);
    return $all_teachers;
}

function get_todays_on_leave($conn, $today_date) {
    $stmt_leaves = $conn->prepare("SELECT l.LeaveStart, l.LeaveEnd, l.LeaveType, l.Comment, t.TeacherFN, t.Designation, t.IndexNo AS 'Index' FROM leaves l LEFT JOIN teachers t ON l.TeacherIndex = t.IndexNo WHERE ? BETWEEN l.LeaveStart AND l.LeaveEnd");
    if (!$stmt_leaves) throw new Exception('On Leave query failed to prepare.');
    $stmt_leaves->bind_param("s", $today_date);
    $stmt_leaves->execute();
    $leaves_result = $stmt_leaves->get_result();
    $on_leave = $leaves_result ? $leaves_result->fetch_all(MYSQLI_ASSOC) : [];
    $stmt_leaves->close();
    return $on_leave;
}

function get_all_data($conn) {
    $today_date = date('Y-m-d');
    $days_of_week_bn = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    $current_day_bn = $days_of_week_bn[date('w')];

    $stmt_routine = $conn->prepare("SELECT r.Period, r.Class, r.Subject AS Sub, t.TeacherFN FROM routine r LEFT JOIN teachers t ON r.TeacherIndex = t.IndexNo WHERE r.Day = ?");
    if (!$stmt_routine) throw new Exception('Get All Data: Routine query failed to prepare.');
    $stmt_routine->bind_param("s", $current_day_bn);
    $stmt_routine->execute();
    $routine_result = $stmt_routine->get_result();
    $routine = $routine_result ? $routine_result->fetch_all(MYSQLI_ASSOC) : [];
    $stmt_routine->close();

    $all_teachers = get_all_teachers_with_class_counts($conn);
    $on_leave = get_todays_on_leave($conn, $today_date);

    $stmt_reports = $conn->prepare("SELECT * FROM reports WHERE ReportDate = ?");
    if (!$stmt_reports) throw new Exception('Get All Data: Reports query failed to prepare.');
    $stmt_reports->bind_param("s", $today_date);
    $stmt_reports->execute();
    $reports_result = $stmt_reports->get_result();
    $monitoring_report = $reports_result ? $reports_result->fetch_all(MYSQLI_ASSOC) : [];
    $stmt_reports->close();
    
    $special_messages_raw = $conn->query("SELECT * FROM special_messages")->fetch_all(MYSQLI_ASSOC);
    $special_messages = array_column($special_messages_raw, 'MessageValue', 'MessageKey');

    $data = [
        'allTeachers' => $all_teachers,
        'routine' => $routine,
        'onLeave' => $on_leave,
        'monitoringTeam' => $conn->query("SELECT * FROM monitoring_team")->fetch_all(MYSQLI_ASSOC),
        'monitoringReport' => $monitoring_report,
        'specialMessages' => $special_messages,
        'todaysAttendance' => $monitoring_report, 
        'dutyRoster' => generate_duty_roster($conn)
    ];

    return $data;
}

function get_filtered_monitoring_report($conn, $date) {
    // Selects reports that have meaningful comments, excluding 'ঠিক আছে', empty/null values, and 'N/A'.
    $sql = "SELECT * FROM reports WHERE ReportDate = ? AND MonitorReportText IS NOT NULL AND TRIM(MonitorReportText) != '' AND TRIM(MonitorReportText) != 'ঠিক আছে' AND TRIM(MonitorReportText) != 'N/A'";
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception('Filtered report query failed to prepare.');
    $stmt->bind_param("s", $date);
    $stmt->execute();
    $result = $stmt->get_result();
    $filtered_reports = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    $stmt->close();
    return ['status' => 'success', 'data' => $filtered_reports];
}


function teacher_login($conn, $password) {
    $stmt = $conn->prepare("SELECT * FROM teachers WHERE Password = ?");
    if (!$stmt) throw new Exception('Login query preparation failed: ' . $conn->error);
    $stmt->bind_param("s", $password);
    $stmt->execute();
    $result = $stmt->get_result();
    $stmt->close();
    if ($result->num_rows > 0) {
        return ['status' => 'success', 'teacher' => $result->fetch_assoc()];
    } else {
        return ['status' => 'error', 'message' => 'Incorrect password.'];
    }
}

function check_admin_password($conn, $password) {
    $stmt = $conn->prepare("SELECT Password FROM teachers WHERE Password = ?");
    if (!$stmt) throw new Exception('Admin check query failed: ' . $conn->error);
    $stmt->bind_param("s", $password);
    $stmt->execute();
    $result = $stmt->get_result();
    $stmt->close();
    if ($result->num_rows > 0) {
        return ['status' => 'success', 'message' => 'Password correct.'];
    } else {
        return ['status' => 'error', 'message' => 'Incorrect password for report access.'];
    }
}

function monitor_login($conn, $index, $password) {
    $stmt = $conn->prepare("SELECT * FROM teachers WHERE IndexNo = ? AND Password = ?");
    if (!$stmt) throw new Exception('Monitor login query failed: ' . $conn->error);
    $stmt->bind_param("ss", $index, $password);
    $stmt->execute();
    $result = $stmt->get_result();
    $stmt->close();
    if ($result->num_rows > 0) {
        return ['status' => 'success', 'message' => 'Login successful.'];
    } else {
        return ['status' => 'error', 'message' => 'Incorrect index or password.'];
    }
}

function reassign_duty($conn, $data) {
    $stmt_verify = $conn->prepare("SELECT mt.Role FROM monitoring_team mt JOIN teachers t ON mt.TeacherIndex = t.IndexNo WHERE t.Password = ?");
    if (!$stmt_verify) throw new Exception('Reassign verification query failed: ' . $conn->error);
    $stmt_verify->bind_param("s", $data['teamLeadPassword']);
    $stmt_verify->execute();
    $result_verify = $stmt_verify->get_result();
    $stmt_verify->close();

    if ($result_verify->num_rows === 0) throw new Exception('Incorrect password or not a team member.');
    
    $user = $result_verify->fetch_assoc();
    if (strpos($user['Role'], 'টিম প্রধান') === false) throw new Exception('You do not have permission to reassign duties.');
    
    $stmt_update = $conn->prepare("INSERT INTO temporary_duties (DutyDate, Period, TeacherIndex) VALUES (?, ?, ?)");
    if (!$stmt_update) throw new Exception('Reassign update query failed: ' . $conn->error);
    $stmt_update->bind_param("sss", $data['date'], $data['period'], $data['newMonitorIndex']);
    
    if ($stmt_update->execute()) {
        $stmt_update->close();
        return ['status' => 'success', 'message' => 'Duty reassigned successfully.'];
    }
    $err = $stmt_update->error;
    $stmt_update->close();
    throw new Exception('Failed to update duty: ' . $err);
}

function submit_attendance_report($conn, $data) {
    $sql = "INSERT INTO reports (ReportDate, ReportTime, Period, Class, TeacherName, Attendance, MonitorReportText, MonitorIndex, SubmittedByIndex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception('Attendance submission query failed: ' . $conn->error);
    $stmt->bind_param("sssssisss", $data['Date'], $data['Time'], $data['Period'], $data['Class'], $data['TeacherName'], $data['NumberOfAttend'], $data['monitorReport'], $data['monitorIndex'], $data['monitorIndex']);
    if ($stmt->execute()) {
        $stmt->close();
        return ['status' => 'success', 'message' => 'Report submitted successfully.'];
    }
    $err = $stmt->error;
    $stmt->close();
    throw new Exception('Failed to submit attendance: ' . $err);
}

function submit_leave_request($conn, $data) {
    $sql = "INSERT INTO leaves (TeacherIndex, LeaveStart, LeaveEnd, LeaveType, Comment) VALUES (?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception('Leave submission query failed: ' . $conn->error);
    $stmt->bind_param("sssss", $data['index'], $data['leaveStart'], $data['leaveEnd'], $data['leaveType'], $data['comment']);
    if ($stmt->execute()) {
        $stmt->close();
        return ['status' => 'success', 'message' => 'Leave request submitted successfully.'];
    }
    $err = $stmt->error;
    $stmt->close();
    throw new Exception('Failed to submit leave request: ' . $err);
}

function get_individual_leave_card($conn, $index) {
    if (empty($index)) {
        return ['status' => 'error', 'message' => 'Teacher index not provided.'];
    }

    $stmt_teacher = $conn->prepare("SELECT TeacherFN, IndexNo FROM teachers WHERE IndexNo = ?");
    if (!$stmt_teacher) throw new Exception('Leave card query failed: ' . $conn->error);
    $stmt_teacher->bind_param("s", $index);
    $stmt_teacher->execute();
    $teacher_result = $stmt_teacher->get_result();
    if ($teacher_result->num_rows === 0) {
        return ['status' => 'error', 'message' => 'Teacher not found.'];
    }
    $teacher_info = $teacher_result->fetch_assoc();
    $stmt_teacher->close();

    $stmt_leaves = $conn->prepare("SELECT * FROM leaves WHERE TeacherIndex = ?");
    if (!$stmt_leaves) throw new Exception('Leave details query failed: ' . $conn->error);
    $stmt_leaves->bind_param("s", $index);
    $stmt_leaves->execute();
    $leaves_result = $stmt_leaves->get_result();
    $all_leaves = $leaves_result->fetch_all(MYSQLI_ASSOC);
    $stmt_leaves->close();

    $current_year = date('Y');
    $current_month = date('m');
    $monthly_leaves = 0;
    $yearly_leaves = 0;
    
    foreach ($all_leaves as $leave) {
        try {
            $start_date = new DateTime($leave['LeaveStart']);
            $end_date = new DateTime($leave['LeaveEnd']);
            $duration = $end_date->diff($start_date)->days + 1;

            if ($start_date->format('Y') == $current_year) {
                $yearly_leaves += $duration;
            }
            if ($start_date->format('m') == $current_month && $start_date->format('Y') == $current_year) {
                $monthly_leaves += $duration;
            }
        } catch (Exception $e) {
            continue;
        }
    }

    return [
        'status' => 'success',
        'data' => [
            'TeacherFN' => $teacher_info['TeacherFN'],
            'IndexNo' => $teacher_info['IndexNo'],
            'monthlyLeaves' => $monthly_leaves,
            'yearlyLeaves' => $yearly_leaves,
            'leaveDetails' => $all_leaves
        ]
    ];
}


/**
 * ==================================================================
 * OFFICE PANEL & ADMIN PANEL FUNCTIONS (NEW / SHARED)
 * ==================================================================
 */

function office_login($conn, $password) {
    $stmt = $conn->prepare("SELECT * FROM teachers WHERE Password = ?");
    if (!$stmt) throw new Exception('Login query failed: ' . $conn->error);
    $stmt->bind_param("s", $password);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        return ['status' => 'error', 'message' => 'আপনার পাসওয়ার্ড সঠিক নয়।'];
    }
    $teacher = $result->fetch_assoc();
    $stmt->close();
    
    $role = $teacher['Role'];
    if ($role === 'Admin' || $role === 'Office') {
        return ['status' => 'success', 'teacher' => $teacher];
    } else {
        return ['status' => 'error', 'message' => 'দুঃখিত, আপনার অফিস প্যানেল ব্যবহারের অনুমতি নেই।'];
    }
}

function get_routine_and_attendance($conn, $date, $period, $className) {
    // Note: The $period and $className parameters are no longer used here,
    // as we fetch all data for the date at once for efficiency.
    
    $day_of_week = date('w', strtotime($date));
    $days_of_week_bn = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    $day_bn = $days_of_week_bn[$day_of_week];

    // Fetch the routine for the given day
    $stmt_routine = $conn->prepare("SELECT t.TeacherFN, r.Subject AS TeacherSub, r.Class, r.Period FROM routine r JOIN teachers t ON r.TeacherIndex = t.IndexNo WHERE r.Day = ?");
    if (!$stmt_routine) throw new Exception('Routine query failed: ' . $conn->error);
    $stmt_routine->bind_param("s", $day_bn);
    $stmt_routine->execute();
    $routine = $stmt_routine->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_routine->close();

    // Fetch ALL attendance reports for the given date
    $stmt_attendance = $conn->prepare("SELECT Class, Period, Attendance FROM reports WHERE ReportDate = ?");
    if (!$stmt_attendance) throw new Exception('Attendance query for date failed: ' . $conn->error);
    $stmt_attendance->bind_param("s", $date);
    $stmt_attendance->execute();
    $date_attendance = $stmt_attendance->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_attendance->close();

    return [
        'status' => 'success',
        'data' => [
            'routine' => $routine,
            'dateAttendance' => $date_attendance // Send all attendance for the date
        ]
    ];
}

function submit_daily_attendance($conn, $reports) {
    $reports_to_process = (isset($reports[0]) && is_array($reports[0])) ? $reports : [$reports];

    $conn->begin_transaction();
    try {
        $stmt_check = $conn->prepare("SELECT id FROM reports WHERE ReportDate = ? AND Period = ? AND Class = ?");
        if (!$stmt_check) throw new Exception('Daily Attendance: Check query failed to prepare.');
        
        $stmt_update = $conn->prepare("UPDATE reports SET TeacherName = ?, Attendance = ?, SubmittedByIndex = ? WHERE id = ?");
        if (!$stmt_update) throw new Exception('Daily Attendance: Update query failed to prepare.');

        $stmt_insert = $conn->prepare("INSERT INTO reports (ReportDate, ReportTime, Period, Class, TeacherName, Attendance, SubmittedByIndex) VALUES (?, ?, ?, ?, ?, ?, ?)");
        if (!$stmt_insert) throw new Exception('Daily Attendance: Insert query failed to prepare.');

        foreach ($reports_to_process as $report) {
            $stmt_check->bind_param("sss", $report['Date'], $report['Period'], $report['Class']);
            $stmt_check->execute();
            $result = $stmt_check->get_result();
            if ($row = $result->fetch_assoc()) {
                $stmt_update->bind_param("sisi", $report['TeacherName'], $report['NumberOfAttend'], $report['submitterIndex'], $row['id']);
                $stmt_update->execute();
            } else {
                $stmt_insert->bind_param("sssssis", $report['Date'], $report['Time'], $report['Period'], $report['Class'], $report['TeacherName'], $report['NumberOfAttend'], $report['submitterIndex']);
                $stmt_insert->execute();
            }
        }
        $conn->commit();
        $stmt_check->close();
        $stmt_update->close();
        $stmt_insert->close();
        return ['status' => 'success', 'message' => count($reports_to_process) . 'টি হাজিরা সফলভাবে জমা হয়েছে।'];
    } catch (Exception $e) {
        $conn->rollback();
        throw new Exception('Failed to submit daily attendance: ' . $e->getMessage());
    }
}

function get_students_by_class($conn, $className) {
    $stmt = $conn->prepare("SELECT Roll as roll, Name as name, Gender as gender FROM students WHERE Class = ?");
    if (!$stmt) throw new Exception('Student query failed: ' . $conn->error);
    $stmt->bind_param("s", $className);
    $stmt->execute();
    $students = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    return ['status' => 'success', 'students' => $students];
}


function submit_monthly_attendance($conn, $year, $month, $className, $attendanceData) {
    if (empty($attendanceData)) {
        throw new Exception('No attendance data provided.');
    }
    
    $rolls = array_keys($attendanceData);
    if (empty($rolls)) {
        return ['status' => 'success', 'message' => 'No student data to update.'];
    }
    
    $placeholders = implode(',', array_fill(0, count($rolls), '?'));
    $stmt_students = $conn->prepare("SELECT id, Roll FROM students WHERE Class = ? AND Roll IN ($placeholders)");
    if (!$stmt_students) throw new Exception('Monthly Attendance: Student ID query failed to prepare.');
    $types = 's' . str_repeat('s', count($rolls));
    $stmt_students->bind_param($types, $className, ...$rolls);
    $stmt_students->execute();
    $students_result = $stmt_students->get_result()->fetch_all(MYSQLI_ASSOC);
    $roll_to_id_map = array_column($students_result, 'id', 'Roll');
    $stmt_students->close();

    $conn->begin_transaction();
    try {
        $stmt_check = $conn->prepare("SELECT id FROM student_monthly_attendance WHERE student_id = ? AND year = ? AND month = ?");
        if (!$stmt_check) throw new Exception('Monthly Attendance: Check query failed to prepare.');
        $stmt_update = $conn->prepare("UPDATE student_monthly_attendance SET days_present = ?, comment = ? WHERE id = ?");
        if (!$stmt_update) throw new Exception('Monthly Attendance: Update query failed to prepare.');
        $stmt_insert = $conn->prepare("INSERT INTO student_monthly_attendance (student_id, year, month, days_present, comment) VALUES (?, ?, ?, ?, ?)");
        if (!$stmt_insert) throw new Exception('Monthly Attendance: Insert query failed to prepare.');

        foreach ($attendanceData as $roll => $data) {
            if (!isset($roll_to_id_map[$roll])) continue; 
            $student_id = $roll_to_id_map[$roll];

            $stmt_check->bind_param("iii", $student_id, $year, $month);
            $stmt_check->execute();
            $result = $stmt_check->get_result();
            
            $attendance = $data['attendance'] !== '' ? $data['attendance'] : null;
            $comment = $data['comment'] !== '' ? $data['comment'] : null;

            if ($row = $result->fetch_assoc()) {
                $stmt_update->bind_param("isi", $attendance, $comment, $row['id']);
                $stmt_update->execute();
            } else {
                $stmt_insert->bind_param("iiiss", $student_id, $year, $month, $attendance, $comment);
                $stmt_insert->execute();
            }
        }
        $conn->commit();
        $stmt_check->close();
        $stmt_update->close();
        $stmt_insert->close();
        return ['status' => 'success', 'message' => 'মাসিক হাজিরা সফলভাবে জমা হয়েছে।'];
    } catch (Exception $e) {
        $conn->rollback();
        throw new Exception('Failed to submit monthly attendance: ' . $e->getMessage());
    }
}

/**
 * ==================================================================
 * ADMIN PANEL FUNCTIONS (NEW)
 * ==================================================================
 */

function admin_login($conn, $password) {
    $stmt = $conn->prepare("SELECT * FROM teachers WHERE Password = ? AND Role = 'Admin'");
    if (!$stmt) throw new Exception('Admin login query failed: ' . $conn->error);
    $stmt->bind_param("s", $password);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        return ['status' => 'success'];
    } else {
        return ['status' => 'error', 'message' => 'ভুল পাসওয়ার্ড বা আপনার অনুমতি নেই।'];
    }
}

function get_all_data_for_admin($conn) {
    return [
        'status' => 'success',
        'data' => [
            'allTeachers' => get_all_teachers_with_class_counts($conn),
            'monitoringTeam' => $conn->query("SELECT * FROM monitoring_team")->fetch_all(MYSQLI_ASSOC),
            'savedMessages' => $conn->query("SELECT id as ID, message_text as Message FROM saved_messages")->fetch_all(MYSQLI_ASSOC),
            'specialMessages' => array_column($conn->query("SELECT * FROM special_messages")->fetch_all(MYSQLI_ASSOC), 'MessageValue', 'MessageKey'),
            'classStructure' => [
                'এবতেদায়ি' => ['১ম শ্রেণি', '২য় শ্রেণি', '৩য় শ্রেণি', '৪র্থ শ্রেণি', '৫ম শ্রেণি'],
                'দাখিল' => ['৬ষ্ঠ শ্রেণি', '৭ম শ্রেণি', '৮ম শ্রেণি', '৯ম শ্রেণি', '১০ম শ্রেণি'],
                'আলিম' => ['আলিম ১ম বর্ষ', 'আলিম ২য় বর্ষ'],
                'ফাযিল' => ['ফাযিল ১ম বর্ষ', 'ফাযিল ২য় বর্ষ', 'ফাযিল ৩য় বর্ষ']
            ]
        ]
    ];
}


function get_teacher_for_admin($conn, $index) {
    $stmt = $conn->prepare("SELECT * FROM teachers WHERE IndexNo = ?");
    if (!$stmt) throw new Exception('Get teacher query failed: ' . $conn->error);
    $stmt->bind_param("s", $index);
    $stmt->execute();
    $teacher_result = $stmt->get_result();
    if ($teacher_result->num_rows === 0) {
        return ['status' => 'error', 'message' => 'শিক্ষককে খুঁজে পাওয়া যায়নি।'];
    }
    $teacher_data = $teacher_result->fetch_assoc();
    $stmt->close();
    
    $stmt_monitor = $conn->prepare("SELECT * FROM monitoring_team WHERE TeacherIndex = ?");
    if (!$stmt_monitor) throw new Exception('Get monitor query failed: ' . $conn->error);
    $stmt_monitor->bind_param("s", $index);
    $stmt_monitor->execute();
    $monitor_data = $stmt_monitor->get_result()->fetch_assoc();
    $stmt_monitor->close();

    if ($monitor_data) {
        $teacher_data['MonitorDuty'] = $monitor_data;
    }

    return [
        'status' => 'success',
        'teacher' => $teacher_data,
        'password' => $teacher_data['Password'] ?? 'N/A'
    ];
}

function update_system_message($conn, $key, $message) {
    $stmt = $conn->prepare("UPDATE special_messages SET MessageValue = ? WHERE MessageKey = ?");
    if (!$stmt) throw new Exception('Update message query failed: ' . $conn->error);
    $stmt->bind_param("ss", $message, $key);
    if ($stmt->execute()) {
        return ['status' => 'success', 'message' => 'বার্তা সফলভাবে আপডেট হয়েছে।'];
    } else {
        throw new Exception('বার্তা আপডেট করা সম্ভব হয়নি।');
    }
}

function add_new_saved_message($conn, $message) {
    $stmt = $conn->prepare("INSERT INTO saved_messages (message_text) VALUES (?)");
    if (!$stmt) throw new Exception('Add message query failed: ' . $conn->error);
    $stmt->bind_param("s", $message);
    if ($stmt->execute()) {
        $new_id = $conn->insert_id;
        return ['status' => 'success', 'message' => 'নতুন বার্তা সফলভাবে সংরক্ষণ করা হয়েছে।', 'newId' => $new_id];
    } else {
        throw new Exception('বার্তা সংরক্ষণ করা সম্ভব হয়নি।');
    }
}

function delete_message($conn, $messageId) {
    $stmt = $conn->prepare("DELETE FROM saved_messages WHERE id = ?");
    if (!$stmt) throw new Exception('Delete message query failed: . ' . $conn->error);
    $stmt->bind_param("i", $messageId);
    if ($stmt->execute()) {
        return ['status' => 'success', 'message' => 'বার্তা সফলভাবে মুছে ফেলা হয়েছে।'];
    } else {
        throw new Exception('বার্তা মুছে ফেলা সম্ভব হয়নি।');
    }
}

function update_monitor_duty($conn, $data) {
    $stmt_check = $conn->prepare("SELECT * FROM monitoring_team WHERE TeacherIndex = ?");
    if (!$stmt_check) throw new Exception('Update monitor check query failed: ' . $conn->error);
    $stmt_check->bind_param("s", $data['teacherIndex']);
    $stmt_check->execute();
    $result = $stmt_check->get_result();
    
    if ($result->num_rows > 0) {
        $stmt = $conn->prepare("UPDATE monitoring_team SET MonitorDay = ?, Role = ?, Status = ? WHERE TeacherIndex = ?");
        if (!$stmt) throw new Exception('Update monitor update query failed: ' . $conn->error);
        $stmt->bind_param("ssss", $data['monitorDay'], $data['monComment'], $data['status'], $data['teacherIndex']);
    } else {
        $stmt = $conn->prepare("INSERT INTO monitoring_team (TeacherIndex, MonitorDay, Role, Status) VALUES (?, ?, ?, ?)");
        if (!$stmt) throw new Exception('Update monitor insert query failed: ' . $conn->error);
        $stmt->bind_param("ssss", $data['teacherIndex'], $data['monitorDay'], $data['monComment'], $data['status']);
    }
    
    if ($stmt->execute()) {
        return ['status' => 'success', 'message' => 'মনিটরের দায়িত্ব সফলভাবে আপডেট হয়েছে।'];
    } else {
        throw new Exception('মনিটরের দায়িত্ব আপডেট করা সম্ভব হয়নি।');
    }
}

function update_teacher_info($conn, $data) {
    $sql = "UPDATE teachers SET TeacherFN = ?, TcrAddress = ?, TeacherSub = ?, MobileNo = ? WHERE IndexNo = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception('Update teacher info query failed: ' . $conn->error);
    $stmt->bind_param("sssss", $data['TeacherFN'], $data['TcrAddress'], $data['TeacherSub'], $data['MobileNo'], $data['IndexNo']);
    if ($stmt->execute()) {
        return ['status' => 'success', 'message' => 'শিক্ষকের তথ্য সফলভাবে আপডেট হয়েছে।'];
    } else {
        throw new Exception('শিক্ষকের তথ্য আপডেট করা সম্ভব হয়নি।');
    }
}

function get_monitoring_data_for_date($conn, $date) {
    // Get day of the week in Bengali for the provided date
    $day_of_week = date('w', strtotime($date));
    $days_of_week_bn = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    $day_bn = $days_of_week_bn[$day_of_week];

    // Fetch routine for that specific day
    $stmt_routine = $conn->prepare("SELECT r.Period, r.Class, r.Subject AS Sub, t.TeacherFN, r.TeacherIndex FROM routine r LEFT JOIN teachers t ON r.TeacherIndex = t.IndexNo WHERE r.Day = ?");
    if (!$stmt_routine) throw new Exception('Monitoring Data: Routine query failed to prepare.');
    $stmt_routine->bind_param("s", $day_bn);
    $stmt_routine->execute();
    $routine_result = $stmt_routine->get_result();
    $routine = $routine_result ? $routine_result->fetch_all(MYSQLI_ASSOC) : [];
    $stmt_routine->close();

    // Fetch other data as before
    $all_teachers = get_all_teachers_with_class_counts($conn);
    $monitoring_team = $conn->query("SELECT * FROM monitoring_team")->fetch_all(MYSQLI_ASSOC);
    $on_leave = get_todays_on_leave($conn, $date);
    $duty_roster = generate_duty_roster($conn, $date);
    $class_structure = [
        'এবতেদায়ি' => ['১ম শ্রেণি', '২য় শ্রেণি', '৩য় শ্রেণি', '৪র্থ শ্রেণি', '৫ম শ্রেণি'],
        'দাখিল' => ['৬ষ্ঠ শ্রেণি', '৭ম শ্রেণি', '৮ম শ্রেণি', '৯ম শ্রেণি', '১০ম শ্রেণি'],
        'আলিম' => ['আলিম ১ম বর্ষ', 'আলিম ২য় বর্ষ'],
        'ফাযিল' => ['ফাযিল ১ম বর্ষ', 'ফাযিল ২য় বর্ষ', 'ফাযিল ৩য় বর্ষ']
    ];
    
    // Return all data together
    return [
        'status' => 'success',
        'data' => [
            'dutyRoster' => $duty_roster,
            'monitoringTeam' => $monitoring_team,
            'onLeave' => $on_leave,
            'allTeachers' => $all_teachers,
            'classStructure' => $class_structure,
            'routine' => $routine 
        ]
    ];
}


function admin_reassign_duty($conn, $data) {
    $stmt_update = $conn->prepare("INSERT INTO temporary_duties (DutyDate, Period, TeacherIndex) VALUES (?, ?, ?)");
    if (!$stmt_update) throw new Exception('Admin reassign duty query failed: ' . $conn->error);
    $stmt_update->bind_param("sss", $data['date'], $data['period'], $data['newMonitorIndex']);
    if ($stmt_update->execute()) {
        return ['status' => 'success', 'message' => 'ডিউটি সফলভাবে পরিবর্তন করা হয়েছে।'];
    } else {
        throw new Exception('ডিউটি পরিবর্তন করা সম্ভব হয়নি।');
    }
}

function generate_report($conn, $report_subtype, $timeframe, $date, $month, $year) {
    // This function acts as a router for different report types.
    switch ($report_subtype) {
        case 'studentAttendance':
            return generate_student_attendance_report($conn, $timeframe, $date, $month, $year);
        case 'class':
            return generate_monitored_class_report($conn, $timeframe, $date, $month, $year);
        case 'leave':
            return generate_leave_report($conn);
        case 'monitoring':
            return generate_monitoring_duty_report($conn);
        default:
            throw new Exception("Unknown report subtype.");
    }
}

function generate_student_attendance_report($conn, $timeframe, $date, $month, $year) {
    $title = 'শিক্ষার্থী হাজিরা রিপোর্ট';
    $subtitle = '';
    $data = [];
    $class_order = ['১ম শ্রেণি', '২য় শ্রেণি', '৩য় শ্রেণি', '৪র্থ শ্রেণি', '৫ম শ্রেণি', '৬ষ্ঠ শ্রেণি', '৭ম শ্রেণি', '৮ম শ্রেণি', '৯ম শ্রেণি', '১০ম শ্রেণি', 'আলিম ১ম বর্ষ', 'আলিম ২য় বর্ষ', 'ফাযিল ১ম বর্ষ', 'ফাযিল ২য় বর্ষ', 'ফাযিল ৩য় বর্ষ'];
    $bangla_months = ['', 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

    if ($timeframe === 'daily') {
        $subtitle = 'দৈনিক - ' . date('d/m/Y', strtotime($date));
        $sql = "SELECT Class, Period, Attendance FROM reports WHERE ReportDate = ? AND Period IN ('১ম ঘণ্টা', '৫ম ঘণ্টা') AND Attendance IS NOT NULL";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception("Daily report query failed to prepare.");
        $stmt->bind_param("s", $date);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        $processed_data = [];
        foreach ($result as $row) {
            $processed_data[$row['Class']][$row['Period']] = $row['Attendance'];
        }

        $total_first = 0;
        $total_fifth = 0;

        foreach ($class_order as $class) {
            if (isset($processed_data[$class])) {
                $first_hour = $processed_data[$class]['১ম ঘণ্টা'] ?? 0;
                $fifth_hour = $processed_data[$class]['৫ম ঘণ্টা'] ?? 0;
                $difference = $fifth_hour - $first_hour;
                
                $data[] = [
                    'শ্রেণি' => $class,
                    '১ম ঘণ্টা' => $first_hour,
                    '৫ম ঘণ্টা' => $fifth_hour,
                    'পার্থক্য' => $difference
                ];
                $total_first += $first_hour;
                $total_fifth += $fifth_hour;
            }
        }

        if (!empty($data)) {
            $data[] = [
                'শ্রেণি' => 'মোট',
                '১ম ঘণ্টা' => $total_first,
                '৫ম ঘণ্টা' => $total_fifth,
                'পার্থক্য' => $total_fifth - $total_first
            ];
        }

    } else { // Weekly or Monthly
        if ($timeframe === 'weekly') {
            $dt = new DateTime($date);
            $week_start_obj = (clone $dt)->modify('saturday this week -6 days');
            $week_end_obj = (clone $dt)->modify('saturday this week');
            $subtitle = 'সাপ্তাহিক - ' . $week_start_obj->format('d/m/y') . ' থেকে ' . $week_end_obj->format('d/m/y');
        } else { // monthly
            $subtitle = 'মাসিক - ' . $bangla_months[(int)$month] . ', ' . $year;
            $week_start_obj = new DateTime("$year-$month-01");
            $week_end_obj = (clone $week_start_obj)->modify('last day of this month');
        }
        $week_start = $week_start_obj->format('Y-m-d');
        $week_end = $week_end_obj->format('Y-m-d');

        $sql = "SELECT ReportDate, Class, Period, Attendance FROM reports WHERE ReportDate BETWEEN ? AND ? AND Period IN ('১ম ঘণ্টা', '৫ম ঘণ্টা') AND Attendance IS NOT NULL ORDER BY ReportDate, FIELD(Class, '" . implode("','", $class_order) . "')";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception("Weekly/Monthly report query failed to prepare.");
        $stmt->bind_param("ss", $week_start, $week_end);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        $daily_data = [];
        foreach ($result as $row) {
            $daily_data[$row['ReportDate']][$row['Class']][$row['Period']] = $row['Attendance'];
        }

        $total_first_sum = 0;
        $total_fifth_sum = 0;
        $total_days_with_data = 0;

        $interval = new DateInterval('P1D');
        $period_range = new DatePeriod($week_start_obj, $interval, (clone $week_end_obj)->modify('+1 day'));

        foreach ($period_range as $day) {
            $current_date_str = $day->format('Y-m-d');
            if (isset($daily_data[$current_date_str])) {
                $total_days_with_data++;
                $day_total_first = 0;
                $day_total_fifth = 0;

                foreach ($daily_data[$current_date_str] as $class_name => $attendances) {
                    $first_hour = $attendances['১ম ঘণ্টা'] ?? 0;
                    $fifth_hour = $attendances['৫ম ঘণ্টা'] ?? 0;
                    $data[] = [
                        'তারিখ' => date('d/m/y', strtotime($current_date_str)),
                        'শ্রেণি' => $class_name,
                        '১ম ঘণ্টা' => $first_hour,
                        '৫ম ঘণ্টা' => $fifth_hour,
                        'পার্থক্য' => $fifth_hour - $first_hour
                    ];
                    $day_total_first += $first_hour;
                    $day_total_fifth += $fifth_hour;
                }
                $total_first_sum += $day_total_first;
                $total_fifth_sum += $day_total_fifth;
            }
        }

        if ($total_days_with_data > 0) {
            $avg_label = $timeframe === 'weekly' ? 'সাপ্তাহিক গড়' : 'মাসিক গড়';
            $avg_first = round($total_first_sum / $total_days_with_data);
            $avg_fifth = round($total_fifth_sum / $total_days_with_data);

            $data[] = [
                'তারিখ' => $avg_label,
                'শ্রেণি' => '',
                '১ম ঘণ্টা' => $avg_first,
                '৫ম ঘণ্টা' => $avg_fifth,
                'পার্থক্য' => $avg_fifth - $avg_first
            ];
        }
    }

    return ['title' => $title, 'subtitle' => $subtitle, 'data' => $data];
}
function get_teachers_for_period($conn, $date, $period, $className) {
    $day_of_week = date('w', strtotime($date));
    $days_of_week_bn = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    $day_bn = $days_of_week_bn[$day_of_week];

    // নির্দিষ্ট দিন, ক্লাস এবং পিরিয়ডের জন্য রুটিন থেকে শিক্ষক খুঁজুন
    $stmt_teachers = $conn->prepare(
        "SELECT t.TeacherFN, r.Subject AS TeacherSub 
         FROM routine r 
         JOIN teachers t ON r.TeacherIndex = t.IndexNo 
         WHERE r.Day = ? AND r.Class = ? AND r.Period = ?"
    );
    if (!$stmt_teachers) throw new Exception('Teacher query for period failed: ' . $conn->error);
    
    $stmt_teachers->bind_param("sss", $day_bn, $className, $period);
    $stmt_teachers->execute();
    $teachers_result = $stmt_teachers->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_teachers->close();
    
    return [
        'status' => 'success',
        'data' => [
            'teachers' => $teachers_result // শুধুমাত্র 'teachers' কী-তে ডেটা পাঠানো হচ্ছে
        ]
    ];
}

function generate_monitored_class_report($conn, $timeframe, $date, $month, $year) {
    $title = 'ক্লাস সংক্রান্ত রিপোর্ট';
    $subtitle = '';
    $bangla_months = ['', 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    $where_clauses = ["r.MonitorReportText IS NOT NULL", "TRIM(r.MonitorReportText) != ''", "TRIM(r.MonitorReportText) != 'ঠিক আছে'", "TRIM(r.MonitorReportText) != 'N/A'"];
    $params = [];
    $types = '';

    if ($timeframe === 'daily') {
        $subtitle = 'দৈনিক - ' . date('d/m/Y', strtotime($date));
        $where_clauses[] = "r.ReportDate = ?";
        $params[] = $date;
        $types .= 's';
    } elseif ($timeframe === 'weekly') {
        $dt = new DateTime($date);
        $week_start = $dt->modify('last Sunday')->format('Y-m-d');
        $week_end = $dt->modify('next Saturday')->format('Y-m-d');
        $subtitle = 'সাপ্তাহিক - ' . date('d/m/y', strtotime($week_start)) . ' থেকে ' . date('d/m/y', strtotime($week_end));
        $where_clauses[] = "r.ReportDate BETWEEN ? AND ?";
        $params[] = $week_start;
        $params[] = $week_end;
        $types .= 'ss';
    } elseif ($timeframe === 'monthly') {
        $subtitle = 'মাসিক - ' . $bangla_months[(int)$month] . ', ' . $year;
        $where_clauses[] = "YEAR(r.ReportDate) = ? AND MONTH(r.ReportDate) = ?";
        $params[] = $year;
        $params[] = $month;
        $types .= 'ii';
    } else {
        throw new Exception("Invalid timeframe for monitored class report.");
    }
    
    $sql = "SELECT 
                DATE_FORMAT(r.ReportDate, '%d/%m/%y') AS 'তারিখ', 
                r.Class AS 'শ্রেণি', 
                r.Attendance AS 'হাজিরা', 
                COALESCE(t.NickName, r.TeacherName) AS 'শিক্ষক', 
                r.MonitorReportText AS 'মন্তব্য', 
                r.MonitorIndex AS 'মনিঃ ইনডেক্স'
            FROM reports r
            LEFT JOIN teachers t ON r.TeacherName = t.TeacherFN
            WHERE " . implode(' AND ', $where_clauses) . " 
            ORDER BY r.ReportDate, r.Period";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception("Monitored class report query failed to prepare: " . $conn->error);
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $data = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    
    return ['title' => $title, 'subtitle' => $subtitle, 'data' => $data];
}

function generate_leave_report($conn) {
    $sql = "SELECT t.IndexNo, t.TeacherFN, t.Designation, l.LeaveStart, l.LeaveEnd, l.LeaveType, l.Comment FROM leaves l JOIN teachers t ON l.TeacherIndex = t.IndexNo ORDER BY l.LeaveStart DESC";
    $result = $conn->query($sql);
    $data = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    return ['title' => 'ছুটি সংক্রান্ত রিপোর্ট', 'subtitle' => 'সকল ছুটির তালিকা', 'data' => $data];
}

function generate_monitoring_duty_report($conn) {
    $sql = "SELECT t.TeacherFN, t.IndexNo, mt.MonitorDay, mt.Role FROM monitoring_team mt JOIN teachers t ON mt.TeacherIndex = t.IndexNo WHERE mt.Status = 'On' ORDER BY t.TeacherFN";
    $result = $conn->query($sql);
    $data = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    return ['title' => 'মনিটরিং ডিউটি রিপোর্ট', 'subtitle' => 'স্থায়ী মনিটরিং দলের তালিকা', 'data' => $data];
}
?>

