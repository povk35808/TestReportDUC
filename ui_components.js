// ត្រូវប្រាកដថា React ត្រូវបានទាញយកជា Global រួចហើយ
const { useState, useEffect, useMemo } = React;

// --- Component សម្រាប់ Filter ---
function ExpenseFilter({ filterType, setFilterType, filterValue, setFilterValue }) {
  
  const today = new Date();
  const currentDay = today.toISOString().split('T')[0];
  const currentMonth = today.toISOString().slice(0, 7); 
  const currentYear = today.getFullYear().toString();

  useEffect(() => {
    if (!filterValue) {
      setFilterValue(currentDay);
    }
  }, []);
  
  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setFilterType(newType);
    switch (newType) {
      case 'daily':
        setFilterValue(currentDay);
        break;
      case 'monthly':
        setFilterValue(currentMonth);
        break;
      case 'yearly':
        setFilterValue(currentYear);
        break;
      case 'all':
        setFilterValue('all');
        break;
      default:
        setFilterValue(currentDay);
    }
  };

  const renderFilterInput = () => {
    switch (filterType) {
      case 'daily':
        return (
          <input
            type="date"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg shadow-sm w-full"
          />
        );
      case 'monthly':
        return (
          <input
            type="month"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg shadow-sm w-full"
          />
        );
      case 'yearly':
        return (
          <input
            type="number"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            placeholder="YYYY"
            min="2000"
            max="2100"
            step="1"
            className="p-3 border border-gray-300 rounded-lg shadow-sm w-full"
          />
        );
      case 'all':
        return <p className="p-3 text-gray-500 w-full text-center sm:text-left">បង្ហាញទិន្នន័យទាំងអស់</p>;
      default:
        return null;
    }
  };

  return (
    <div className="p-5 bg-gradient-to-b from-blue-50 to-white shadow-lg sm:shadow-md rounded-2xl border border-gray-200/50 mb-8 transition-all duration-300 ease-in-out sm:hover:shadow-lg">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="filterType" className="block text-sm font-semibold text-gray-700 mb-2">
            ជ្រើសរើសរបៀបបង្ហាញ
          </label>
          <select
            id="filterType"
            value={filterType}
            onChange={handleTypeChange}
            className="p-3 border border-gray-300 rounded-lg shadow-sm w-full bg-white"
          >
            <option value="daily">ប្រចាំថ្ងៃ</option>
            <option value="monthly">ប្រចាំខែ</option>
            <option value="yearly">ប្រចាំឆ្នាំ</option>
            <option value="all">សរុបទាំងអស់</option>
          </select>
        </div>
        
        <div className="flex-1">
          <label htmlFor="filterValue" className="block text-sm font-semibold text-gray-700 mb-2">
            ជ្រើសរើស
          </label>
          {renderFilterInput()}
        </div>
      </div>
    </div>
  );
}

// --- Component សម្រាប់ Pagination Controls ---
function PaginationControls({ currentPage, totalPages, setCurrentPage }) {
  if (totalPages <= 1) return null; 

  // (UI ថ្មី) Class សម្រាប់ប៊ូតុង Mobile
  const mobileButtonClass = "sm:hidden flex items-center justify-center h-10 w-10 bg-white text-blue-600 rounded-full shadow-md hover:bg-gray-100 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all active:scale-90";

  return (
    <div className="mt-6 flex justify-between items-center">
      
      {/* --- Previous Button (Desktop) --- */}
      <button
        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        ទំព័រមុន
      </button>

      {/* --- (UI ថ្មី) Previous Button (Mobile) --- */}
      <button
        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        className={mobileButtonClass}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      {/* --- Page Indicator (Mobile & Desktop) --- */}
      <span className="text-sm font-semibold text-gray-700">
        ទំព័រ {currentPage} នៃ {totalPages}
      </span>
      
      {/* --- Next Button (Desktop) --- */}
      <button
        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
      >
        ទំព័របន្ទាប់
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* --- (UI ថ្មី) Next Button (Mobile) --- */}
      <button
        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
        className={mobileButtonClass}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

    </div>
  );
}

// --- Component សម្រាប់ Navigation Bar ---
function Navbar({ currentPage, setCurrentPage }) {
  const navItems = [
    { id: 'dashboard', label: 'ផ្ទាំងសរុប' }, 
    { id: 'list', label: 'បញ្ជីចំណាយ' }, 
    { id: 'add', label: 'បន្ថែមចំណាយ' },
    { id: 'templates', label: 'គ្រប់គ្រងឈ្មោះ' }, 
  ];

  const getButtonClass = (pageId) => {
    const baseClass = "flex-1 p-3 sm:p-4 text-center font-semibold transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transform hover:scale-105";
    if (pageId === currentPage) {
      return `${baseClass} bg-blue-700 text-white scale-105 shadow-inner`; 
    }
    return `${baseClass} bg-white text-blue-600 hover:bg-gray-100`;
  };

  return (
    <nav className="mb-8 bg-white shadow-md rounded-xl overflow-hidden hidden sm:flex divide-x divide-gray-200">
      {navItems.map((item, index) => (
        <button
          key={item.id}
          onClick={() => setCurrentPage(item.id)}
          className={`${getButtonClass(item.id)} ${
            index === 0 ? 'rounded-l-xl' : ''
          } ${index === navItems.length - 1 ? 'rounded-r-xl' : ''}`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
    
// --- Component សម្រាប់ Mobile Bottom Navigation Bar ---
function MobileNavbar({ currentPage, setCurrentPage }) {
  const navItems = [
    { id: 'dashboard', label: 'សរុប', icon: ( 
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2a1 1 0 01-1-1v-4z" />
      </svg>
    )},
    { id: 'list', label: 'បញ្ជី', icon: ( 
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    )},
    { id: 'add', label: 'បន្ថែម', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'templates', label: 'គ្រប់គ្រង', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
  ];
  
  const getButtonClass = (pageId) => {
    const baseClass = "flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 ease-in-out focus:outline-none transform active:scale-95"; 
    if (pageId === currentPage) {
      return `${baseClass} text-blue-700 scale-110`; // Active
    }
    return `${baseClass} text-gray-500 hover:text-blue-600 hover:scale-110`; // Inactive
  };

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-5px_15px_rgba(0,0,0,0.08)] border-t border-gray-200/50 flex justify-around">
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => setCurrentPage(item.id)}
          className={getButtonClass(item.id)}
        >
          {item.icon}
          <span className="text-xs font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

// --- Component សម្រាប់ Modal បញ្ជាក់ការលុប ---
function ConfirmationModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full page-fade-in">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">បញ្ជាក់</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg shadow-sm hover:bg-gray-400 transition-all active:scale-95"
          >
            បោះបង់
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700 transition-all active:scale-95"
          >
            បញ្ជាក់លុប
          </button>
        </div>
      </div>
    </div>
  );
}
