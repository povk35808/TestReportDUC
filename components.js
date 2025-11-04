// ត្រូវប្រាកដថា React ត្រូវបានទាញយកជា Global រួចហើយ
const { useState, useEffect, useMemo } = React;

// --- Component សម្រាប់គ្រប់គ្រងឈ្មោះចំណាយ (ExpenseTemplateManager) ---
function ExpenseTemplateManager({ expenseTemplates, addExpenseTemplate, deleteExpenseTemplate }) {
  const [newTemplateName, setNewTemplateName] = useState('');

  const handleAddTemplate = (e) => {
    e.preventDefault();
    if (newTemplateName.trim()) {
      addExpenseTemplate(newTemplateName.trim());
      setNewTemplateName('');
    }
  };

  return (
    <div className="mb-8 p-6 bg-white shadow-lg sm:shadow-md rounded-2xl border border-gray-200/50 transition-all duration-300 ease-in-out sm:hover:shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">គ្រប់គ្រងឈ្មោះចំណាយ (Headers)</h2>
      <form onSubmit={handleAddTemplate} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={newTemplateName}
          onChange={(e) => setNewTemplateName(e.target.value)}
          placeholder="ឧទា៖ ថ្លៃបាយ, ថ្លៃសាំង, ថ្លៃផ្ទះ..."
          className="flex-grow p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          className="p-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-transform duration-200 ease-in-out hover:scale-105 active:scale-95"
        >
          បន្ថែមឈ្មោះចំណាយ
        </button>
      </form>
      
      <div className="flex flex-wrap gap-2">
        {expenseTemplates.length === 0 && <p className="text-gray-500">មិនទាន់មានឈ្មោះចំណាយ...</p>}
        {expenseTemplates.map((template) => (
          <span
            key={template.id}
            className="flex items-center bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm font-medium"
          >
            {template.name}
            <button
              onClick={() => deleteExpenseTemplate(template.id)}
              className="ml-2 text-red-500 hover:text-red-700 font-bold transition-transform duration-200 hover:scale-110"
            >
              &times;
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}


// --- (*** កែសម្រួល UI នៅទីនេះ ***) Component សម្រាប់ Batch Input Table ---
function BatchExpenseForm({ addExpense, expenseTemplates, loading, setLoading, expenses }) {
  const defaultDate = new Date().toISOString().split('T')[0];
  
  const recordedToday = useMemo(() => {
    if (!expenses) return new Set();
    return new Set(
      expenses
        .filter(ex => ex.date === defaultDate)
        .map(ex => ex.expenseName)
    );
  }, [expenses, defaultDate]);
  
  const defaultName = useMemo(() => {
    const firstUnrecorded = expenseTemplates.find(t => !recordedToday.has(t.name));
    return firstUnrecorded?.name || (expenseTemplates.length > 0 ? expenseTemplates[0].name : '');
  }, [expenseTemplates, recordedToday]);

  const createNewRow = () => ({
    id: crypto.randomUUID(), 
    expenseName: defaultName, 
    amount: '',
    date: defaultDate,
  });

  const DRAFT_KEY = `expense_drafts_${MySokhaApp.appId}`;

  const [rows, setRows] = useState(() => {
    try {
      const savedDrafts = localStorage.getItem(DRAFT_KEY);
      if (savedDrafts && JSON.parse(savedDrafts).length > 0) {
        return JSON.parse(savedDrafts);
      }
    } catch (e) {
      console.error("Failed to load drafts from localStorage:", e);
    }
    return [{
      id: crypto.randomUUID(),
      expenseName: '', 
      amount: '',
      date: defaultDate,
    }];
  });

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(rows));
    } catch (e) {
      console.error("Failed to save drafts to localStorage:", e);
    }
  }, [rows, DRAFT_KEY]); 

  useEffect(() => {
    if (expenseTemplates.length > 0 && defaultName) {
      setRows(prevRows => 
        prevRows.map(row => ({
          ...row,
          expenseName: row.expenseName || defaultName
        }))
      );
    }
  }, [expenseTemplates, defaultName]);

  const handleUpdateRow = (id, field, value) => {
    setRows(prevRows =>
      prevRows.map(row =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };
  
  const handleAmountChange = (id, value) => {
    const cleanValue = MySokhaApp.parseAmount(value); 
    
    if (isNaN(cleanValue) && cleanValue !== '') {
      return; 
    }
    
    handleUpdateRow(id, 'amount', cleanValue);
  };

  const handleAddRow = () => {
    setRows([...rows, createNewRow()]);
  };

  const handleDeleteRow = (id) => {
    setRows(prevRows => prevRows.filter(row => row.id !== id));
  };

  const handleSubmitAll = async () => {
    setLoading(true);

    const today = new Date().toISOString().split('T')[0];
    const recordedForToday = new Set(
      expenses
        .filter(ex => ex.date === today)
        .map(ex => ex.expenseName)
    );

    const validRows = rows.filter(row => row.expenseName && row.amount > 0 && row.date);
    const rowsToSave = [];
    const rowsToBlock = [];

    validRows.forEach(row => {
      if (row.date === today && recordedForToday.has(row.expenseName)) {
        rowsToBlock.push(row);
      } else {
        rowsToSave.push(row);
      }
    });

    if (rowsToBlock.length > 0) {
      console.warn("Skipping rows that are already recorded for today:", rowsToBlock);
    }
    
    try {
      await Promise.all(
        rowsToSave.map(row => {
          const { id, ...expenseData } = row; 
          return addExpense({
            ...expenseData,
            amount: parseFloat(expenseData.amount)
          });
        })
      );
      
      console.log(`Successfully added ${rowsToSave.length} expenses.`);
      
      const remainingDrafts = rows.filter(row => rowsToBlock.find(blocked => blocked.id === row.id));
      
      if (remainingDrafts.length > 0) {
        setRows(remainingDrafts); 
      } else {
        setRows([createNewRow()]); 
      }
      
    } catch (error) {
      console.error("Error saving expenses: ", error);
    }
    setLoading(false);
  };

  return (
    // មិនបានកែប្រែផ្នែកខាងក្រៅនេះ
    <div className="mb-8 p-4 sm:p-6 bg-white shadow-lg sm:shadow-md rounded-2xl border border-gray-200/50 transition-all duration-300 ease-in-out sm:hover:shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">តារាងបញ្ចូលចំណាយថ្មី</h2>
      
      <div className="">
        {/* --- DESKTOP HEADERS (មិនបានកែប្រែ) --- */}
        <div className="hidden sm:table w-full">
          <div className="sm:table-header-group">
            <div className="sm:table-row border-b-2 border-gray-300 bg-gray-100">
              <div className="sm:table-cell p-3 font-semibold text-gray-700 text-left">ឈ្មោះចំណាយ</div>
              <div className="sm:table-cell p-3 font-semibold text-gray-700 text-left">ចំនួនទឹកប្រាក់ (៛)</div>
              <div className="sm:table-cell p-3 font-semibold text-gray-700 text-left">កាលបរិច្ឆេទ</div>
              <div className="sm:table-cell p-3 font-semibold text-gray-700 text-center">លុប</div>
            </div>
          </div>
        </div>

        {/* --- BODY (កែប្រែ UI សម្រាប់ Mobile) --- */}
        <div className="sm:table w-full sm:border-collapse">
          <div className="sm:table-row-group">
            {rows.map(row => (
              <div key={row.id} className="block sm:table-row bg-white sm:bg-transparent shadow-lg sm:shadow-none rounded-2xl sm:rounded-none overflow-hidden mb-4 sm:mb-0 border sm:border-0 border-gray-200/50 sm:border-b">
                
                {/* --- (*** UI ថ្មី សម្រាប់ MOBILE ***) --- 
                បានប្តូរពី bg-gray-100 ទៅជាការរចនាបែប Label + Input Group 
                */}
                <div className="block sm:hidden p-4 space-y-5"> 
                    
                    {/* 1. ឈ្មោះចំណាយ (Dropdown) */}
                    <div>
                      <label 
                        htmlFor={`name-${row.id}`} 
                        className="block text-sm font-semibold text-gray-600 mb-1.5"
                      >
                        ឈ្មោះចំណាយ
                      </label>
                      <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5">
                        <div className="pl-4 pr-3 text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                        <select
                          id={`name-${row.id}`}
                          value={row.expenseName}
                          onChange={(e) => handleUpdateRow(row.id, 'expenseName', e.target.value)}
                          className="w-full bg-white border-0 focus:ring-0 text-gray-800 font-semibold p-3.5"
                        >
                          {expenseTemplates.length === 0 && <option value="" disabled>សូមបន្ថែមឈ្មោះចំណាយ...</option>}
                          {expenseTemplates.map((template) => {
                            const isRecorded = row.date === defaultDate && recordedToday.has(template.name);
                            return (
                              <option 
                                key={template.id} 
                                value={template.name}
                                disabled={isRecorded}
                                className={isRecorded ? 'text-gray-400' : ''}
                              >
                                {template.name} {isRecorded ? '(កត់ត្រារួចហើយ)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                    
                    {/* 2. ចំនួនទឹកប្រាក់ */}
                    <div>
                      <label 
                        htmlFor={`amount-${row.id}`}
                        className="block text-sm font-semibold text-gray-600 mb-1.5"
                      >
                        ចំនួនទឹកប្រាក់
                      </label>
                      <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5">
                        <div className="pl-4 pr-3 text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <input
                          id={`amount-${row.id}`}
                          type="tel" 
                          inputMode="decimal"
                          value={MySokhaApp.formatDisplayAmount(row.amount)} 
                          onChange={(e) => handleAmountChange(row.id, e.target.value)} 
                          placeholder="0"
                          className="w-full bg-white border-0 focus:ring-0 text-gray-800 font-semibold p-3.5"
                        />
                        <span className="pr-4 font-semibold text-gray-500">៛</span>
                      </div>
                    </div>

                    {/* 3. កាលបរិច្ឆេទ */}
                    <div>
                      <label 
                        htmlFor={`date-${row.id}`}
                        className="block text-sm font-semibold text-gray-600 mb-1.5"
                      >
                        កាលបរិច្ឆេទ
                      </label>
                      <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5">
                         <div className="pl-4 pr-3 text-gray-400">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                           </svg>
                         </div>
                        <input
                          id={`date-${row.id}`}
                          type="date"
                          value={row.date}
                          onChange={(e) => handleUpdateRow(row.id, 'date', e.target.value)}
                          className="w-full bg-white border-0 focus:ring-0 text-gray-800 font-semibold p-3.5"
                        />
                      </div>
                    </div>
                </div>
                {/* --- (*** ចប់ UI ថ្មី សម្រាប់ MOBILE ***) --- */}


                {/* --- DESKTOP TABLE VIEW (មិនបានកែប្រែ) --- */}
                <div className="p-2 sm:p-2 hidden sm:table-cell sm:border-b">
                    <select
                      value={row.expenseName}
                      onChange={(e) => handleUpdateRow(row.id, 'expenseName', e.target.value)}
                      className="w-full mt-1 sm:mt-0 p-2 border border-gray-300 rounded-lg shadow-sm bg-white"
                    >
                      {expenseTemplates.length === 0 && <option value="" disabled>សូមបន្ថែមឈ្មោះចំណាយ...</option>}
                      {expenseTemplates.map((template) => {
                        const isRecorded = row.date === defaultDate && recordedToday.has(template.name);
                        return (
                          <option 
                            key={template.id} 
                            value={template.name}
                            disabled={isRecorded}
                            className={isRecorded ? 'text-gray-400' : ''}
                          >
                            {template.name} {isRecorded ? '(កត់ត្រារួចហើយ)' : ''}
                          </option>
                        );
                      })}
                    </select>
                </div>
                
                <div className="p-2 sm:p-2 hidden sm:table-cell sm:border-b">
                    <input
                      type="tel" 
                      inputMode="decimal"
                      value={MySokhaApp.formatDisplayAmount(row.amount)} 
                      onChange={(e) => handleAmountChange(row.id, e.target.value)} 
                      placeholder="0"
                      className="w-full mt-1 sm:mt-0 p-2 border border-gray-300 rounded-lg shadow-sm"
                    />
                </div>

                <div className="p-2 sm:p-2 hidden sm:table-cell sm:border-b">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => handleUpdateRow(row.id, 'date', e.target.value)}
                      className="w-full mt-1 sm:mt-0 p-2 border border-gray-300 rounded-lg shadow-sm"
                    />
                </div>
                
                <div className="p-2 sm:p-2 hidden sm:table-cell text-right sm:text-center sm:border-b">
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="px-3 py-1.5 sm:py-1 bg-red-500 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-red-600 w-full sm:w-auto transition-transform duration-200 hover:scale-105 active:scale-95"
                    >
                      លុបជួរនេះ
                    </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* --- ប៊ូតុង (មិនបានកែប្រែ) --- */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
        <button
          onClick={handleAddRow}
          className="w-full sm:w-auto p-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 hidden sm:flex transition-transform duration-200 ease-in-out hover:scale-105 active:scale-95"
        >
          + បន្ថែមជួរថ្មី
        </button>
        
        <button
          onClick={handleSubmitAll}
          disabled={loading || rows.length === 0 || expenseTemplates.length === 0}
          className={`w-full sm:w-auto p-4 sm:p-3 text-white font-semibold rounded-lg shadow-lg sm:shadow-md transition-all duration-300 ease-in-out active:scale-95 ${
            (loading || expenseTemplates.length === 0)
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 sm:hover:scale-105'
          }`}
        >
          {loading ? 'កំពុងរក្សាទុក...' : (expenseTemplates.length === 0 ? 'ត្រូវបន្ថែមឈ្មោះចំណាយសិន' : (
            <>
              <span className="hidden sm:inline">រក្សាទុកទាំងអស់</span>
              <span className="inline sm:hidden">រក្សាទុក</span>
            </>
          ))}
        </button>
      </div>
    </div>
  );
}
    
    
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

// --- Component សម្រាប់កែសម្រួលទិន្នន័យ (Desktop: Table Row) ---
function EditableExpenseRow({ expense, requestDeleteExpense, updateExpense, expenseTemplates }) { 
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...expense });

  const handleAmountChange = (value) => {
    const cleanValue = MySokhaApp.parseAmount(value); 
    if (isNaN(cleanValue) && cleanValue !== '') return;
    setEditData(prev => ({ ...prev, amount: cleanValue }));
  };

  const handleSave = async () => {
    const dataToUpdate = {
      expenseName: editData.expenseName,
      date: editData.date,
      amount: parseFloat(editData.amount)
    };
    await updateExpense(expense.id, dataToUpdate);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({ ...expense }); 
  };

  const formattedDate = new Date(expense.date).toLocaleDateString('km-KH', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  });
  
  const amountValue = typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount);
  const formattedAmount = isNaN(amountValue) ? 'N/A' : amountValue.toLocaleString('km-KH');

  if (isEditing) {
    return (
      <tr className="border-b border-gray-200 bg-blue-50">
        <td className="p-3 py-2">
          <select
            value={editData.expenseName}
            onChange={(e) => setEditData(prev => ({ ...prev, expenseName: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-lg shadow-sm bg-white"
          >
            {expenseTemplates.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </td>
        <td className="p-3 py-2">
          <input
            type="date"
            value={editData.date}
            onChange={(e) => setEditData(prev => ({ ...prev, date: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-lg shadow-sm"
          />
        </td>
        <td className="p-3 py-2">
          <input
            type="tel"
            inputMode="decimal"
            value={MySokhaApp.formatDisplayAmount(editData.amount)} 
            onChange={(e) => handleAmountChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg shadow-sm"
          />
        </td>
        <td className="p-3 py-2 text-center">
          <div className="flex justify-center gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-green-700 transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              រក្សាទុក
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-500 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-gray-600 transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              បោះបង់
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="p-3 py-4 text-gray-900">{expense.expenseName}</td>
      <td className="p-3 py-4 text-gray-600">{formattedDate}</td>
      <td className="p-3 py-4 text-red-600 font-bold">{formattedAmount} ៛</td>
      <td className="p-3 py-4 text-center">
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 bg-yellow-500 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-yellow-600 transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            កែសម្រួល
          </button>
          <button
            onClick={() => requestDeleteExpense(expense.id)} 
            className="px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-red-600 transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            លុប
          </button>
        </div>
      </td>
    </tr>
  );
}
    
// --- Component សម្រាប់កែសម្រួលទិន្នន័យ (Mobile: Card) ---
function EditableExpenseCard({ expense, requestDeleteExpense, updateExpense, expenseTemplates }) { 
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...expense });

  const handleAmountChange = (value) => {
    const cleanValue = MySokhaApp.parseAmount(value); 
    if (isNaN(cleanValue) && cleanValue !== '') return;
    setEditData(prev => ({ ...prev, amount: cleanValue }));
  };

  const handleSave = async () => {
    const dataToUpdate = {
      expenseName: editData.expenseName,
      date: editData.date,
      amount: parseFloat(editData.amount)
    };
    await updateExpense(expense.id, dataToUpdate);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    setEditData({ ...expense }); 
  };

  const formattedDate = new Date(expense.date).toLocaleDateString('km-KH', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  });
  
  const amountValue = typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount);
  const formattedAmount = isNaN(amountValue) ? 'N/A' : amountValue.toLocaleString('km-KH');

  return (
    <div className={`relative p-5 bg-white shadow-lg rounded-2xl mb-3 border border-gray-200/50 transition-all duration-300 ease-in-out ${isEditing ? 'border-2 border-blue-500' : ''}`}>
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">ឈ្មោះចំណាយ</label>
            <select
              value={editData.expenseName}
              onChange={(e) => setEditData(prev => ({ ...prev, expenseName: e.target.value }))}
              className="w-full mt-1 p-2 border border-gray-300 rounded-lg shadow-sm bg-white"
            >
              {expenseTemplates.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">ចំនួនទឹកប្រាក់ (៛)</label>
            <input
              type="tel"
              inputMode="decimal"
              value={MySokhaApp.formatDisplayAmount(editData.amount)} 
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-300 rounded-lg shadow-sm"
            />
          </div>
          
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">កាលបរិច្ឆេទ</label>
            <input
              type="date"
              value={editData.date}
              onChange={(e) => setEditData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full mt-1 p-2 border border-gray-300 rounded-lg shadow-sm"
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-lg shadow-sm hover:bg-gray-400 transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              បោះបង់
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-green-700 transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              រក្សាទុក
            </button>
          </div>
        </div>
      ) : (
        <div className="pr-16"> 
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center justify-center h-9 w-9 bg-gray-200 text-gray-800 rounded-full shadow-sm hover:bg-gray-300 transition-all duration-200 active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => requestDeleteExpense(expense.id)}
              className="flex items-center justify-center h-9 w-9 bg-red-100 text-red-700 rounded-full shadow-sm hover:bg-red-200 transition-all duration-200 active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          
          <span className="text-xl font-bold text-gray-800">{expense.expenseName}</span>
          <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-rose-700 mt-1">{formattedAmount} ៛</p>
          <p className="text-sm text-gray-500 mt-2">{formattedDate}</p>
        </div>
      )}
    </div>
  );
}
    
    
// --- Component សម្រាប់ Pagination Controls ---
function PaginationControls({ currentPage, totalPages, setCurrentPage }) {
  if (totalPages <= 1) return null; 

  return (
    <div className="mt-6 flex justify-between items-center">
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
      
      <span className="text-sm font-semibold text-gray-700">
        ទំព័រ {currentPage} នៃ {totalPages}
      </span>
      
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
    </div>
  );
}


// --- Component សម្រាប់បង្ហាញបញ្ជីចំណាយ ---
function ExpenseList({ expenses, requestDeleteExpense, updateExpense, expenseTemplates, loading, filterType, filterValue }) { 
  
  const [listPage, setListPage] = useState(1);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const ITEMS_PER_PAGE = 10;
  
  const filteredExpenses = useMemo(() => {
    if (loading || !filterValue) return [];
    
    return expenses.filter(expense => {
      switch (filterType) {
        case 'daily':
          return expense.date === filterValue;
        case 'monthly':
          const expenseMonth = expense.date.slice(0, 7); 
          return expenseMonth === filterValue;
        case 'yearly':
          const expenseYear = expense.date.slice(0, 4); 
          return expenseYear === filterValue;
        case 'all':
          return true;
        default:
          return false;
      }
    });
  }, [expenses, filterType, filterValue, loading]);
  
  const sortedExpenses = useMemo(() => {
    return filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredExpenses]);

  const totalPages = Math.ceil(sortedExpenses.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (listPage > totalPages) {
      setListPage(1);
    }
  }, [listPage, totalPages]);
  
  useEffect(() => {
    setListPage(1);
  }, [filterType, filterValue]);

  const paginatedExpenses = useMemo(() => {
    const startIndex = (listPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedExpenses.slice(startIndex, endIndex);
  }, [sortedExpenses, listPage]);

  const handleTouchStart = (e) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(e.targetTouches[0].clientX); 
  };
  
  const handleTouchMove = (e) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (touchStartX - touchEndX > 75) { // Swipe Left
      setListPage(prev => {
        const newPage = Math.min(prev + 1, totalPages || 1);
        return newPage;
      });
    }
    
    if (touchEndX - touchStartX > 75) { // Swipe Right
      setListPage(prev => {
        const newPage = Math.max(prev - 1, 1);
        return newPage;
      });
    }
  };
  
  return (
    <div className="p-0 sm:p-6 sm:bg-white sm:shadow-md sm:rounded-2xl sm:border sm:border-gray-200/50 transition-all duration-300 sm:hover:shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800 pb-4 sm:p-0">បញ្ជីចំណាយ</h2>
      {loading ? (
        <p className="text-center text-gray-500">កំពុងទាញទិន្ន័យ...</p>
      ) : sortedExpenses.length === 0 ? ( 
        <p className="text-center text-gray-500">មិនមានទិន្នន័យសម្រាប់ជម្រើសនេះទេ។</p>
      ) : (
        <>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[600px] table-auto text-left">
              <thead className="border-b-2 border-gray-300 bg-gray-100">
                <tr>
                  <th className="p-3 font-semibold text-gray-700">ឈ្មោះចំណាយ</th>
                  <th className="p-3 font-semibold text-gray-700">កាលបរិច្ឆេទ</th>
                  <th className="p-3 font-semibold text-gray-700">ចំនួនទឹកប្រាក់</th>
                  <th className="p-3 font-semibold text-gray-700 text-center">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody>
                {paginatedExpenses.map((expense) => ( 
                  <EditableExpenseRow
                    key={expense.id}
                    expense={expense}
                    requestDeleteExpense={requestDeleteExpense} 
                    updateExpense={updateExpense}
                    expenseTemplates={expenseTemplates}
                  />
                ))}
              </tbody>
            </table>
          </div>
          
          <div 
            className="block sm:hidden"
            onTouchStart={handleTouchStart} 
            onTouchMove={handleTouchMove}   
            onTouchEnd={handleTouchEnd}     
          >
            {paginatedExpenses.map((expense) => ( 
              <EditableExpenseCard
                key={expense.id}
                expense={expense}
                requestDeleteExpense={requestDeleteExpense} 
                updateExpense={updateExpense}
                expenseTemplates={expenseTemplates}
              />
            ))}
          </div>
          
          <PaginationControls 
            currentPage={listPage}
            totalPages={totalPages}
            setCurrentPage={setListPage}
          />
        </>
      )}
    </div>
  );
}

// --- Component សម្រាប់បង្ហាញការសរុប ---
function ExpenseSummary({ expenses, filterType, filterValue, loading }) {
  
  const filteredExpenses = useMemo(() => {
    if (loading || !filterValue) return [];
    
    return expenses.filter(expense => {
      switch (filterType) {
        case 'daily':
          return expense.date === filterValue;
        case 'monthly':
          const expenseMonth = expense.date.slice(0, 7); 
          return expenseMonth === filterValue;
        case 'yearly':
          const expenseYear = expense.date.slice(0, 4); 
          return expenseYear === filterValue;
        case 'all':
          return true;
        default:
          return false;
      }
    });
  }, [expenses, filterType, filterValue, loading]);

  const totalExpense = useMemo(() => {
    return filteredExpenses.reduce((total, expense) => {
       const amountValue = typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount);
       return total + (isNaN(amountValue) ? 0 : amountValue);
    }, 0);
  }, [filteredExpenses]);
  
  const summaryTitle = useMemo(() => {
    if (!filterValue) return "សរុបចំណាយ";
    
    try {
      switch (filterType) {
        case 'daily':
          const date = new Date(filterValue);
          const formattedDate = date.toLocaleDateString('km-KH', { 
            year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' 
          });
          return `សរុបចំណាយថ្ងៃទី ${formattedDate}`;
        case 'monthly':
          const [year, month] = filterValue.split('-');
          const monthDate = new Date(year, month - 1);
          const formattedMonth = monthDate.toLocaleDateString('km-KH', { 
            year: 'numeric', month: 'long', timeZone: 'UTC' 
          });
          return `សរុបចំណាយខែ ${formattedMonth}`;
        case 'yearly':
          return `សរុបចំណាយឆ្នាំ ${filterValue}`;
        case 'all':
          return "សរុបចំណាយទាំងអស់";
        default:
          return "សរុបចំណាយ";
      }
    } catch (e) {
      console.error("Date formatting error:", e);
      return "សរុបចំណាយ";
    }
  }, [filterType, filterValue]);

  return (
    <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-500/30 rounded-2xl mb-8 transition-all duration-300 ease-in-out sm:hover:shadow-2xl">
      <h2 className="text-lg font-medium text-blue-100">{summaryTitle}</h2>
      <p className="text-5xl font-extrabold text-white mt-2">
        {totalExpense.toLocaleString('km-KH')} ៛
      </p>
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
