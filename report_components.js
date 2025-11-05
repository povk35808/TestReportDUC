// ត្រូវប្រាកដថា React ត្រូវបានទាញយកជា Global រួចហើយ
const { useState, useEffect, useMemo } = React;

// ----------------------------------------------------
// (ថ្មី) Component សម្រាប់ទំព័ររបាយការណ៍
// ----------------------------------------------------
function ReportDownloader({ expenses }) {
  const [reportType, setReportType] = useState('current_month');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [reportTitle, setReportTitle] = useState('របាយការណ៍ចំណាយប្រចាំខែបច្ចុប្បន្ន');

  // --- 1. UI Handlers ---
  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setReportType(newType);
    updateReportTitle(newType); // Update title when type changes
  };

  const updateReportTitle = (type, date1, date2) => {
    const now = new Date();
    const kmLocale = 'km-KH';
    const monthYearOptions = { year: 'numeric', month: 'long', timeZone: 'UTC' };
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };

    switch(type) {
      case 'current_month':
        setReportTitle(`របាយការណ៍ចំណាយ ${now.toLocaleDateString(kmLocale, monthYearOptions)}`);
        break;
      case 'select_month':
        const monthDate = date1 ? new Date(date1) : new Date(month);
        setReportTitle(`របាយការណ៍ចំណាយ ${monthDate.toLocaleDateString(kmLocale, monthYearOptions)}`);
        break;
      case 'date_range':
        const d1 = date1 ? new Date(date1) : new Date(startDate);
        const d2 = date2 ? new Date(date2) : new Date(endDate);
        setReportTitle(`របាយការណ៍ពី ${d1.toLocaleDateString(kmLocale, dateOptions)} ដល់ ${d2.toLocaleDateString(kmLocale, dateOptions)}`);
        break;
      default:
        setReportTitle('របាយការណ៍ចំណាយ');
    }
  };
  
  // Update title when dates change
  useEffect(() => {
    if (reportType === 'select_month') {
      updateReportTitle(reportType, month);
    } else if (reportType === 'date_range') {
      updateReportTitle(reportType, startDate, endDate);
    }
  }, [month, startDate, endDate, reportType]);
  

  // --- 2. Data Filtering Logic ---
  const getFilteredData = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const currentMonthStr = `${currentYear}-${currentMonth}`;

    let filtered = [];

    switch(reportType) {
      case 'current_month':
        filtered = expenses.filter(ex => ex.date.startsWith(currentMonthStr));
        break;
      case 'select_month':
        filtered = expenses.filter(ex => ex.date.startsWith(month));
        break;
      case 'date_range':
        filtered = expenses.filter(ex => ex.date >= startDate && ex.date <= endDate);
        break;
      default:
        filtered = [];
    }
    
    // Sort data by date
    return filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
  };
  
  // --- 3. Report Generation Logic ---

  // --- 3a. Generate Excel ---
  const generateExcel = () => {
    setLoading(true);
    console.log("Starting Excel generation...");
    
    try {
      const data = getFilteredData();
      if (data.length === 0) {
        alert("មិនមានទិន្នន័យសម្រាប់ទាញយកပါ။");
        setLoading(false);
        return;
      }

      const { XLSX } = window; // Get from CDN
      const wb = XLSX.utils.book_new(); // Create new workbook

      // --- Worksheet 1: Summary (សរុប) ---
      const summary = {};
      let totalAmount = 0;
      data.forEach(ex => {
        const amount = parseFloat(ex.amount) || 0;
        summary[ex.expenseName] = (summary[ex.expenseName] || 0) + amount;
        totalAmount += amount;
      });
      
      const summaryData = Object.keys(summary).map((key, index) => ({
        'ល.រ': index + 1,
        'ឈ្មោះចំណាយ': key,
        'ចំនួនទឹកប្រាក់': summary[key]
      }));
      // Add Total Row
      summaryData.push({}); // Empty row
      summaryData.push({ 'ឈ្មោះចំណាយ': 'សរុបទាំងអស់', 'ចំនួនទឹកប្រាក់': totalAmount });

      const wsSummary = XLSX.utils.json_to_sheet(summaryData, { 
        header: ['ល.រ', 'ឈ្មោះចំណាយ', 'ចំនួនទឹកប្រាក់']
      });
      // Set column widths
      wsSummary['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "សរុបតាមប្រភេទ");

      // --- Worksheet 2: Details ( chi tiết) ---
      const detailsData = data.map((ex, index) => ({
        'ល.រ': index + 1,
        'កាលបរិច្ឆេទ': ex.date,
        'ឈ្មោះចំណាយ': ex.expenseName,
        'ចំនួនទឹកប្រាក់': parseFloat(ex.amount) || 0
      }));
      // Add Total Row
      detailsData.push({}); // Empty row
      detailsData.push({ 'ឈ្មោះចំណាយ': 'សរុបទាំងអស់', 'ចំនួនទឹកប្រាក់': totalAmount });

      const wsDetails = XLSX.utils.json_to_sheet(detailsData, { 
        header: ['ល.រ', 'កាលបរិច្ឆេទ', 'ឈ្មោះចំណាយ', 'ចំនួនទឹកប្រាក់']
      });
      wsDetails['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsDetails, "ទិន្នន័យលម្អិត");
      
      // --- Download File ---
      const fileName = `Expense_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("មានបញ្ហាក្នុងការបង្កើត Excel file។");
    }
    
    setLoading(false);
  };

  // --- 3b. Generate PDF ---
  const generatePdf = () => {
    setLoading(true);
    console.log("Starting PDF generation...");

    try {
      const data = getFilteredData();
      if (data.length === 0) {
        alert("មិនមានទិន្នន័យសម្រាប់ទាញយកပါ။");
        setLoading(false);
        return;
      }
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      if (!MySokhaApp.khmerFontBase64) {
        alert("Error: មិនអាចទាញយក Font ខ្មែរសម្រាប់ PDF បានទេ");
        setLoading(false);
        return;
      }
      
      doc.addFileToVFS('KantumruyPro-Regular.ttf', MySokhaApp.khmerFontBase64);
      doc.addFont('KantumruyPro-Regular.ttf', 'KantumruyPro', 'normal');
      
      // (*** កែសម្រួលនៅទីនេះ ១ ***)
      // ប្រាប់ jsPDF ឱ្យប្រើ Font ធម្មតា (Normal)
      doc.setFont('KantumruyPro', 'normal'); 

      // --- Title ---
      doc.setFontSize(18);
      doc.text(reportTitle, 105, 20, { align: 'center' }); 

      // --- Data for Table ---
      let totalAmount = 0;
      const tableBody = data.map((ex, index) => {
        const amount = parseFloat(ex.amount) || 0;
        totalAmount += amount;
        return [
          index + 1,
          ex.date,
          ex.expenseName,
          amount.toLocaleString('en-US') + ' ៛'
        ];
      });

      // --- Add Total Row ---
      const totalRow = [
        "", 
        "", 
        "សរុបទាំងអស់ (Total)",
        totalAmount.toLocaleString('en-US') + ' ៛'
      ];
      tableBody.push(totalRow);

      // --- Create Table using AutoTable ---
      doc.autoTable({
        startY: 30, 
        head: [['ល.រ', 'កាលបរិច្ឆេទ', 'ឈ្មោះចំណាយ', 'ចំនួនទឹកប្រាក់']],
        body: tableBody,
        theme: 'grid', 
        styles: {
          font: 'KantumruyPro',
          // (*** កែសម្រួលនៅទីនេះ ២ ***)
          fontStyle: 'normal', // ប្រើ Font ធម្មតា សម្រាប់តួតារាង (នេះជាមូលហេតុដែលតួអក្សរចេញ)
          halign: 'left'
        },
        headStyles: {
          fillColor: [22, 160, 133], 
          textColor: 255,
          // (*** កែសម្រួលនៅទីនេះ ៣ ***)
          fontStyle: 'normal', // ប្តូរពី 'bold' ទៅ 'normal'
        },
        foot: [totalRow],
        footStyles: {
          fillColor: [241, 196, 15], 
          textColor: 0,
          // (*** កែសម្រួលនៅទីនេះ ៤ ***)
          fontStyle: 'normal', // ប្តូរពី 'bold' ទៅ 'normal'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 }, 
          2: { cellWidth: 80 }, 
          3: { halign: 'right', cellWidth: 40 }
        }
      });
      
      // --- Download File ---
      const fileName = `Expense_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("មានបញ្ហាក្នុងការបង្កើត PDF file។");
    }

    setLoading(false);
  };
  
  // --- 4. Render UI ---
  const renderOptions = () => {
    switch(reportType) {
      case 'select_month':
        return (
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm"
          />
        );
      case 'date_range':
        return (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm"
            />
            <span className="text-center p-2 text-gray-500">ដល់</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm"
            />
          </div>
        );
      case 'current_month':
      default:
        return <p className="text-gray-600">នឹងទាញយកទិន្នន័យសម្រាប់ខែនេះ។</p>;
    }
  };

  return (
    <div className="mb-8 p-6 bg-white shadow-lg sm:shadow-md rounded-2xl border border-gray-200/50 transition-all duration-300 ease-in-out sm:hover:shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">ទាញយករបាយការណ៍</h2>
      
      <div className="space-y-4">
        {/* ជម្រើសប្រភេទ Report */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            ជ្រើសរើសប្រភេទរបាយការណ៍
          </label>
          <select 
            value={reportType} 
            onChange={handleTypeChange}
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm bg-white"
          >
            <option value="current_month">ទាញយកខែបច្ចុប្បន្ន</option>
            <option value="select_month">ជ្រើសរើសខែឆ្នាំ</option>
            <option value="date_range">ជ្រើសរើសចន្លោះថ្ងៃ</option>
          </select>
        </div>
        
        {/* ជម្រើសកាលបរិច្ឆេទ */}
        <div>
          {renderOptions()}
        </div>
        
        {/* ប៊ូតុងទាញយក */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={generateExcel}
            disabled={loading}
            className="flex-1 p-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'កំពុងដំណើរការ...' : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3D 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                ទាញយក Excel
              </>
            )}
          </button>
          <button
            onClick={generatePdf}
            disabled={loading}
            className="flex-1 p-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 disabled:bg-gray-400 transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'កំពុងដំណើរការ...' : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                ទាញយក PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
