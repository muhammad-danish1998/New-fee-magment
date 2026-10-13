export function exportStudentsToCSV(students = [], filename = 'students_fee_report.csv', brokers = []) {
  if (!students || students.length === 0) {
    alert('No student records available to export.');
    return;
  }

  const brokerMap = new Map((brokers || []).map(b => [b.id, b.name]));

  // Calculate grand totals across all matching students
  const totalStudents = students.length;
  const totalFeeSum = students.reduce((acc, s) => acc + (Number(s.total_fee) || 0), 0);
  const totalPaidSum = students.reduce((acc, s) => acc + (Number(s.total_paid) || 0), 0);
  const totalDuesSum = students.reduce((acc, s) => acc + (Number(s.dues) || 0), 0);

  // Exact 8 requested columns for Excel:
  // name, father name, class/program, total fee, paid, due amount, referral, number
  const headers = [
    'Student Name',
    'Father Name',
    'Class / Program',
    'Total Fee',
    'Paid',
    'Due Amount',
    'Referral',
    'Contact Number'
  ];

  const rows = students.map(s => {
    const classProgram = [s.academic_class, s.program_group].filter(Boolean).join(' - ');
    const brokerName = s.broker_id ? brokerMap.get(s.broker_id) : null;
    let referral = '';
    if (s.admission_source === 'Referral') {
      referral = brokerName || s.reference || 'Referral';
    } else {
      referral = s.reference && s.reference !== 'Direct' ? s.reference : 'Direct';
    }

    return [
      `"${(s.student_name || '').replace(/"/g, '""')}"`,
      `"${(s.father_name || '').replace(/"/g, '""')}"`,
      `"${classProgram.replace(/"/g, '""')}"`,
      Number(s.total_fee) || 0,
      Number(s.total_paid) || 0,
      Number(s.dues) || 0,
      `"${referral.replace(/"/g, '""')}"`,
      `"${(s.contact_number || '').replace(/"/g, '""')}"`
    ];
  });

  // Clean Grand Totals row matching exact column positions for Excel
  const totalRow = [
    `"TOTAL (${totalStudents} Students)"`,
    '""',
    '"GRAND TOTAL"',
    totalFeeSum,
    totalPaidSum,
    totalDuesSum,
    '""',
    '""'
  ];

  const reportFooter = [
    `"Exported Date: ${new Date().toISOString().split('T')[0]}"`,
    '""',
    '"JMT Public Higher Secondary School and College"',
    '""',
    '""',
    '""',
    '""',
    '""'
  ];

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '""', // Blank separator line before total row
    totalRow.join(','),
    reportFooter.join(',')
  ].join('\r\n');

  // Prefix with UTF-8 BOM (\uFEFF) so Microsoft Excel natively parses UTF-8 encoding
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
