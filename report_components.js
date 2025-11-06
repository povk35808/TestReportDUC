// ត្រូវប្រាកដថា React ត្រូវបានទាញយកជា Global រួចហើយ
const { useState, useEffect, useMemo } = React;

// (*** វិធីសាស្រ្តថ្មី ***)
// --- 1. Custom Hook សម្រាប់បង្កើត Excel ---
// Hook នេះនឹងផ្ទុក Logic ទាំងអស់សម្រាប់ការបង្កើត Excel
function useExcelGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);

  // Function នេះ ទទួល data និង title ពី Component
  const generateExcel = (data, reportTitle) => {
    setIsGenerating(true);
    console.log("Starting Excel generation (React Hook)...");
    
    try {
      if (data.length === 0) {
        alert("មិនមានទិន្នន័យសម្រាប់ទាញយកပါ။");
        setIsGenerating(false);
        return;
      }

      const { XLSX } = window;
      const wb = XLSX.utils.book_new();
      const currentReportTitle = reportTitle; 

      // --- Worksheet 1: Summary ---
      const summary = {};
      let totalAmount = 0;
      data.forEach(ex => {
        const amount = parseFloat(ex.amount) || 0;
        summary[ex.expenseName] = (summary[ex.expenseName] || 0) + amount;
        totalAmount += amount;
      });
      
      let wsSummaryData = [];
      wsSummaryData.push([currentReportTitle, null, null]); 
      wsSummaryData.push([]); 
      wsSummaryData.push(['ល.រ', 'ឈ្មោះចំណាយ', 'ចំនួនទឹកប្រាក់']);
      Object.keys(summary).sort().forEach((key, index) => {
        wsSummaryData.push([index + 1, key, summary[key]]);
      });
      wsSummaryData.push([]); 
      wsSummaryData.push([null, 'សរុបទាំងអស់ (Total)', totalAmount]);
      const wsSummary = XLSX.utils.aoa_to_sheet(wsSummaryData);
      wsSummary['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 20 }];
      wsSummary['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }]; 
      XLSX.utils.book_append_sheet(wb, wsSummary, "សរុបតាមប្រភេទ");

      // --- Worksheet 2: Details (Pivot) ---
      const names = [...new Set(data.map(ex => ex.expenseName))].sort();
      const dates = [...new Set(data.map(ex => ex.date))].sort();
      const dataMap = new Map(); 
      data.forEach(ex => {
        const key = `${ex.expenseName}_${ex.date}`;
        const amount = parseFloat(ex.amount) || 0;
        dataMap.set(key, (dataMap.get(key) || 0) + amount); 
      });
      let wsDetailsData = [];
      let colWidths = [{ wch: 30 }]; 
      wsDetailsData.push([currentReportTitle]); 
      wsDetailsData.push([]); 
      let headerRow = ['ឈ្មោះចំណាយ'];
      dates.forEach(date => {
        headerRow.push(date);
        colWidths.push({ wch: 15 }); 
      });
      headerRow.push('សរុប');
      colWidths.push({ wch: 20 }); 
      wsDetailsData.push(headerRow);
      let colTotals = new Array(dates.length).fill(0);
      let grandTotal = 0;
      names.forEach(name => {
        let dataRow = [name];
        let rowTotal = 0;
        dates.forEach((date, index) => {
          const amount = dataMap.get(`${name}_${date}`) || 0;
          dataRow.push(amount === 0 ? null : amount); 
          rowTotal += amount;
          colTotals[index] += amount;
        });
        dataRow.push(rowTotal); 
        wsDetailsData.push(dataRow);
        grandTotal += rowTotal;
      });
      wsDetailsData.push([]); 
      let footerRow = ['សរុប'];
      colTotals.forEach(total => footerRow.push(total));
      footerRow.push(grandTotal);
      wsDetailsData.push(footerRow);
      const wsDetails = XLSX.utils.aoa_to_sheet(wsDetailsData);
      wsDetails['!cols'] = colWidths;
      wsDetails['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: dates.length + 1 } }]; 
      XLSX.utils.book_append_sheet(wb, wsDetails, "ទិន្នន័យលម្អិត (Pivot)");
      
      // --- Download File ---
      const fileName = `Expense_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("មានបញ្ហាក្នុងការបង្កើត Excel file។");
    }
    
    setIsGenerating(false);
  };

  // ត្រឡប់ state និង function ទៅឱ្យ Component ប្រើ
  return { isGenerating, generateExcel };
}

// (*** វិធីសាស្រ្តថ្មី ***)
// --- 2. Custom Hook សម្រាប់បង្កើត PDF ---
// Hook នេះនឹងផ្ទុក Logic ទាំងអស់សម្រាប់ការបង្កើត PDF
function usePdfGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = (data, reportTitle) => {
    setIsGenerating(true);
    console.log("Starting PDF generation (React Hook)...");

    try {
      if (data.length === 0) {
        alert("មិនមានទិន្នន័យសម្រាប់ទាញយកပါ။");
        setIsGenerating(false);
        return;
      }
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      if (!MySokhaApp.khmerFontBase64 || MySokhaApp.khmerFontBase64.trim() === "") {
        alert("Error: មិនអាចទាញយក Font ខ្មែរ (Base64) បានទេ។\n\nសូម Hard Refresh (Ctrl+Shift+R)។");
        setIsGenerating(false);
        return;
      }
      
      doc.addFileToVFS('KantumruyPro-Regular.ttf', MySokhaApp.khmerFontBase64);
      doc.addFont('KantumruyPro-Regular.ttf', 'KantumruyPro', 'normal');
      doc.setFont('KantumruyPro', 'normal'); 
      doc.setFontSize(18);
      doc.text(reportTitle, 105, 20, { align: 'center' }); 

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

      const totalRow = ["", "", "សរុបទាំងអស់ (Total)", totalAmount.toLocaleString('en-US') + ' ៛'];
      tableBody.push(totalRow);

      doc.autoTable({
        startY: 30, 
        head: [['ល.រ', 'កាលបរិច្ឆេទ', 'ឈ្មោះចំណាយ', 'ចំនួនទឹកប្រាក់']],
        body: tableBody,
        theme: 'grid', 
        styles: { font: 'KantumruyPro', fontStyle: 'normal', halign: 'left' },
        headStyles: { fillColor: [22, 160, 133], textColor: 255, fontStyle: 'normal' },
        foot: [totalRow], 
        footStyles: { fillColor: [241, 196, 15], textColor: 0, fontStyle: 'normal' },
        columnStyles: {
  	  0: { halign: 'center', cellWidth: 10 }, 
  	  2: { cellWidth: 80 }, 
  	  3: { halign: 'right', cellWidth: 40 }
  	}
  	  });
  	  
  	  const fileName = `Expense_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  	  doc.save(fileName);

    } catch (error) {
  	  console.error("Error generating PDF:", error);
  	  alert("មានបញ្ហាក្នុងការបង្កើត PDF file។");
    }

  	setIsGenerating(false);
  };
  
  return { isGenerating, generatePdf };
}


// ----------------------------------------------------
// (កែសម្រួលនៅទីនេះ) Component សម្រាប់ទំព័ររបាយការណ៍
// ----------------------------------------------------
function ReportDownloader({ expenses }) {
  const [reportType, setReportType] = useState('current_month');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportTitle, setReportTitle] = useState(''); 

  // --- 1. UI Handlers ---
  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setReportType(newType);
  };

  const updateReportTitle = () => {
    const now = new Date();
    const kmLocale = 'km-KH';
    const monthYearOptions = { year: 'numeric', month: 'long', timeZone: 'UTC' };
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };

    switch(reportType) { 
      case 'current_month':
        setReportTitle(`របាយការណ៍ចំណាយ ${now.toLocaleDateString(kmLocale, monthYearOptions)}`);
        break;
      case 'select_month':
        const monthDate = new Date(month); 
        if (!isNaN(monthDate.getTime())) {
          setReportTitle(`របាយការណ៍ចំណាយ ${monthDate.toLocaleDateString(kmLocale, monthYearOptions)}`);
        }
        break;
      case 'date_range':
        const d1 = new Date(startDate); 
        const d2 = new Date(endDate); 
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
          setReportTitle(`របាយការណ៍ពី ${d1.toLocaleDateString(kmLocale, dateOptions)} ដល់ ${d2.toLocaleDateString(kmLocale, dateOptions)}`);
        }
        break;
      default:
        setReportTitle('របាយការណ៍ចំណាយ');
    }
  };
  
  useEffect(() => {
    updateReportTitle();
  }, [month, startDate, endDate, reportType]); 
  

  // --- 2. (*** កែសម្រួលនៅទីនេះ ***) Data Filtering Logic (ប្រើ useMemo) ---
  const filteredData = useMemo(() => {
    console.log("Filtering data...");
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
    // ត្រឡប់ទិន្នន័យដែលបានតម្រៀប
    return filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [expenses, reportType, month, startDate, endDate]); // គណនាឡើងវិញ តែពេលទិន្នន័យនេះផ្លាស់ប្តូរ
  
  
  // --- 3. (*** កែសម្រួលនៅទីនេះ ***) ហៅ Custom Hooks ---
  // ប្រើ Hook ជំនួស Function ចាស់
  const { isGenerating: isExcelLoading, generateExcel } = useExcelGenerator();
  const { isGenerating: isPdfLoading, generatePdf } = usePdfGenerator();
  
  // loading state ឥឡូវត្រូវបានគ្រប់គ្រងដោយ Hook ទាំងពីរ
  const loading = isExcelLoading || isPdfLoading; 

  // បង្កើត Function សម្រាប់ប៊ូតុងចុច
  const handleExcelDownload = () => {
    // បញ្ជូនទិន្នន័យដែលបាន filter និង ចំណងជើង ទៅឱ្យ Hook
    generateExcel(filteredData, reportTitle);
  };

  const handlePdfDownload = () => {
    // បញ្ជូនទិន្នន័យដែលបាន filter និង ចំណងជើង ទៅឱ្យ Hook
    generatePdf(filteredData, reportTitle);
  };

  // --- 4. Render UI (នៅដដែល) ---
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
  	    
        {/* បង្ហាញចំណងជើងដែលនឹងត្រូវ Export */}
        <div className="pt-2">
          <p className="text-sm font-semibold text-gray-700">ចំណងជើងរបាយការណ៍៖</p>
          <p className="text-md text-blue-600 font-bold">{reportTitle || '...'}</p>
        </div>

  	    {/* ប៊ូតុងទាញយក */}
  	    <div className="pt-4 flex flex-col sm:flex-row gap-3">
  	      <button
            // (*** កែសម្រួលនៅទីនេះ ***)
  		    onClick={handleExcelDownload} 
  		    disabled={loading} // ប្រើ loading state ពី Hook
  		    className="flex-1 p-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 transition-all flex items-center justify-center gap-2"
  	      >
  		{loading ? 'កំពុងដំណើរការ...' : (
  		  <>
  		    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
  		      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  		    </svg>
  		    ទាញយក Excel
  		  </>
  		)}
  	      </button>
  	      <button
            // (*** កែសម្រួលនៅទីនេះ ***)
  		    onClick={handlePdfDownload}
  		    disabled={loading} // ប្រើ loading state ពី Hook
  		    className="flex-1 p-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 disabled:bg-gray-400 transition-all flex items-center justify-center gap-2"
  	      >
  		{loading ? 'កំពុងដំណើរការ...' : (
  		  <>
  		    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
  		      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
â 		    </svg>
  		    ទាញយក PDF
  		  </>
  		)}
  	      </button>
  	    </div>
  	  </div>
  	</div>
  );
}
